# js13kgames-2026

Entry for the js13kGames 2026 compo (13 Aug - 13 Sep 2026), built on the
[js13kgames-template](https://github.com/MartinTale/js13kgames-template) (Vite + TypeScript, DOM/CSS rendering).

## Commands

```bash
npm run dev       # dev server with hot reload, http://localhost:5173/
npm run build     # tsc typecheck + vite build + optimize, writes dist/index.zip
npm run preview   # preview the production build
npm run lint      # eslint
```

## Layout

- `src/index.ts` - entry point, boots state/music/fireflies/UI chrome, starts the game loop
- `src/game/` - the actual game (`game.ts`, `game.css`)
- `src/systems/` - state (signals + localStorage save), animation/tweening, music, svgs
- `src/components/` - reusable DOM UI pieces (button, modal, progress-bar, edge-button, fireflies, scaleable-container)
- `src/helpers/` - small pure utilities (dom, colors, numbers)
- `src/third-party-libraries/` - vendored ZzFX/ZzFXM (keep unmodified)

## Architecture

- Everything renders as real DOM elements styled with CSS, not canvas. `helpers/dom.ts`'s `el()`/`mount()` build elements; components are plain functions/classes that return/mutate `HTMLElement`s.
- App state lives in `systems/state.ts` as `Signal`s (`systems/signals.ts`) - reactive values you `.subscribe()` to. State auto-saves to `localStorage` every 15s and on `beforeunload`, base64-encoded under one key.
- The game loop runs via `requestAnimationFrame` in `game/game.ts`'s `startGameLoop`, driving `systems/animation.ts` tweens each frame.
- `vite.config.ts` uses `js13k-vite-plugins`' `js13kViteConfig()`, which wires up Terser + Roadroller + zip size reporting automatically - no manual build script to maintain.

## Hard constraints

- **13,312 bytes** for the final `dist/index.zip`. `npm run build` prints the size.
- **Zero external resources.** No CDNs, fonts, or analytics. Everything ships in the zip.
- **No console errors** in latest Chrome and Firefox.
- Namespace the `localStorage` key in `systems/state.ts` (`STATE_KEY`) - games share one origin. Never `localStorage.clear()`.
- Submission needs both the zip and a public GitHub repo with readable, buildable source.

## Working rules

- TypeScript throughout; `tsc` runs as part of `npm run build` and must pass.
- Roadroller is skipped in dev builds automatically (see `vite.config.ts`) but runs for the real production build - always check `npm run build`'s reported size before assuming something fits.
- Prefer extending the existing `systems/`/`components/` patterns over introducing new ad-hoc globals.
- Reference docs: [docs/js13k-rules.md](docs/js13k-rules.md) - competition rules, deadlines, submission requirements.

## Git

Solo dev project: **commit directly to `main`**, no feature branches. Commit at each logical step.
