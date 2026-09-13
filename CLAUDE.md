# Cloudclimb

Originally the entry for the js13kGames 2026 compo, built on the
[js13kgames-template](https://github.com/MartinTale/js13kgames-template) (Vite + TypeScript, DOM/CSS rendering).
Post-submission, the jam's 13,312-byte zip limit no longer applies - the build
runs unminified (no Terser, no Roadroller) so property names stay stable and
predictable.

An idle-battler where you climb an endless stack of clouds, fighting Stormlings
for loot and Magic Dust to upgrade your gear.

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
- `worker/` - Cloudflare Worker + KV backing the global leaderboard; deployed separately via `wrangler deploy`, not part of the zip build

## Architecture

- Everything renders as real DOM elements styled with CSS, not canvas. `helpers/dom.ts`'s `el()`/`mount()` build elements; components are plain functions/classes that return/mutate `HTMLElement`s.
- App state lives in `systems/state.ts` as `Signal`s (`systems/signals.ts`) - reactive values you `.subscribe()` to. State auto-saves to `localStorage` every 15s and on `beforeunload`, base64-encoded under one key.
- The game loop runs via `requestAnimationFrame` in `game/game.ts`'s `startGameLoop`, driving `systems/animation.ts` tweens each frame.
- `vite.config.ts` uses `js13k-vite-plugins`' `js13kViteConfig()` with Roadroller and minification disabled (`roadrollerOptions: false`, `viteOptions: { minify: false }`) - image/zip plugins still run but no longer gate anything.

## Hard constraints

- **Zero external resources bundled in the zip.** No CDNs, fonts, or analytics baked into the build. The leaderboard's runtime `fetch()` to the Cloudflare Worker (`src/systems/leaderboard.ts`) is a deliberate exception - no bundled asset, just an optional network call at play time.
- **No console errors** in latest Chrome and Firefox.
- Namespace the `localStorage` key in `systems/state.ts` (`STATE_KEY`) - games share one origin. Never `localStorage.clear()`.

## Working rules

- TypeScript throughout; `tsc` runs as part of `npm run build` and must pass.
- Build output is unminified on purpose: Terser's property mangler previously broke dynamic string-keyed object lookups (`RARITY_WEIGHTS[rarity]`, `state[key]`, `item.affixes[stat]`) since it can't trace runtime strings back to the literal keys it renames. Don't re-enable minification without addressing that.
- Prefer extending the existing `systems/`/`components/` patterns over introducing new ad-hoc globals.
- Reference docs: [docs/js13k-rules.md](docs/js13k-rules.md) - original competition rules, kept for historical context only.

## Git

Solo dev project: **commit directly to `main`**, no feature branches. Commit at each logical step.
