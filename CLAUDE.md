# js13kgames-2026

Entry for the js13kGames 2026 compo (13 Aug - 13 Sep 2026), built on the LittleJS `js13k` branch (vendored into `src/`).

## Commands

```bash
npm start        # dev server, game at http://localhost:8000/game/
npm run build    # writes game/game.zip, prints size vs the 13312 limit
npm test         # headless engine smoke test
```

## Layout

- `src/` - vendored LittleJS engine, keep unmodified so upstream fixes drop in cleanly
- `game/` - the game: `game.js`, `index.html`, `build.mjs`, `tiles.png`
- `serve.js`, `test/` - dev server and smoke test

## Git

Solo dev project: **commit directly to `main`**, no feature branches. Commit at each logical step.

## Reference docs

- [docs/js13k-rules.md](docs/js13k-rules.md) - competition rules, deadlines, submission requirements.
- [docs/littlejs.md](docs/littlejs.md) - engine setup, build pipeline, size budget, full API surface, differences from main LittleJS.

## Hard constraints

- **13,312 bytes** for the final `.zip`. `index.html` must be at the top level of the archive.
- **Zero external resources.** No CDNs, fonts, or analytics. Everything ships in the zip.
- **No console errors** in latest Chrome and Firefox.
- Namespace any `localStorage` keys; games share one origin. Never `localStorage.clear()`.
- Submission needs both the zip and a public GitHub repo with readable, buildable source.

## Working rules

- All game code lives in one global scope - the build concatenates sources, no modules. Add new files to `sourceFiles` in `build.mjs`, runtime assets to `dataFiles`.
- Don't hand-optimize bytes early. Closure ADVANCED deletes unreachable engine code for free; the `FEATURES` block in `build.mjs` is the lever for the rest (~2.5KB max).
- Set `USE_ROADROLLER = false` while iterating on size, back on for real measurements. `ROADROLLER_EXTREME` only at the very end.
- Use `npm start`, never `file://` - `tiles.png` fails the WebGL texture upload as cross-origin.
- The dev page always runs with all features on; `FEATURES` affects the zip only. Call the setters (e.g. `setGLEnable(false)`) in `gameInit` to develop against what ships.
- Art is usually the cheapest byte win: shrink `tiles.png` or generate procedurally.
- Use the [main LittleJS docs](https://killedbyapixel.github.io/LittleJS/docs) as the API reference, with the differences section in docs/littlejs.md applied.
