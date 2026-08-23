/*
    Rainbow Pop - js13k 2026
    Pop rainbow bubbles with your unicorn horn, earn shards, buy upgrades.
*/

'use strict';

const SAVE_KEY = 'js13k26_rainbowpop_save';
const HUE_STEP = .09;

const sound_pop = new Sound([1, .1, 300, , .04, .12, , 1.6, , , 200, .04]);
const sound_buy = new Sound([1.1, , 500, , .05, .08, , 1.4, , , 400, .04]);

let bubbles, shards, particleEmitter;
let clickPower, splashRadius, autoPopRate, spawnRate, lastSaveTime;
let upgrades;

function defaultState()
{
    return {
        shards: 0,
        clickLevel: 0,
        splashLevel: 0,
        autoLevel: 0,
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
    gravity.y = 0;
    setGLEnable(false);

    let saved;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    const state = saved || defaultState();

    shards = state.shards;
    upgrades = {
        click: state.clickLevel,
        splash: state.splashLevel,
        auto: state.autoLevel,
        spawn: state.spawnLevel,
    };

    bubbles = [];
    recalcStats();

    // offline progress from auto-poppers, capped at 2 hours
    const elapsed = Math.min((Date.now() - (state.lastSaveTime || Date.now())) / 1000, 7200);
    if (elapsed > 5 && autoPopRate > 0)
        shards += Math.floor(autoPopRate * elapsed * .6);

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

    autoPopTimer = 0;
    spawnTimer = 0;
}

function recalcStats()
{
    clickPower = 1 + upgrades.click;
    splashRadius = upgrades.splash * .5;
    autoPopRate = upgrades.auto * .5; // pops per second, abstracted to shard income
    spawnRate = 1 + upgrades.spawn * .3;
}

let autoPopTimer, spawnTimer;

///////////////////////////////////////////////////////////////////////////////
class Bubble extends EngineObject
{
    constructor(pos, tier)
    {
        const size = 1.2 - tier * .25;
        super(pos, vec2(max(size, .35)), 0, 0, hsl(mod(tier * HUE_STEP, 1), .8, .6));
        this.setCollision(false, false);
        this.gravityScale = 0;
        this.tier = tier;
        this.maxHp = 1 + tier * 2;
        this.hp = this.maxHp;
        this.bobTime = rand(PI * 2);
        this.driftAngle = rand(PI * 2);
        this.driftSpeed = .015 + rand(.015);
        this.value = 1 + tier * 2;
    }

    update()
    {
        this.bobTime += timeDelta * 2;
        this.pos.x += Math.cos(this.driftAngle) * this.driftSpeed;
        this.pos.y += Math.sin(this.driftAngle) * this.driftSpeed + Math.sin(this.bobTime) * .003;

        // despawn if drifted off the play field
        if (this.pos.length() > 14)
            this.destroy();
    }

    render()
    {
        drawRect(this.pos, this.size, this.color, 0);
        const hpPct = this.hp / this.maxHp;
        if (hpPct < 1)
            drawRect(this.pos.add(vec2(0, -this.size.y * .7)), vec2(this.size.x * hpPct, .08), hsl(.35 * hpPct, 1, .5));
    }

    pop(bonusMultiplier = 1)
    {
        shards += this.value * bonusMultiplier;
        particleEmitter.pos = this.pos.copy();
        particleEmitter.colorStartA = this.color;
        particleEmitter.colorStartB = hsl(mod(this.tier * HUE_STEP + .3, 1), .8, .6);
        particleEmitter.emitRate = 150;
        particleEmitter.emitTime = .12;
        sound_pop.play(undefined, .4);

        // split into smaller bubbles, up to a tier cap
        if (this.tier < 4)
        {
            const childCount = 2;
            for (let i = 0; i < childCount; i++)
            {
                const b = new Bubble(this.pos.add(randInCircle(.3)), this.tier + 1);
                b.driftAngle = rand(PI * 2);
                bubbles.push(b);
            }
        }
        bubbles.splice(bubbles.indexOf(this), 1);
        this.destroy();
    }

    hit(dmg, splash)
    {
        this.hp -= dmg;
        if (this.hp <= 0)
        {
            this.pop();
            if (splash > 0)
                hitSplash(this.pos, splash, dmg * .5);
        }
    }
}

function hitSplash(pos, radius, dmg)
{
    for (const b of bubbles.slice())
    {
        if (b.pos.distance(pos) < radius)
            b.hit(dmg, 0);
    }
}

function spawnBubble()
{
    const angle = rand(PI * 2);
    const dist = 8 + rand(4);
    const pos = vec2(Math.cos(angle) * dist, Math.sin(angle) * dist);
    const b = new Bubble(pos, 0);
    bubbles.push(b);
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdate()
{
    spawnTimer += timeDelta * spawnRate;
    while (spawnTimer > 1)
    {
        spawnTimer -= 1;
        if (bubbles.length < 40)
            spawnBubble();
    }

    if (autoPopRate > 0)
    {
        autoPopTimer += timeDelta * autoPopRate;
        while (autoPopTimer > 1)
        {
            autoPopTimer -= 1;
            if (bubbles.length)
            {
                const b = bubbles[randInt(bubbles.length)];
                b.hit(1, 0);
            }
        }
    }

    if (mouseWasPressed(0))
    {
        const clicked = bubbles.find(b => b.pos.distance(mousePos) < b.size.x * .6);
        if (clicked)
        {
            clicked.hit(clickPower, splashRadius);
        }
        else
        {
            checkUiClick(mousePosScreen);
        }
    }

    // periodic save
    lastSaveTime = (lastSaveTime || 0) + timeDelta;
    if (lastSaveTime > 5)
    {
        lastSaveTime = 0;
        saveGame();
    }
}

function saveGame()
{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
        shards,
        clickLevel: upgrades.click,
        splashLevel: upgrades.splash,
        autoLevel: upgrades.auto,
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
}

///////////////////////////////////////////////////////////////////////////////
const UI_BUTTONS = [
    { key: 'click', label: 'Horn Power', desc: '+1 click damage' },
    { key: 'splash', label: 'Splash Radius', desc: '+AOE on pop' },
    { key: 'auto', label: 'Auto-Unicorn', desc: '+.5 auto pops/sec' },
    { key: 'spawn', label: 'Spawn Rate', desc: '+bubbles/sec' },
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
    drawTextScreen('Click bubbles to pop them', vec2(w / 2, 72), 16, WHITE, 2, BLACK);

    uiButtonRects = [];
    const btnW = 190, btnH = 60, gap = 12;
    const startX = 20, startY = mainCanvasSize.y - btnH - 20;
    UI_BUTTONS.forEach((btn, i) =>
    {
        const x = startX + i * (btnW + gap);
        const y = startY;
        const cost = upgradeCost(upgrades[btn.key]);
        const affordable = shards >= cost;
        const bg = affordable ? hsl(.4, .6, .3, .85) : hsl(0, 0, .2, .85);

        drawRect(vec2(x + btnW / 2, y + btnH / 2), vec2(btnW, btnH), bg, 0, false, true);
        drawTextScreen(`${btn.label} Lv${upgrades[btn.key]}`, vec2(x + btnW / 2, y + 16), 15, WHITE, 2, BLACK);
        drawTextScreen(btn.desc, vec2(x + btnW / 2, y + 34), 11, hsl(0, 0, .8), 1, BLACK);
        drawTextScreen(`${cost} shards`, vec2(x + btnW / 2, y + 50), 13, affordable ? hsl(.35, 1, .7) : hsl(0, .7, .6), 2, BLACK);

        uiButtonRects.push({ x, y, w: btnW, h: btnH, key: btn.key });
    });
}

///////////////////////////////////////////////////////////////////////////////
window.addEventListener('beforeunload', () => { if (typeof shards !== 'undefined') saveGame(); });

// Startup LittleJS Engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
