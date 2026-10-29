# Rules and auto-seat

## Rules

An event carries explicit rules, and every table carries an implicit capacity rule.

| Rule                    | Conflict when                                                      | Waiting when           |
| ----------------------- | ------------------------------------------------------------------ | ---------------------- |
| Keep apart (two guests) | both sit at the same table                                         | either is unseated     |
| Keep together (a party) | members sit at different tables                                    | any member is unseated |
| Near the exit (a guest) | they sit at a table that is not near an exit                       | they are unseated      |
| Capacity (every table)  | more guests are assigned than the table seats, or two share a seat | never                  |

"Near the exit" is geometry, not a flag: a table counts when the edge of its footprint, seats included, is within 160 plan units of an exit zone. Moving a table can therefore satisfy or break the rule, and the warnings update live.

Declined and deleted guests drop out of rules. Marking a guest as needing step-free access adds the matching near-exit rule, and clearing it removes the rule.

`evaluate(event)` returns every check with its status, the guests and tables involved, and lookups by guest and table so the floor plan can mark conflicted seats without searching.

## Auto-seat

`autoSeat(event, { includePending })` seats unseated guests who are coming (and, optionally, those who have not replied). It never moves anyone who already has a seat.

1. **Units.** Unseated guests are grouped into units: a party is one unit, so it lands at one table or not at all.
2. **Order.** Units that need the exit go first, then larger units, then by name. Tight constraints are placed while there is still room.
3. **Choice of table.** For each unit, candidate tables are those with enough free seats that would not create a keep-apart, near-exit or capacity conflict. If some of the party already sits somewhere, only their table is a candidate. Otherwise the solver prefers the table holding the most guests from the same group (bride's family with bride's family), then the emptiest, then plan order. The head table ranks last, so it is used only when nothing else fits.
4. **Repair.** If a party cannot fit, a bounded pass tries moving single guests the solver placed in this run to make room.
5. **Explain.** Every placement and every failure is recorded as a structured line (`placed-party`, `placed-guest`, `placed-near-exit`, `kept-apart`, `made-room`, `needs-you`). The app shows "Needs you" lines first, each linked to the guest.

The whole run is one command, so one Undo puts everything back.

## Tests

- Rule statuses are table-driven for every kind and status.
- Solver properties run over 40 random events and 5 sample seeds: no new conflicts, parties never split, seated guests untouched, same output for the same input.
- The sample wedding opens with exactly one conflict (Dev Malhotra and Rohan Kapoor at the same table), so the demo has something to fix.
