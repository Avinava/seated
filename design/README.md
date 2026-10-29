# Frames

Every screen state worth showing, the route that opens it and the file it renders to. The source of truth is `e2e/shots/frames.ts`; `mise run shots` renders each frame against the production build into `docs/screenshots/<id>_<name>_<theme>.png`, then shrinks the files with `pngquant` when it is installed.

All frames use the sample events seeded on first run (seed 1), a fresh browser profile, the clock fixed at Thu 29 Oct 2026 10:00 IST, locale `en-IN` and reduced motion, except 2q, which shows motion.

## Frame map

| Frame  | Name           | Route                                   | Preset and setup                                                         | File                           |
| ------ | -------------- | --------------------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| 2a     | Home           | `/`                                     | First visit: the three sample events                                     | `2a_home_light.png`            |
| 2b     | Guests         | `/events/ev-wedding/guests?by=party`    | Guest list grouped by party                                              | `2b_guests_light.png`          |
| 2c     | Guest panel    | `/events/ev-wedding/guests?guest=g-009` | Guest panel open on Kamla Mehta                                          | `2c_guest-panel_light.png`     |
| 2d     | Seating        | `/events/ev-wedding/seating`            | As seeded: 84/100 seated, one conflict                                   | `2d_seating_light.png`         |
| 2e     | Holding        | `/events/ev-wedding/seating`            | The Boses picked up by keyboard, aimed at Long B seat 2 (drop preview)   | `2e_seating-holding_light.png` |
| 2f     | Conflict       | `/events/ev-wedding/seating`            | Keep-apart rule selected: Dev and Rohan highlighted at T3                | `2f_conflict_light.png`        |
| 2g     | Auto-seat      | `/events/ev-wedding/seating`            | After Auto-seat: 100/100 and the summary in the rail                     | `2g_auto-seat_light.png`       |
| 2h     | Import review  | `/events/ev-wedding/import`             | Sample CSV mapped and in review: problems and duplicates flagged         | `2h_import-review_light.png`   |
| 2i     | Share          | `/events/ev-wedding/share`              | Link, QR card and live phone preview                                     | `2i_share_light.png`           |
| 2j     | Find your seat | `/s#<link>` at 390px                    | Public guest page from the share link, Kamla found                       | `2j_find-seat_light.png`       |
| 2k     | Place cards    | `/events/ev-wedding/print`              | Place cards for every seated guest                                       | `2k_place-cards_light.png`     |
| 2l     | Brand kit      | `/brand`                                | Logo, colour, type and seat states                                       | `2l_brand_light.png`           |
| 2m     | Home           | `/`                                     | As 2a                                                                    | `2m_home_dark.png`             |
| 2n     | Seating        | `/events/ev-wedding/seating`            | As 2d                                                                    | `2n_seating_dark.png`          |
| 2o     | Guests         | `/events/ev-wedding/guests?by=party`    | As 2b                                                                    | `2o_guests_dark.png`           |
| 2p     | Find your seat | `/s#<link>` at 390px                    | As 2j                                                                    | `2p_find-seat_dark.png`        |
| 2q     | Just placed    | `/events/ev-wedding/seating`            | Zoomed to 100%, the Kauls dropped on Long B, caught mid-glow (motion on) | `2q_just-placed_light.png`     |
| 2r     | Seating narrow | `/events/ev-wedding/seating` at 390px   | List and rail become drawers                                             | `2r_seating-narrow_light.png`  |
| Hero   | Hero           | `/events/ev-wedding/seating`            | 1600 x 1000, as 2e                                                       | `hero.png`                     |
| Social | Social preview | `/events/ev-wedding/seating`            | 1280 x 640 at 1x, as 2e; the GitHub social preview                       | `social_preview.png`           |

Desktop frames are 1440 x 900 and phone frames 390 x 844. Everything renders at device scale 2 except the social preview.

## Layout

- **Shell.** A 228px sidebar (`--st-size-sidebar`) and the page. At 860px and below the sidebar becomes a top bar: the event switcher, save label and search label hide, search shrinks to an icon button and the nav scrolls sideways.
- **Seating.** Three columns: the unseated list (272px), the floor plan, and the rules rail (300px, `--st-size-rail`).
  - Below 1360px the rail becomes a drawer opened from a Rules button, which carries a dot while there is a conflict; the list narrows to 248px and the colour toggle moves into the drawer.
  - At 1100px and below the header drops the venue subtitle and the "n/m seated" figure.
  - At 860px and below the page stops filling the viewport and the plan area is 74dvh tall.
  - Below 760px the unseated list becomes a drawer opened from an Unseated button, and the header wraps.
  - The plan zooms to fit its stage (Fit); `+`, `-` and `0` zoom in, out and back to fit.
- **Guests.** The toolbar wraps; at 860px and below the side padding tightens and search takes the full width.
- **Share.** Controls and the phone preview sit side by side; at 1100px and below they stack.
- **Find your seat.** One column, at most 520px wide, centred.
- **Print.** App chrome (`data-noprint`) is hidden; place cards print two across.
