/*
    Unicorn Drill - js13k 2026
    Dig as deep as possible before your rainbow fuel runs out.
*/

'use strict';

const WORLD_W = 40;
const WORLD_H = 300;
const SURFACE_Y = WORLD_H - 12; // tile row where open sky ends and diggable dirt begins
const TILE_EMPTY = 0;
const TILE_DIRT = 1;
const TILE_HARD = 2;

const sound_dig = new Sound([1, .1, 150, , .02, .1, , 1.5, , , , , , 3]);
const sound_shard = new Sound([1.2, , 600, , .05, .1, , 1.8, , , 300, .05]);
const sound_die = new Sound([1.5, , 200, .05, .2, .3, , 1.2, , , , , , .5]);

let player, fuel, maxFuel, depth, maxDepth, shardsCollected, gameOver, hiscore;
let shardEmitter;

// tile color by depth band, cycling through rainbow hues
function tileColor(y)
{
    const depthBelowSurface = SURFACE_Y - y;
    const hue = mod(depthBelowSurface * .03, 1);
    return hsl(hue, .7, .35 + .1 * Math.sin(depthBelowSurface * .1));
}

function isHardTile(y)
{
    const depthBelowSurface = SURFACE_Y - y;
    return depthBelowSurface > 40 && rand() < .15 + depthBelowSurface * .0008;
}

///////////////////////////////////////////////////////////////////////////////
function gameInit()
{
    initTileCollision(vec2(WORLD_W, WORLD_H));
    const tileLayer = new TileLayer(vec2(), tileCollisionSize);

    const pos = vec2();
    for (pos.x = WORLD_W; pos.x--;)
    for (pos.y = WORLD_H; pos.y--;)
    {
        if (pos.y >= SURFACE_Y)
        {
            setTileCollisionData(pos, TILE_EMPTY);
            continue;
        }

        const hard = isHardTile(pos.y);
        const tileIndex = hard ? TILE_HARD : TILE_DIRT;
        setTileCollisionData(pos, tileIndex);
        const data = new TileLayerData(0, 0, 0, tileColor(pos.y));
        tileLayer.setData(pos, data);
    }
    tileLayer.redraw();
    window.worldTileLayer = tileLayer;

    player = new Unicorn(vec2(WORLD_W / 2, SURFACE_Y + 3));

    cameraPos = player.pos.copy();
    cameraScale = 32;
    gravity.y = -.015;

    maxFuel = 100;
    fuel = maxFuel;
    depth = 0;
    maxDepth = 0;
    shardsCollected = 0;
    gameOver = false;
    hiscore = +(localStorage.getItem('js13k26_unicorn_hiscore') || 0);

    shardEmitter = new ParticleEmitter(
        player.pos, 0,
        .5, .1, 80, PI,
        0,
        hsl(0, 1, .6), hsl(.6, 1, .6),
        hsl(0, 1, .6, 0), hsl(.6, 1, .6, 0),
        .4, .3, 0, .15, .1,
        .95, 1, .3, PI,
        .05, .5, 0, 1
    );
    shardEmitter.emitRate = 0;
}

///////////////////////////////////////////////////////////////////////////////
class Unicorn extends EngineObject
{
    constructor(pos)
    {
        super(pos, vec2(.8, .8), 0, 0, hsl(.85, .6, .8));
        this.setCollision(true, true);
        this.digTimer = 0;
        this.facing = 1;
    }

    update()
    {
        if (gameOver)
            return;

        super.update();

        const moveInput = keyDirection();
        this.velocity.x += moveInput.x * .02;
        this.velocity.x = clamp(this.velocity.x, -.15, .15);
        if (moveInput.x)
            this.facing = sign(moveInput.x);

        if ((keyIsDown('ArrowUp') || keyIsDown('KeyW')) && this.groundObject)
            this.velocity.y = .22;

        // dig in facing/movement direction
        this.digTimer -= timeDelta;
        if (fuel > 0 && this.digTimer <= 0)
        {
            const digDir = moveInput.y < 0 ? vec2(0, -1) :
                moveInput.y > 0 ? vec2(0, 1) :
                vec2(this.facing, 0);
            this.tryDig(this.pos.add(digDir.scale(.7)));
        }

        // deplete fuel over time, faster while digging
        fuel = max(0, fuel - timeDelta * 1.2);
        if (fuel <= 0 && !gameOver)
            endRun();

        maxDepth = max(maxDepth, Math.floor(SURFACE_Y - this.pos.y));
        depth = Math.floor(SURFACE_Y - this.pos.y);

        // fell into the void at world bottom
        if (this.pos.y < 2)
            endRun();
    }

    tryDig(worldPos)
    {
        const tilePos = worldPos.floor();
        const data = getTileCollisionData(tilePos);
        if (data === TILE_EMPTY)
            return;

        const cost = data === TILE_HARD ? 2.5 : 1;
        this.digTimer = data === TILE_HARD ? .18 : .08;
        setTileCollisionData(tilePos, TILE_EMPTY);
        window.worldTileLayer.setData(tilePos, new TileLayerData());
        window.worldTileLayer.redraw();
        sound_dig.play(this.pos, .5);

        // chance to reveal a rainbow shard where dirt was removed
        if (rand() < .12)
            new Shard(tilePos.add(vec2(.5, .5)));
    }
}

///////////////////////////////////////////////////////////////////////////////
class Shard extends EngineObject
{
    constructor(pos)
    {
        super(pos, vec2(.4, .4), 0, rand(PI * 2), hsl(rand(), .9, .6));
        this.setCollision(false, false);
        this.gravityScale = 0;
        this.bobTime = rand(PI * 2);
    }

    update()
    {
        this.bobTime += timeDelta * 4;
        this.angle += timeDelta * 2;
        if (!gameOver && this.pos.distance(player.pos) < .7)
        {
            fuel = min(maxFuel, fuel + 18);
            shardsCollected++;
            sound_shard.play(this.pos, .6);
            shardEmitter.pos = this.pos.copy();
            shardEmitter.emitRate = 200;
            shardEmitter.emitTime = .15;
            this.destroy();
        }
    }

    render()
    {
        drawRect(this.pos.add(vec2(0, Math.sin(this.bobTime) * .08)), this.size, this.color, this.angle);
    }
}

///////////////////////////////////////////////////////////////////////////////
function endRun()
{
    gameOver = true;
    sound_die.play(player.pos);
    if (maxDepth > hiscore)
    {
        hiscore = maxDepth;
        localStorage.setItem('js13k26_unicorn_hiscore', hiscore);
    }
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdate()
{
    if (gameOver && keyWasPressed('Space'))
        gameInit();

    cameraPos = cameraPos.lerp(player.pos, .1);
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdatePost()
{
}

///////////////////////////////////////////////////////////////////////////////
function gameRender()
{
    // sky above surface
    drawRect(vec2(WORLD_W / 2, SURFACE_Y + 20), vec2(WORLD_W + 20, 60), hsl(.55, .6, .75), 0, 0);
}

///////////////////////////////////////////////////////////////////////////////
function gameRenderPost()
{
    const w = mainCanvasSize.x;

    // fuel bar
    const barW = 200, barH = 18, barX = 20, barY = 30;
    drawRect(vec2(barX + barW / 2, barY), vec2(barW + 4, barH + 4), hsl(0, 0, 0, .5), 0, false, true);
    const fuelPct = fuel / maxFuel;
    const fuelColor = hsl(.35 * fuelPct, .9, .55);
    drawRect(vec2(barX + barW * fuelPct / 2, barY), vec2(barW * fuelPct, barH), fuelColor, 0, false, true);
    drawTextScreen('FUEL', vec2(barX + barW / 2, barY), 14, WHITE, 3, BLACK);

    drawTextScreen(`Depth ${depth}m`, vec2(80, 60), 20, WHITE, 3, BLACK);
    drawTextScreen(`Shards ${shardsCollected}`, vec2(90, 84), 18, WHITE, 3, BLACK);
    drawTextScreen(`Best ${hiscore}m`, vec2(w - 90, 60), 18, WHITE, 3, BLACK);

    if (gameOver)
    {
        const cy = mainCanvasSize.y / 2;
        drawTextScreen('OUT OF FUEL', vec2(w / 2, cy - 40), 48, WHITE, 4, BLACK);
        drawTextScreen(`Depth reached: ${maxDepth}m`, vec2(w / 2, cy + 10), 26, WHITE, 3, BLACK);
        drawTextScreen('Press SPACE to dig again', vec2(w / 2, cy + 50), 22, WHITE, 3, BLACK);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Startup LittleJS Engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
