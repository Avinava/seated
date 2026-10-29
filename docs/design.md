# Design

## Principles

1. **The plan is the product.** The floor plan is the largest thing on screen and everything else is a rail around it. Guests, rules and auto-seat exist to make the plan right.
2. **Calm until it matters.** Warm neutrals and ink carry the interface. Colour marks meaning: the teal accent is "the lit seat" (focus, selection, the thing you just did), the four group tones tell sides apart, and red is reserved for conflicts.
3. **Every action is reversible.** Every change can be undone, and the toast that confirms it carries the Undo. That is why destructive actions rarely need a confirmation.
4. **Explain, don't just do.** Auto-seat says what it did and what it could not do, in plain words. Rules say what is true now ("Both are at T2"), not just that something is wrong.
5. **Everything works from the keyboard.** The pointer path and the keyboard path reach the same commands. The floor plan is real HTML with roles and names, not a canvas.

## Type

| Role    | Font                                                   | Use                                              |
| ------- | ------------------------------------------------------ | ------------------------------------------------ |
| Display | Bricolage Grotesque 600, tracking -0.03em              | Page titles, event names, the big "You're at T5" |
| UI      | Geist, 14px base                                       | Everything else                                  |
| Mono    | Geist Mono, 10.5 to 11.5px, uppercase, tracking 0.06em | Counts, dates, seat numbers, table fill (7/10)   |

Numbers use Indian grouping (1,00,000) and dates read "Fri 18 Dec".

## Colour

All colours are OKLCH tokens in `design/tokens.json`, each with a light and a dark value. Dark mode is not inverted light mode: the neutrals turn cool and the tones get lighter and less saturated so they read on a dark surface.

| Tone          | Meaning                                                            |
| ------------- | ------------------------------------------------------------------ |
| Accent (teal) | The lit seat: focus, selection, just placed, primary progress      |
| Group 1 to 4  | Teal, amber, plum, blue: sides or teams, as the event defines them |
| Ok (green)    | Coming, rule met                                                   |
| Warn (amber)  | Awaiting a reply, waiting rules, offline                           |
| Danger (red)  | Conflicts, declined, errors                                        |

## Seat states

A seat is a 30px circle with the guest's initials. Its border, ring and size change together, so colour is never the only signal.

| State       | Look                                                            |
| ----------- | --------------------------------------------------------------- |
| Empty       | 1.5px dashed border, no fill                                    |
| Filled      | Solid border and soft fill in the guest's tone                  |
| Drop target | Accent border and fill, scaled to 1.16                          |
| Picked up   | 3px accent ring                                                 |
| Conflict    | 2px danger border plus a 4px soft danger ring                   |
| Just placed | Pops in with a spring, then an 8px accent glow fades over 600ms |

## Motion

- **Spring** `cubic-bezier(0.3, 1.6, 0.5, 1)` for things arriving: a seat filling, a toast.
- **Settle** `cubic-bezier(0.2, 0.8, 0.2, 1)` for things moving into place: drawers, the glow fading.
- Durations are 120, 200 and 350ms, plus 600ms for the glow.
- With reduced motion, animations and transitions drop to near zero. Nothing waits on an animation to finish its logic.
- Loading uses skeletons that pulse, never spinners.

## Keyboard model

| Where          | Keys                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Anywhere       | `⌘K` palette, `⌘Z` undo, `⇧⌘Z` redo, `Esc` closes the top layer                                                   |
| Unseated list  | `Enter` or `Space` picks up a guest or a whole party                                                              |
| Floor plan     | `Tab` moves between tables, arrows move between seats, `Enter` drops or picks up, `Delete` unseats, `Esc` cancels |
| Selected table | Arrows nudge it, `Shift` moves it 10 times as far                                                                 |
| Plan           | `+`, `-` and `0` zoom in, zoom out and fit                                                                        |
| Guest grid     | Arrows move between rows, `Space` selects, `Shift` extends, `Enter` opens the guest                               |

Every pick-up, drop and refusal is announced through a polite live region.

## Accessibility

- WCAG 2.2 AA: axe runs on every story (both themes) and every route in the end-to-end tests.
- Accessible names come from visible text, so what you see is what a screen reader says.
- Hit areas are at least 44px where the layout allows; seats are 30px but a table is one tab stop with arrow keys inside.
- Focus is trapped in dialogs and drawers and returns to where it came from.
