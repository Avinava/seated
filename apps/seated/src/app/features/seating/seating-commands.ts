import { Injectable, inject } from '@angular/core';
import {
  addRule,
  addTable,
  autoSeat,
  guestAt,
  moveTable,
  ok,
  removeRule,
  removeTable,
  resizeTable,
  rotateTable,
  seatGuests,
  unseatGuests,
  type GuestId,
  type RuleDraft,
  type RuleId,
  type SeatRef,
  type TableId,
  type TableShape,
} from '@seated/domain';
import { Announcer } from '@seated/kit';
import { count, plural } from '../../i18n/messages';
import { Actions } from '../../state/actions';
import { command } from '../../state/command';
import { EventStore } from '../../state/event-store';
import { SeatingStore, type DropTarget } from './seating.store';
import {
  NEW_TABLE,
  autoSummary,
  findFreeSpot,
  guestPayload,
  holdingMessage,
  landedSeats,
  seatKey,
  snap,
  type Payload,
} from './seating.vm';

/** Rapid arrow-key nudges of one table within this window become one undo step. */
const NUDGE_WINDOW_MS = 1200;

/**
 * Every edit the seating screen makes, phrased once. Each goes through
 * Actions.run as one command, so it is undoable, saved and announced; the
 * seating store only learns the view side effects (glow, what is held).
 */
@Injectable()
export class SeatingCommands {
  private readonly events = inject(EventStore);
  private readonly actions = inject(Actions);
  private readonly view = inject(SeatingStore);
  private readonly announcer = inject(Announcer);

  private lastNudge: { tableId: TableId; at: number; label: string; doc: unknown } | null = null;

  private tableLabel(tableId: TableId): string {
    return this.events.tablesById().get(tableId)?.label ?? tableId;
  }

  /** Pick up a payload and say what to do next. */
  pickUp(payload: Payload): void {
    this.view.pickUp(payload);
    void this.announcer.announce(holdingMessage(payload));
  }

  cancel(): void {
    const held = this.view.cancel();
    if (held) void this.announcer.announce($localize`:@@hold.cancel:Put ${held.label}:who: back. Nothing moved.`);
  }

  /**
   * A seat was activated (click, Enter or Space). With something held it is
   * the drop; otherwise a filled seat picks its guest up and an empty one
   * selects the table.
   */
  activateSeat(seat: SeatRef): void {
    const payload = this.view.held();
    if (payload) {
      this.drop(payload, { kind: 'seat', seat });
      return;
    }
    const guest = guestAt(seat, this.events.guests());
    if (guest) this.pickUp(guestPayload(guest));
    else this.view.select(seat.tableId);
  }

  /** Put a payload down on a target. Returns true when something changed. */
  drop(payload: Payload, target: DropTarget): boolean {
    if (target.kind === 'unseated') {
      const seated = payload.guestIds.filter((id) => this.events.guestsById().get(id)?.seat);
      this.view.cancel();
      if (seated.length === 0) return false;
      return this.unseat(seated, payload.label);
    }
    const { seat } = target;
    if (payload.from && seatKey(payload.from) === seatKey(seat)) {
      this.view.cancel();
      return false;
    }
    const table = this.tableLabel(seat.tableId);
    const who = payload.label;
    const moving = payload.from !== null;
    const label = moving
      ? $localize`:@@cmd.move:move ${who}:who: to ${table}:table:`
      : $localize`:@@cmd.seat:seat ${who}:who: at ${table}:table:`;
    const done = moving
      ? $localize`:@@done.move:Moved ${who}:who: to ${table}:table:, seat ${seat.index + 1}:n:`
      : $localize`:@@done.seat:Seated ${who}:who: at ${table}:table:`;
    const result = this.actions.run(
      command(label, (e) => seatGuests(e, payload.guestIds, seat)),
      done,
    );
    if (!result.ok) return false;
    this.view.cancel();
    this.view.markPlaced(landedSeats(result.event, payload.guestIds));
    return true;
  }

  unseat(guestIds: readonly GuestId[], who: string): boolean {
    const result = this.actions.run(
      command($localize`:@@cmd.unseat:unseat ${who}:who:`, (e) => unseatGuests(e, guestIds)),
      $localize`:@@done.unseat:Moved ${who}:who: back to unseated`,
    );
    return result.ok;
  }

  unseatAt(seat: SeatRef): void {
    const guest = guestAt(seat, this.events.guests());
    if (guest) this.unseat([guest.id], guest.name);
  }

  /** Commit a dragged table at its new centre, snapped to 10 units. */
  moveTable(tableId: TableId, x: number, y: number): void {
    const t = this.tableLabel(tableId);
    const [sx, sy] = [snap(x), snap(y)];
    this.lastNudge = null;
    this.actions.run(
      command($localize`:@@cmd.moveTable:move ${t}:table:`, (e) => moveTable(e, tableId, sx, sy)),
      $localize`:@@done.moveTable:Moved ${t}:table:`,
    );
  }

  /** Arrow-key nudge. Rapid nudges of the same table coalesce into one undo step. */
  nudge(tableId: TableId, dx: number, dy: number): void {
    const table = this.events.tablesById().get(tableId);
    if (!table) return;
    const t = table.label;
    const label = $localize`:@@cmd.nudgeTable:move ${t}:table:`;
    const now = performance.now();
    const last = this.lastNudge;
    const x = table.x + dx;
    const y = table.y + dy;
    if (
      last?.tableId === tableId &&
      now - last.at < NUDGE_WINDOW_MS &&
      last.doc === this.events.doc() &&
      this.events.undoLabel() === last.label
    ) {
      this.events.undo();
    }
    const result = this.actions.run(command(label, (e) => moveTable(e, tableId, x, y)));
    if (!result.ok) return;
    this.lastNudge = { tableId, at: now, label, doc: this.events.doc() };
    const moved = result.event.tables.find((x) => x.id === tableId);
    if (moved) void this.announcer.announce($localize`:@@done.nudge:${t}:table: at ${moved.x}:x:, ${moved.y}:y:`);
  }

  addTable(shape: TableShape): TableId | null {
    const doc = this.events.doc();
    if (!doc) return null;
    const seats = NEW_TABLE[shape];
    const spot = findFreeSpot(doc, shape, seats);
    let id: TableId | null = null;
    const result = this.actions.run(
      command($localize`:@@cmd.addTable:add a table`, (e) => {
        const r = addTable(e, { shape, seats, ...spot });
        if (r.ok) id = r.id;
        return r;
      }),
      $localize`:@@done.addTable:Added a table with ${seats}:n: seats`,
    );
    if (result.ok && id) this.view.select(id);
    return result.ok ? id : null;
  }

  resize(tableId: TableId, seats: number): void {
    const t = this.tableLabel(tableId);
    this.actions.run(
      command($localize`:@@cmd.resize:resize ${t}:table:`, (e) => resizeTable(e, tableId, seats)),
      $localize`:@@done.resize:${t}:table: now seats ${seats}:n:`,
    );
  }

  rotate(tableId: TableId): void {
    const t = this.tableLabel(tableId);
    this.actions.run(
      command($localize`:@@cmd.rotate:turn ${t}:table:`, (e) => rotateTable(e, tableId)),
      $localize`:@@done.rotate:Turned ${t}:table:`,
    );
  }

  removeTable(tableId: TableId): void {
    const t = this.tableLabel(tableId);
    const result = this.actions.run(
      command($localize`:@@cmd.removeTable:remove ${t}:table:`, (e) => removeTable(e, tableId)),
      $localize`:@@done.removeTable:Removed ${t}:table:. Its guests are back in the unseated list.`,
    );
    if (result.ok && this.view.selectedTableId() === tableId) this.view.select(null);
  }

  /** Run the solver as one command and show what it did in the rail. */
  autoSeat(): void {
    const doc = this.events.doc();
    if (!doc) return;
    const options = { includePending: this.view.includePending() };
    let run = autoSeat(doc, options);
    const n = run.placed.length;
    if (n === 0) {
      this.view.showSummary(autoSummary(doc, 0, run.explanation));
      void this.announcer.announce($localize`:@@auto.noneSpoken:Nobody new to seat.`);
      return;
    }
    const guests = `${count(n)} ${plural(n, 'guest', 'guests')}`;
    const result = this.actions.run(
      command($localize`:@@cmd.auto:auto-seat ${guests}:guests:`, (e) => {
        run = autoSeat(e, options);
        return ok(run.event);
      }),
      $localize`:@@done.auto:Auto-seated ${guests}:guests:`,
    );
    if (!result.ok) return;
    this.view.showSummary(autoSummary(result.event, run.placed.length, run.explanation));
    this.view.markPlaced(landedSeats(result.event, run.placed));
  }

  addRule(draft: RuleDraft, title: string): boolean {
    const result = this.actions.run(
      command($localize`:@@cmd.addRule:add rule "${title}":rule:`, (e) => addRule(e, draft)),
      $localize`:@@done.addRule:Added rule: ${title}:rule:`,
    );
    return result.ok;
  }

  removeRule(ruleId: RuleId, title: string): void {
    this.actions.run(
      command($localize`:@@cmd.removeRule:remove rule "${title}":rule:`, (e) => removeRule(e, ruleId)),
      $localize`:@@done.removeRule:Removed rule: ${title}:rule:`,
    );
    if (this.view.activeRuleId() === ruleId) this.view.highlightRule(null, [], null);
  }
}
