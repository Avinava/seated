---
name: ui-change
description: Add or change a screen, state or kit component in Seated so it stays aligned with the design. Use for any work under libs/kit, apps/seated/src/app/features or shell, and whenever a design frame (2a to 2r) changes.
---

# Changing Seated's UI

The spec is `design/tokens.json`, the frame map in `design/README.md` and `docs/design.md`. Every change keeps four things in step: the kit component, its stories, the screen and the README screenshots.

## 1. Find the frame

Open `design/README.md`, find the frame (2a to 2r), its route and fixture. Read the matching rules in `docs/design.md` (seat states, motion, keyboard model).

## 2. Tokens first

New or changed colours, sizes, radii or timings go in `design/tokens.json`, then `mise run gen`. Never type a colour or font in a component; the gate rejects hex, `oklch(`, `rgb(` and `font-family` under `apps/`.

## 3. Build in the kit

- One public component per folder under `libs/kit/src/lib/<group>/<name>/`, exported from `public-api.ts`.
- Standalone, `OnPush`, signal `input()`/`output()`/`model()`, `host` metadata, no app or store imports.
- Take a plain view model (`SeatView`, `PaletteItem`), never a domain entity.
- Real buttons and labels, visible focus, keyboard support, accessible names from visible text. Colour is never the only signal.
- Check both themes and reduced motion with the Storybook toolbar.
- Add a spec and stories; interactive stories get a `play` function.

## 4. Wire the app

- Logic and copy live in pure `*.vm.ts` functions with table-driven specs; components only lay out kit parts.
- Every change to event data is a `Command` run through `Actions.run`, so it is undoable and announced.
- All user-visible text uses `$localize` or `i18n` attributes.
- Filters and open panels belong in the URL (query params bound to inputs).

## 5. Verify

1. `mise run gate` must pass (format, lint, types, unit tests, Storybook interaction and axe tests, e2e, budgets).
2. `mise run shots` re-renders `docs/screenshots`; open the changed PNGs and check that only the intended change moved.
3. Look at the screen at 390px, about 860px and 1280px, in both themes, and use it with the keyboard alone.
4. Record layout decisions in `design/README.md` and behaviour rules in `docs/design.md`.
