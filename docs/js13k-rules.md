# js13kGames 2026 Rules

Source: https://js13kgames.com/2026/rules (extracted 2026-08-11). 15th edition.

## Deadlines (all 13:00 CEST)

| Event | Date |
| --- | --- |
| Competition | 13 August 2026 -> 13 September 2026 |
| Theme announced | 13 August 2026, 13:00 CEST |
| Unfinished drafts may still be submitted | 14 September 2026 |
| Bugfix PRs (minor issues only) | 14 September 2026 |
| Voting period, critical-issue PRs allowed | 14 September -> 4 October 2026 |

Unsubmitted drafts are deleted after the submission deadline.

## Hard requirements

1. **13,312 bytes max** (13 x 1024). The `.zip` archive must contain `index.html` in the top-level directory and be playable straight from unzipping.
2. **No external resources.** All assets, data, and code live inside the zip. Relying on anything external excludes the game from the overall ranking. No Google Fonts, no analytics, no CDNs.
3. **Theme** is a rating criterion and affects score, but interpretation is free.
4. **Two sources required on submission**: the playable zip, and a public GitHub repo with readable, unmangled source that can actually build the game (not just an unzipped copy). The repo gets cloned into the js13kGames GitHub org.
5. **Must work with no console errors** in latest Chrome and Firefox. Other runtime errors hurt ratings but do not disqualify.
6. **Namespace localStorage keys.** All games share one origin. Never call `localStorage.clear()`.
7. **New content only.** No old games/demos, no tutorial clones. Enriching with pre-existing assets is fine if the rights are held.
8. **Rights to every asset** must be held.

## Categories

Base categories fully covered by the rules above: **Desktop** and **Mobile**. Extra-rules categories: Online (server allowed), WebXR, Web Monetization, Decentralized. Some category rules are mutually exclusive.

## Submission mechanics

- GitHub account required; log in to the site with it.
- A draft can be registered and previewed live before full submission. Only one open draft at a time.
- Unlimited number of submissions, but the same game cannot be submitted twice targeting different platforms (no separate desktop and mobile builds of one game).
- Manual review takes a couple of days; rejection is possible without a stated reason.
- Work past the submission deadline is allowed; a snapshot of the submitted version is kept.

## Tech constraints from the FAQ

- Only `.zip`, unpackable on any platform with a standard archiver.
- No plugins/extensions required from the player. Browser-runnable only.
- TypeScript, WASM, Rust are allowed as long as the shipped package is browser-runnable code and includes an actual HTML page.
- WebGL/WebGPU allowed.
- Live-loading a web font is tolerated only as a fallback for emoji/character support; the game must work without it.

## Licensing / IP

Entrants retain ownership. Submitting grants the organizer a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use, reproduce, adapt, publish, distribute, perform, derive from, and display the submission. Submissions are provided as-is with no warranty.

## Code of conduct

Harassment-free competition, Berlin Code of Conduct. Violations can lead to expulsion.
