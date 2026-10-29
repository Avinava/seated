# Seated

An event seating planner and a portfolio piece: who's coming, what they eat and where they sit. Angular 22, zoneless and signal-first, with everything stored in the browser.

## Layout

| Path                  | What lives there                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `design/tokens.json`  | The single source for colour (light and dark), type, space, radius, size, motion and z-index.                                             |
| `design/README.md`    | The frame map: every screen state, its route and fixture, and its screenshot file.                                                        |
| `libs/domain`         | Pure TypeScript: model, geometry, edit ops, rules engine, auto-seat solver, CSV import, export and share formats, sample data.            |
| `libs/kit`            | The design kit: generated tokens, global styles, one component per folder with a spec and stories, Storybook config.                      |
| `apps/seated/src/app` | `core/` (storage, history, theme, hotkeys, clock), `state/` (event store), `shell/`, `features/<name>/`, `i18n/` (messages).              |
| `e2e`                 | Playwright flows, axe checks, the screenshot and clip renderer (`shots/`) and kit visual regression (`visual/`).                          |
| `tools`               | `gen-tokens.ts`, `gate.sh`, `build-site.sh`, `serve-static.ts`, `shots.sh`, `record.sh`, `visual.sh`, `lighthouse.ts`, `render-icons.ts`. |
| `docs`                | Architecture, design, rules and solver notes, screenshots, media.                                                                         |

Layers only point down: `apps` -> `libs/kit` -> `libs/domain`. ESLint enforces it.

## Commands

| Task                    | Command                                     |
| ----------------------- | ------------------------------------------- |
| Serve the app           | `mise run app`                              |
| Everything for a commit | `mise run gate`                             |
| Unit tests              | `mise run test`                             |
| Regenerate tokens       | `mise run gen`                              |
| Design kit (Storybook)  | `mise run kit`                              |
| Kit stories and axe     | `mise run kit-test`                         |
| E2E flows and axe       | `mise run e2e`                              |
| README screenshots      | `mise run shots`                            |
| README clip (ffmpeg)    | `mise run record`                           |
| Kit visual (Docker)     | `mise run visual`, `mise run visual-update` |
| Lighthouse budgets      | `mise run lighthouse`                       |
| GitHub Pages build      | `mise run site`                             |

## Rules

- **Design is the source of truth.** Every screen maps to a frame in `design/README.md`. UI work follows the `ui-change` skill in `.claude/skills/ui-change/SKILL.md`.
- **Tokens live only in `design/tokens.json`.** Never hand-edit `libs/kit/src/tokens/tokens.g.*`; run `mise run gen`. The gate fails on stale tokens.
- **No raw style in the app.** No hex, `oklch(`, `rgb(` or `font-family` under `apps/`. The gate enforces this; use kit components and `--st-*` tokens.
- **The kit is presentational.** It never imports the app or a store. Components take plain view models. One public component per folder, each with a spec and stories.
- **The domain is framework-free.** No Angular, RxJS or NgRx in `libs/domain`. Domain functions return data and codes, never English sentences; the app formats text with `$localize`.
- **Every change is a command.** Edits go through the event store's `execute`, which records before and after snapshots for undo. Never patch the doc directly.
- **Angular style.** Standalone, `OnPush`, signal inputs and outputs, `inject()`, `host` metadata, built-in control flow, no zone.js.
- **Accessibility is a feature.** Real buttons, labels, roles and live announcements. Everything that works with a pointer works from the keyboard. Colour is never the only signal.
- **Tests.** Domain logic gets table-driven tests and holds 90% coverage. Kit components get a spec and interaction stories. Flows get Playwright tests with axe.
- **Fixed clock.** Screenshots and e2e tests run at 29 Oct 2026 with sample seed 1.

## Git and writing

- Branch before committing to `main` once the repo is public. Never use `--no-verify`.
- Short, imperative commit subjects. No co-author or tool attribution.
- Run the `privacy-scan` skill before any push, tag or Pages deploy.
- No em dashes, straight quotes, Indian number grouping, prices in INR.
