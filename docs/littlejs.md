# LittleJS (js13k branch) Reference

Repo: `https://github.com/KilledByAPixel/LittleJS` branch `js13k`. Version `1.18.25-js13k`. MIT.
API docs (main branch, names/args/defaults match): https://killedbyapixel.github.io/LittleJS/docs

Size-optimized fork of LittleJS for size-coding compos. Starter builds to **7684 bytes of 13312** (57.7%) with the whole engine plus `tiles.png` included - verified locally 2026-08-11, build takes ~10s.

## Setup

```bash
git clone -b js13k https://github.com/KilledByAPixel/LittleJS.git
cd LittleJS && npm install && npm start
```

Dev page: `http://localhost:8000/examples/starter/`. Edit `examples/starter/game.js`, reload.

**Use `npm start`, never open `index.html` over `file://`** - the browser treats `tiles.png` as cross-origin and the WebGL texture upload throws `SecurityError`. `serve.js` is a dependency-free static server that exists only for this. `PORT` env var changes the port.

Debug overlay on the dev page: `Esc` toggles, then `1`/`2` for physics and particle debug, `5` screenshot, `6` record video. All debug tooling compiles out of the release zip.

`npm run build` writes `examples/starter/game.zip` and prints size vs limit, exiting non-zero if over.
`npm run build:engine` (dist bundles + TS defs) and `npm test` (headless smoke test) are not needed to make a game.

## Game structure

Everything lives in `game.js`. No modules - the build concatenates all sources into one global scope.

```js
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);
```

Five callbacks: init, update, post-update, render, post-render. Entities are classes extending `EngineObject`; the engine updates, moves, and renders them automatically.

- `gameRender` draws in world space (behind objects).
- `gameRenderPost` draws HUD to the overlay canvas, e.g. `drawTextScreen(text, vec2(x,y), size)`.

## Build pipeline

`examples/starter/build.mjs` - plain Node script, no bundler:

| Stage | What it does |
| --- | --- |
| Concatenate | Joins `sourceFiles` into one file, one global scope |
| Feature flags | Rewrites disabled `FEATURES` to compile-time constants so the next stage deletes them |
| Closure Compiler | `ADVANCED` mode: renames everything, deletes every function the game never calls |
| UglifyJS | Second `-c -m --toplevel` pass, worth 54 bytes |
| Roadroller | Re-encodes JS as self-extracting compressed data. Slowest stage, biggest win |
| ect zip | Zips inlined HTML plus `dataFiles`. This is the submission |

Knobs at the top of `build.mjs`:
- `DEBUG_BUILD` keeps intermediate `.closure.js` / `.uglify.js` files.
- `USE_ROADROLLER` off while iterating (skips the slow stage).
- `ROADROLLER_EXTREME` passes `--optimize 2` - a minute of work for a few bytes. Save for the end.
- `sourceFiles` - add your own JS files here.
- `dataFiles` - runtime assets that go in the zip (`tiles.png` by default).

`--toplevel` in the Uglify pass is safe because everything is inlined into one script. Remove it if you hand-write an HTML page with its own `<script>` calling into the game.

## Saving space

**Start by not worrying about it.** Closure ADVANCED already deletes engine functions the game never calls, and folds away flags that default to `false` (so `showSplashScreen` and `headlessMode` already cost nothing).

What it cannot delete is code behind a flag defaulting to `true` - those are mutable `let` bindings so the setters work, forcing Closure to keep both branches of every `if (glEnable)`. The `FEATURES` block in `build.mjs` fixes this by rewriting a disabled flag to `const false` and emptying its setter before Closure runs:

| Disabled | Saving | Cost |
| --- | ---: | --- |
| `touch` | 152 | Touch input, on-screen touch gamepad |
| `gamepad` | 247 | Gamepad input, multi-controller |
| `webgl` | 792 | WebGL sprite batching, falls back to canvas 2D |
| `sound` | 794 | All audio: ZzFX sounds, music, speech |
| `physics` | 488 | All collision response, object-vs-object and object-vs-tile |
| all five | ~2500 | A silent keyboard-and-mouse game drawn with canvas 2D |

Gotchas:
- **`glEnable = false` in your own code costs 50 bytes instead of saving any.** The flag stays mutable and you added an assignment. Use `FEATURES`.
- **`FEATURES` only affects the built zip.** `npm start` loads `src/` directly, so the dev page always has everything on. To develop against what ships, call the setter in `gameInit` - `setGLEnable(false)` compiles to nothing in the build.
- Disabling `physics` removes automatic collision response, but query functions you call yourself (`tileCollisionTest`, `getTileCollisionData`) always survive because your game references them.
- Deleting an unused engine file from `sourceFiles` gains nothing - Closure already removed the unreachable code. The exception is `engineTileLayer.js`, which leaves a 72-byte residue because `engineObject.js` calls `tileCollisionTest` inside `if (this.collideTiles)`; disabling `physics` compiles that away too. Nothing warns you if you remove a file something still references - you get a runtime `ReferenceError`, not a build error.
- Every `dataFiles` entry goes in the zip. `tiles.png` is already PNG-compressed so `ect` shaves little. **Shrinking the image or generating art procedurally is usually the cheapest win left.**

## API surface

### Engine
`engineInit` `engineVersion` `frameRate` `timeDelta` `time` `timeReal` `frame` `engineObjects` `paused`/`getPaused`/`setPaused` `engineObjectsUpdate` `engineObjectsDestroy` `engineObjectsCallback` `engineObjectsRaycast` `engineAddPlugin`

### EngineObject
```js
new EngineObject(pos=vec2(), size=vec2(1), tileInfo, angle=0, color=new Color, renderOrder=0)
```
Override `update()` (call `super.update()` for physics) and `render()`. Other methods: `destroy()` `localToWorld(pos)` `worldToLocal(pos)` `applyAcceleration(v)` `applyForce(v)` `getMirrorSign()` `setCollision(collideSolidObjects=true, isSolid=true, collideTiles=true, collideRaycast=true)` `collideWithObject` / `collideWithTile` hooks.

Properties: `pos` `size` `drawSize` `tileInfo` `angle` `color` `additiveColor` `mirror` `velocity` `angleVelocity` `damping` `angleDamping` `gravityScale` `renderOrder` `spawnTime` `mass` `restitution` `friction` `clampSpeed` `groundObject` `parent` `children` `localPos` `localAngle` `collideTiles` `collideSolidObjects` `isSolid` `collideRaycast`

### Draw
`tile(index, size, textureIndex, padding)` `TileInfo` `TextureInfo` `textureInfos` `drawTile` `drawRect` `drawLine` `drawPoly` `drawEllipse` `drawCircle` `drawCanvas2D` `drawText` `drawTextOverlay` `drawTextScreen` `setAdditiveBlendMode` `combineCanvases` `screenToWorld` `worldToScreen` `screenToWorldDelta` `worldToScreenDelta` `isOnScreen` `getCameraSize` `isFullscreen` `toggleFullscreen` `setCursor` `mainCanvas` `mainContext` `overlayCanvas` `overlayContext` `mainCanvasSize`

### Math / utils
`PI` `abs` `min` `max` `sign` `mod` `clamp` `percent` `lerp` `percentLerp` `smoothStep` `distanceWrap` `lerpWrap` `distanceAngle` `lerpAngle` `nearestPowerOfTwo` `isOverlapping` `isIntersecting` `lineTest` `oscillate` `formatTime` `noise1D` `noise2D` `fetchJSON` `saveText` `saveCanvas` `saveDataURL` `shareURL` `readSaveData` `writeSaveData`

Random: `rand` `randInt` `randSign` `randInCircle` `randVec2` `randColor` `RandomGenerator` (seeded).

Classes: `Vector2`/`vec2` `Color`/`rgb`/`hsl` `Timer`. Type guards: `isColor` `isVector2` `isNumber` `isStringLike`.
Color constants: `WHITE` `CLEAR_WHITE` `BLACK` `CLEAR_BLACK` `GRAY` `RED` `ORANGE` `YELLOW` `GREEN` `CYAN` `BLUE` `PURPLE` `MAGENTA`

### Input
`keyIsDown` `keyWasPressed` `keyWasReleased` `keyDirection` `inputClear` `inputClearKey` `mouseIsDown` `mouseWasPressed` `mouseWasReleased` `mousePos` `mousePosScreen` `mouseWheel` `gamepadIsDown` `gamepadWasPressed` `gamepadWasReleased` `gamepadStick` `gamepadsUpdate` `isUsingGamepad` `isTouchDevice` `vibrate` `vibrateStop` `inputPreventDefault`/`setInputPreventDefault`

### Audio
`new Sound(zzfxSound, range, taper)` - `.play(pos)` returns a raw `AudioBufferSourceNode` on this branch.
`SoundWave(filename, randomness, range, taper, onloadCallback)` `ZzFXMusic(zzfxMusic)` `zzfx` `playSamples` `playAudioFile` `speak` `speakStop` `getNoteFrequency` `audioContext` `audioDefaultSampleRate`

### Tiles
`initTileCollision(vec2(w,h))` `setTileCollisionData(pos, data)` `getTileCollisionData(pos)` `tileCollisionTest` `tileCollisionRaycast` `tileCollision` `tileCollisionSize` `TileLayerData` `new TileLayer(position, size, tileInfo, renderOrder)` (`.setData` / `.redraw`)

### Particles
`ParticleEmitter` `Particle`. Constructor args in order:
`emitPos, emitAngle, emitSize, emitTime, emitRate, emitCone, tileInfo, colorStartA, colorStartB, colorEndA, colorEndB, time, sizeStart, sizeEnd, speed, angleSpeed, damping, angleDamping, gravityScale, cone, fadeRate, randomness, collide, additive`

### Medals
`medalsInit` `new Medal(id, name, description='', icon='🏆', src)` `medals` `medalsPreventUnlock`/`setMedalsPreventUnlock`

### Settings (each has a `setX` setter)
`cameraPos` `cameraAngle` `cameraScale` `canvasMaxSize` `canvasFixedSize` `canvasPixelated` `tilesPixelated` `fontDefault` `showSplashScreen` `headlessMode` `tileSizeDefault` `tileFixBleedScale` `enablePhysicsSolver` `objectDefaultMass` `objectDefaultDamping` `objectDefaultAngleDamping` `objectDefaultRestitution` `objectDefaultFriction` `objectMaxSpeed` `gravity` `particleEmitRateScale` `glEnable` `gamepadsEnable` `gamepadDirectionEmulateStick` `inputWASDEmulateDirection` `touchGamepadEnable` `touchGamepadAnalog` `touchGamepadSize` `touchGamepadAlpha` `vibrateEnable` `soundEnable` `soundVolume` `soundDefaultRange` `soundDefaultTaper` `medalDisplayTime` `medalDisplaySlideTime` `medalDisplaySize` `showWatermark` `setDebugKey`

## Differences from main LittleJS

Build here during the compo, port to main after. Names, argument orders, and defaults match; anything in main not listed here (plugins, `CanvasLayer`, `ImageFont`, pointer lock) is purely additive.

**Tile collision** - single global collision grid instead of main's `TileCollisionLayer` objects:
```js
// here                              // main
initTileCollision(vec2(w, h));       const layer = new TileCollisionLayer(pos, size);
setTileCollisionData(pos, data);     layer.setCollisionData(pos, data);
getTileCollisionData(pos);           layer.getCollisionData(pos);
const layer = new TileLayer(pos, size);
```
`tileCollisionTest` returns a Boolean here, the hit layer (or `undefined`) in main - truthiness tests port fine, `=== true` does not.

**Sound instances** - `sound.play()` returns a raw `AudioBufferSourceNode` here; main returns a `SoundInstance`. `Sound.stop()` / `setVolume()` / `getSource()` act on the most recent instance here and do not exist on `Sound` in main - keep the return value of `play()` and call them on that. Main's `SoundInstance` also adds `pause()`/`resume()`/`isPlaying()`, which have no equivalent here.

**Particles are `EngineObject`s here**, updated by the engine; in main they are lightweight objects owned by their emitter. `ParticleEmitter` API is the same, but per-particle tweaks in `particleCreateCallback` become emitter-level settings on port.

**`inputPreventDefault` covers less here** - only middle/right mouse clicks. Main also prevents arrow keys, space, and tab from scrolling/refocusing, and guards touch `preventDefault` (always on here).

**`Vector2.toString()` and `Timer.toString()` are debug-only here** - they format on the dev page but return `undefined` in the built zip (`toString` is the one name Closure cannot delete, so the body is stripped). `Color.toString()` works everywhere.

## Prior art

js13k games built with LittleJS, several top-10 finishers: Space Huggers (KilledByAPixel), Black Cat Squadron (repsej), L1ttL3 Paws (Frank Force), The Way of the Dodo (repsej), KleptoKitty (eoinmcg), Wendol Village (sanojian), Dead Again (sanojian & repsej).

Scaffolding tool: [LittleJS13k Wizard](https://github.com/eoinmcg/create-js13k-littlejs) by eoinmcg.
