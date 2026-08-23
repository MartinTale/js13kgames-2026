/*
    Rainbow Pop - js13k 2026
    Click the unicorn horn to launch bubbles/candy/gems, click them to pop
    for shards, spend shards on upgrades.
*/

'use strict';

const SAVE_KEY = 'js13k26_rainbowpop_save';
const TILE_SIZE = 32, TILE_PAD = 1;
const TILE_HORN = 0, TILE_HORN_FIRE = 1, TILE_BUBBLE = 2, TILE_CANDY = 3, TILE_GEM = 4;
const ITEM_TYPES = [
    { tile: TILE_BUBBLE, hpMul: 1,   valueMul: 1,   weight: 5 },
    { tile: TILE_CANDY,  hpMul: 1.5, valueMul: 2,   weight: 3 },
    { tile: TILE_GEM,    hpMul: 2.5, valueMul: 5,   weight: 1 },
];
const HUE_STEP = .09;
const HORN_POS = vec2(0, -6.5);

const sound_pop = new Sound([1, .1, 300, , .04, .12, , 1.6, , , 200, .04]);
const sound_buy = new Sound([1.1, , 500, , .05, .08, , 1.4, , , 400, .04]);
const sound_fire = new Sound([1, , 200, , .03, .08, , 1.2, , , -100, .03]);

let items, shards, particleEmitter;
let clickPower, splashRadius, autoFireRate, autoPopRate, spawnRate;
let upgrades, saveTimer, autoFireTimer, autoPopTimer, spawnTimer, hornFireFlash;

function itemTile(t) { return tile(t, TILE_SIZE, 0, TILE_PAD); }

function defaultState()
{
    return {
        shards: 0,
        clickLevel: 0,
        splashLevel: 0,
        autoFireLevel: 0,
        autoPopLevel: 0,
        spawnLevel: 0,
        lastSaveTime: Date.now(),
    };
}

function upgradeCost(level) { return Math.floor(10 * Math.pow(1.5, level)); }

///////////////////////////////////////////////////////////////////////////////
function gameInit()
{
    cameraPos = vec2(0, 0);
    cameraScale = 40;
    gravity.y = -.01;

    let saved;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    const state = saved || defaultState();

    shards = state.shards;
    upgrades = {
        click: state.clickLevel,
        splash: state.splashLevel,
        autoFire: state.autoFireLevel,
        autoPop: state.autoPopLevel,
        spawn: state.spawnLevel,
    };

    items = [];
    recalcStats();

    // offline progress from auto-fire + auto-pop working together, capped at 2 hours
    const elapsed = Math.min((Date.now() - (state.lastSaveTime || Date.now())) / 1000, 7200);
    if (elapsed > 5 && autoFireRate > 0 && autoPopRate > 0)
        shards += Math.floor(Math.min(autoFireRate, autoPopRate) * elapsed * 2 * .5);

    particleEmitter = new ParticleEmitter(
        vec2(), 0,
        .3, .1, 60, PI,
        0,
        hsl(0, 1, .7), hsl(.5, 1, .7),
        hsl(0, 1, .7, 0), hsl(.5, 1, .7, 0),
        .5, .25, 0, .2, .1,
        .94, 1, 0, PI,
        .05, .6, 0, 1
    );
    particleEmitter.emitRate = 0;

    autoFireTimer = 0;
    autoPopTimer = 0;
    spawnTimer = 0;
    saveTimer = 0;
    hornFireFlash = 0;
}

function recalcStats()
{
    clickPower = 1 + upgrades.click;
    splashRadius = upgrades.splash * .5;
    autoFireRate = upgrades.autoFire * .3;
    autoPopRate = upgrades.autoPop * .5;
    spawnRate = 1 + upgrades.spawn * .3;
}

function pickItemType()
{
    const totalWeight = ITEM_TYPES.reduce((s, t) => s + t.weight, 0);
    let r = rand(totalWeight);
    for (const t of ITEM_TYPES)
    {
        if (r < t.weight) return t;
        r -= t.weight;
    }
    return ITEM_TYPES[0];
}

///////////////////////////////////////////////////////////////////////////////
class Item extends EngineObject
{
    constructor(pos, tier, type)
    {
        const size = 1.1 - tier * .2;
        super(pos, vec2(max(size, .35)), itemTile(type.tile), 0, hsl(mod(tier * HUE_STEP + rand(.05), 1), .8, .6));
        this.setCollision(false, false);
        this.gravityScale = 1;
        this.type = type;
        this.tier = tier;
        this.maxHp = Math.ceil((1 + tier * 2) * type.hpMul);
        this.hp = this.maxHp;
        this.value = Math.ceil((1 + tier * 2) * type.valueMul);
        this.velocity = vec2((rand() - .5) * .08, .28 + rand(.08));
        this.spinSpeed = (rand() - .5) * 2;
    }

    update()
    {
        super.update();
        this.angle += this.spinSpeed * timeDelta;

        // fell back off the bottom of the play field, or drifted too far sideways
        if (this.pos.y < -8 || abs(this.pos.x) > 10)
        {
            items.splice(items.indexOf(this), 1);
            this.destroy();
        }
    }

    render()
    {
        drawTile(this.pos, this.size, this.tileInfo, this.color, this.angle);
        const hpPct = this.hp / this.maxHp;
        if (hpPct < 1)
            drawRect(this.pos.add(vec2(0, this.size.y * .7)), vec2(this.size.x * hpPct, .08), hsl(.35 * hpPct, 1, .5));
    }

    pop()
    {
        shards += this.value;
        particleEmitter.pos = this.pos.copy();
        particleEmitter.colorStartA = this.color;
        particleEmitter.colorStartB = hsl(mod(this.tier * HUE_STEP + .3, 1), .8, .6);
        particleEmitter.emitRate = 150;
        particleEmitter.emitTime = .12;
        sound_pop.play(undefined, .4);

        if (this.tier < 3)
        {
            for (let i = 0; i < 2; i++)
            {
                const it = new Item(this.pos.add(randInCircle(.2)), this.tier + 1, this.type);
                it.velocity = vec2((rand() - .5) * .12, .15 + rand(.1));
                items.push(it);
            }
        }
        items.splice(items.indexOf(this), 1);
        this.destroy();
    }

    hit(dmg, splash)
    {
        this.hp -= dmg;
        if (this.hp <= 0)
        {
            const pos = this.pos.copy();
            this.pop();
            if (splash > 0)
                hitSplash(pos, splash, dmg * .5);
        }
    }
}

function hitSplash(pos, radius, dmg)
{
    for (const it of items.slice())
    {
        if (it.pos.distance(pos) < radius)
            it.hit(dmg, 0);
    }
}

function fireItem()
{
    if (items.length >= 30)
        return;
    const type = pickItemType();
    const it = new Item(HORN_POS.add(vec2(0, .5)), 0, type);
    items.push(it);
    hornFireFlash = .12;
    sound_fire.play(undefined, .3);
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdate()
{
    hornFireFlash = max(0, hornFireFlash - timeDelta);

    spawnTimer += timeDelta * spawnRate;
    autoFireTimer += timeDelta * autoFireRate;
    while (autoFireTimer > 1)
    {
        autoFireTimer -= 1;
        fireItem();
    }

    if (autoPopRate > 0)
    {
        autoPopTimer += timeDelta * autoPopRate;
        while (autoPopTimer > 1)
        {
            autoPopTimer -= 1;
            if (items.length)
                items[randInt(items.length)].hit(1, 0);
        }
    }

    if (mouseWasPressed(0))
    {
        if (mousePos.distance(HORN_POS) < 1.1)
        {
            fireItem();
        }
        else
        {
            const clicked = items.find(it => it.pos.distance(mousePos) < it.size.x * .6);
            if (clicked)
                clicked.hit(clickPower, splashRadius);
            else
                checkUiClick(mousePosScreen);
        }
    }

    saveTimer += timeDelta;
    if (saveTimer > 5)
    {
        saveTimer = 0;
        saveGame();
    }
}

function saveGame()
{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
        shards,
        clickLevel: upgrades.click,
        splashLevel: upgrades.splash,
        autoFireLevel: upgrades.autoFire,
        autoPopLevel: upgrades.autoPop,
        spawnLevel: upgrades.spawn,
        lastSaveTime: Date.now(),
    }));
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdatePost()
{
}

///////////////////////////////////////////////////////////////////////////////
function gameRender()
{
    drawRect(vec2(), vec2(40), hsl(.6, .3, .12), 0);

    // unicorn horn at bottom, glows brighter while firing
    const hornTile = hornFireFlash > 0 ? TILE_HORN_FIRE : TILE_HORN;
    const hornColor = hsl(.85, .5, hornFireFlash > 0 ? .85 : .7);
    drawTile(HORN_POS, vec2(2), itemTile(hornTile), hornColor);
}

///////////////////////////////////////////////////////////////////////////////
const UI_BUTTONS = [
    { key: 'click', label: 'Horn Power', desc: '+1 click damage' },
    { key: 'splash', label: 'Splash Radius', desc: '+AOE on pop' },
    { key: 'autoFire', label: 'Auto-Fire', desc: '+horn fires itself' },
    { key: 'autoPop', label: 'Auto-Pop', desc: '+items pop themselves' },
    { key: 'spawn', label: 'Fire Rate+', desc: '+faster auto-fire' },
];
let uiButtonRects = [];

function checkUiClick(screenPos)
{
    for (const btn of uiButtonRects)
    {
        if (screenPos.x >= btn.x && screenPos.x <= btn.x + btn.w &&
            screenPos.y >= btn.y && screenPos.y <= btn.y + btn.h)
        {
            const cost = upgradeCost(upgrades[btn.key]);
            if (shards >= cost)
            {
                shards -= cost;
                upgrades[btn.key]++;
                recalcStats();
                sound_buy.play();
                saveGame();
            }
        }
    }
}

function gameRenderPost()
{
    const w = mainCanvasSize.x;

    drawTextScreen(`Shards: ${Math.floor(shards)}`, vec2(w / 2, 40), 32, WHITE, 3, BLACK);
    drawTextScreen('Click the horn to fire, click items to pop', vec2(w / 2, 72), 16, WHITE, 2, BLACK);

    uiButtonRects = [];
    const btnW = 160, btnH = 60, gap = 10;
    const totalW = UI_BUTTONS.length * btnW + (UI_BUTTONS.length - 1) * gap;
    const startX = (w - totalW) / 2, startY = mainCanvasSize.y - btnH - 20;
    UI_BUTTONS.forEach((btn, i) =>
    {
        const x = startX + i * (btnW + gap);
        const y = startY;
        const cost = upgradeCost(upgrades[btn.key]);
        const affordable = shards >= cost;
        const bg = affordable ? hsl(.4, .6, .3, .85) : hsl(0, 0, .2, .85);

        drawRect(vec2(x + btnW / 2, y + btnH / 2), vec2(btnW, btnH), bg, 0, false, true);
        drawTextScreen(`${btn.label} Lv${upgrades[btn.key]}`, vec2(x + btnW / 2, y + 16), 14, WHITE, 2, BLACK);
        drawTextScreen(btn.desc, vec2(x + btnW / 2, y + 34), 10, hsl(0, 0, .8), 1, BLACK);
        drawTextScreen(`${cost} shards`, vec2(x + btnW / 2, y + 50), 12, affordable ? hsl(.35, 1, .7) : hsl(0, .7, .6), 2, BLACK);

        uiButtonRects.push({ x, y, w: btnW, h: btnH, key: btn.key });
    });
}

///////////////////////////////////////////////////////////////////////////////
window.addEventListener('beforeunload', () => { if (typeof shards !== 'undefined') saveGame(); });

// Startup LittleJS Engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);
