<div align="center">

# Seated

**Who's coming, what they eat and where they sit.**

An event seating planner for weddings, birthdays and office dinners. Built with Angular 22, zoneless and signal-first. Everything stays in your browser: no account, no server.

[![Gate](https://github.com/Avinava/seated/actions/workflows/gate.yml/badge.svg)](https://github.com/Avinava/seated/actions/workflows/gate.yml)
![Angular 22](https://img.shields.io/badge/Angular-22-181E24)
![Zoneless](https://img.shields.io/badge/zoneless-signals-0F8A83)
![License MIT](https://img.shields.io/badge/license-MIT-6B6F76)

<img src="docs/screenshots/hero.png" alt="The seating screen: unseated households on the left, the floor plan with round, long and head tables in the middle, and the rules rail on the right. The Boses are picked up and Long B shows where they would land." width="100%">

**[Try the demo](https://avinava.github.io/seated/)** · **[Browse the design kit](https://avinava.github.io/seated/kit/)**

</div>

## The idea

A seating plan is a puzzle with people in it. Households want to sit together, two cousins must not, a grandmother needs a seat by the step-free exit, and the caterer wants to know how many Jain meals go to table 6.

Seated keeps the guest list, the floor plan and those rules in one place. Drag a family onto a table and the whole family moves. Break a rule and the plan says which one, and why. Ask it to fill the empty seats and it does, explains what it did, and lets you undo the lot. When the plan is done, guests get a link where they type their name and see their table, and the venue gets place cards and a table list.

<img src="docs/media/seating.gif" alt="Dragging a household onto a long table, finding a keep-apart conflict, fixing it from the keyboard, running auto-seat, then undo and redo." width="100%">

## Screens

Every image below is rendered from the production build by `mise run shots`, with the sample wedding on Thu 29 Oct 2026. The frame map is in [`design/README.md`](design/README.md).

### Planning

|                         2a Events                          |                          2b Guests                           |                          2c Guest panel                           |
| :--------------------------------------------------------: | :----------------------------------------------------------: | :---------------------------------------------------------------: |
| <img src="docs/screenshots/2a_home_light.png" width="280"> | <img src="docs/screenshots/2b_guests_light.png" width="280"> | <img src="docs/screenshots/2c_guest-panel_light.png" width="280"> |
|          Countdown, replies and seats per event.           |          Grouped by party, filters live in the URL.          |          A typed form with cross-field and async checks.          |

### Seating

|                         2d Floor plan                         |                          2e Holding a party                           |                          2f Conflict                           |
| :-----------------------------------------------------------: | :-------------------------------------------------------------------: | :------------------------------------------------------------: |
| <img src="docs/screenshots/2d_seating_light.png" width="280"> | <img src="docs/screenshots/2e_seating-holding_light.png" width="280"> | <img src="docs/screenshots/2f_conflict_light.png" width="280"> |
|              84 of 100 seated, one rule broken.               |           Picked up from the keyboard, with a drop preview.           |        The rule says what is true now: both are at T3.         |

|                          2g Auto-seat                           |                          2q Just placed                           |                               2r Phone                               |
| :-------------------------------------------------------------: | :---------------------------------------------------------------: | :------------------------------------------------------------------: |
| <img src="docs/screenshots/2g_auto-seat_light.png" width="280"> | <img src="docs/screenshots/2q_just-placed_light.png" width="280"> | <img src="docs/screenshots/2r_seating-narrow_light.png" width="140"> |
|              Fills the gaps, then explains itself.              |         Seats pop in and glow, unless motion is reduced.          |                        Rails become drawers.                         |

### Import, share and print

|                          2h Import review                           |                          2i Share                           |                        2j Find your seat                        |                          2k Place cards                           |
| :-----------------------------------------------------------------: | :---------------------------------------------------------: | :-------------------------------------------------------------: | :---------------------------------------------------------------: |
| <img src="docs/screenshots/2h_import-review_light.png" width="220"> | <img src="docs/screenshots/2i_share_light.png" width="220"> | <img src="docs/screenshots/2j_find-seat_light.png" width="110"> | <img src="docs/screenshots/2k_place-cards_light.png" width="220"> |
|      Bad rows and duplicates flagged before anything changes.       |          A link and QR code, with a live preview.           |           Guests type their name and see their table.           |              Fold-ready cards and a caterer's list.               |

### Dark

|                         2m Events                         |                          2n Seating                          |                          2o Guests                          |                       2p Find your seat                        |
| :-------------------------------------------------------: | :----------------------------------------------------------: | :---------------------------------------------------------: | :------------------------------------------------------------: |
| <img src="docs/screenshots/2m_home_dark.png" width="220"> | <img src="docs/screenshots/2n_seating_dark.png" width="220"> | <img src="docs/screenshots/2o_guests_dark.png" width="220"> | <img src="docs/screenshots/2p_find-seat_dark.png" width="110"> |

<details>
<summary>2l Brand kit</summary>
<img src="docs/screenshots/2l_brand_light.png" alt="The brand kit page: logo, colour tokens in light and dark, type roles and seat states." width="100%">
</details>

## What this demonstrates

- **Modern Angular, all the way down.** Standalone components, `OnPush` everywhere, signal `input()`/`output()`/`model()`, `computed`, `linkedSignal` and `resource()`, the built-in control flow, `@defer` for the floor plan and the import wizard, and no zone.js. Routes are lazy, and route and query params bind straight to component inputs, so a filtered guest list or an open guest panel is a link you can share.
- **State you can undo.** One SignalStore holds the open event. Every change is a [`Command`](apps/seated/src/app/state/command.ts) of a label plus a pure domain op, run through [`Actions`](apps/seated/src/app/state/actions.ts), which applies it, records it, shows a toast with Undo and announces it. Undo and redo come from [`withHistory()`](apps/seated/src/app/core/history/with-history.ts), a reusable SignalStore feature that keeps structurally shared snapshots.
- **A floor plan that is real HTML.** Tables are labelled groups, seats are buttons with a roving tab stop, and every pointer action has a keyboard twin: pick up with Enter, move, drop with Enter, cancel with Escape. Guests drag with the CDK and a hit-tested drop resolver ([`seating-drag.ts`](apps/seated/src/app/features/seating/seating-drag.ts)); tables drag with a CDK `DragRef` that respects zoom. Rapid nudges of a table coalesce into one undo step.
- **A rules engine and a solver with no framework in them.** [`libs/domain`](libs/domain/src) is plain TypeScript: [`evaluate`](libs/domain/src/rules/evaluate.ts) reports every rule as met, waiting or in conflict, and [`autoSeat`](libs/domain/src/solver/auto-seat.ts) fills seats without breaking any of them, then explains each decision. Both return codes, not sentences; the app words them with `$localize` in [`messages.ts`](apps/seated/src/app/i18n/messages.ts). 350 table-driven tests and property checks across seeds hold the domain at 98% line coverage. See [`docs/rules-and-solver.md`](docs/rules-and-solver.md).
- **Forms that check what matters.** The [guest form](apps/seated/src/app/features/guests/guest-form.ts) is a typed reactive form with a dynamic list of plus-ones, a cross-field rule (an "Other" meal needs a note) and a debounced async check for duplicate emails. Saving it is one command, so one Undo reverts the guest, their plus-ones and their access rule together.
- **A design system with a token pipeline.** [`design/tokens.json`](design/tokens.json) holds every colour (OKLCH, light and dark), size, radius and timing; [`gen-tokens.ts`](tools/gen-tokens.ts) generates the kit's CSS variables, and the gate fails if they are stale or if the app uses a raw colour or font. The [kit](libs/kit/src/lib) has one component per folder, each with a spec and Storybook stories: a virtualised [data grid](libs/kit/src/lib/data/data-grid), a [command palette](libs/kit/src/lib/overlay/command-palette), drawers, toasts, and the [seat and table](libs/kit/src/lib/seating/table/table.ts) the floor plan is made of.
- **Tested at every layer.** Vitest for the domain, kit and app (more than 900 tests). Storybook `play` functions run as interaction tests with an axe scan in both themes. Playwright drives the main flows (import, seat by mouse and by keyboard, conflict, auto-seat, undo, share, the palette, offline, print), runs axe on every route, and renders the screenshots above. Kit stories are pixel-compared inside a pinned Playwright image so macOS and CI agree. Lighthouse holds the public pages at 0.99 or better for performance and 1.0 for accessibility.
- **The web platform.** An installable PWA that works offline after the first visit; IndexedDB storage behind a repository interface; versioned export files with a migration table; the public pages prerendered; a share link that carries names and tables only, compressed into the URL hash; a [QR encoder](apps/seated/src/app/features/share/qr.ts) written from the spec; print styles for place cards; Indian number grouping throughout.

## Design

- **Calm until it matters.** Warm paper neutrals and ink, with one teal accent for "the lit seat": focus, selection and what you just did. Four group tones tell sides apart, and red is kept for conflicts.
- **Type.** Bricolage Grotesque for display, Geist for the interface, Geist Mono for counts, dates and seat numbers.
- **Seat states** change border, ring and size together, so colour is never the only signal.
- **Further reading.** Principles, seat states, motion, the keyboard model and accessibility are in [`docs/design.md`](docs/design.md); the layers are in [`docs/architecture.md`](docs/architecture.md).

## Run it

```sh
mise install          # Node and pnpm, pinned in .mise.toml
pnpm install
mise run app          # the app at http://localhost:4200
mise run kit          # the design kit (Storybook) at http://localhost:6006
mise run gate         # format, lint, types, unit, Storybook, e2e, visual, Lighthouse, budgets
mise run shots        # re-render docs/screenshots
mise run site         # app and Storybook for GitHub Pages, into dist/site
```

The workspace has three parts: `apps/seated` (the app), `libs/kit` (the design system) and `libs/domain` (rules, solver, formats). [`AGENTS.md`](AGENTS.md) has the conventions.

## Privacy

Everything stays in your browser. Seated has no account, no server and no analytics. Export gives you the whole event as a JSON file, and a share link carries only names and tables.

## Licence

The code is [MIT](LICENSE). The fonts (Bricolage Grotesque, Geist, Geist Mono) are under the SIL Open Font License and ship through Fontsource.
