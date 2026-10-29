import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import type { GuestId, SeatRef, TableId } from '@seated/domain';
import { seatKey, type AutoSummary, type ColorBy, type Payload, type SeatKey } from './seating.vm';

/** Where a drop would go: a seat on the plan, or back to the unseated list. */
export type DropTarget = { readonly kind: 'seat'; readonly seat: SeatRef } | { readonly kind: 'unseated' };

export const ZOOM = { min: 0.25, max: 1.6, step: 0.1 } as const;

/** The plan's margin inside the floor's scroll box (st-floor pads the plane by --st-space-6 each side). */
const FIT_PADDING = 48;

/** How long a placed seat keeps its glow; matches --st-dur-glow with room for the pop. */
export const GLOW_MS = 900;

interface SeatingState {
  /** Picked up with Enter or a click, waiting for a seat. */
  held: Payload | null;
  /** Being dragged with a pointer right now. */
  dragging: Payload | null;
  /** Pointer position of a seat drag, for the floating chip. */
  pointer: { x: number; y: number } | null;
  /** The seat (or list) the held or dragged guests are over. */
  target: DropTarget | null;
  selectedTableId: TableId | null;
  /** Guests singled out from a rule or the palette. */
  highlight: readonly GuestId[];
  /** The rule whose people are highlighted. */
  activeRuleId: string | null;
  colorBy: ColorBy;
  /** A fixed zoom, or null to fit the plan to the viewport. */
  zoom: number | null;
  viewport: { w: number; h: number };
  plan: { w: number; h: number };
  justPlaced: readonly SeatKey[];
  filter: string;
  listOpen: boolean;
  railOpen: boolean;
  includePending: boolean;
  summary: AutoSummary | null;
  /** An unseated guest to bring into view and focus in the list. */
  focusGuestId: GuestId | null;
}

const initial: SeatingState = {
  held: null,
  dragging: null,
  pointer: null,
  target: null,
  selectedTableId: null,
  highlight: [],
  activeRuleId: null,
  colorBy: 'group',
  zoom: null,
  viewport: { w: 0, h: 0 },
  plan: { w: 1180, h: 700 },
  justPlaced: [],
  filter: '',
  listOpen: false,
  railOpen: false,
  includePending: false,
  summary: null,
  focusGuestId: null,
};

function clampZoom(z: number): number {
  return Math.round(Math.min(ZOOM.max, Math.max(ZOOM.min, z)) * 100) / 100;
}

/** The zoom that shows the whole plan in a viewport, never above 100%. */
export function fitZoom(viewport: { w: number; h: number }, plan: { w: number; h: number }): number {
  if (viewport.w <= 0 || viewport.h <= 0) return 1;
  const z = Math.min((viewport.w - FIT_PADDING) / plan.w, (viewport.h - FIT_PADDING) / plan.h, 1);
  return clampZoom(z);
}

/**
 * View state for the seating screen only: what is held, hovered, selected and
 * how the plan is shown. The event itself stays in EventStore and changes only
 * through commands. Provided by the page, so it resets when you leave.
 */
export const SeatingStore = signalStore(
  withState<SeatingState>(initial),
  withComputed((s) => {
    const fit = computed(() => fitZoom(s.viewport(), s.plan()));
    const payload = computed(() => s.dragging() ?? s.held());
    return {
      fit,
      payload,
      effectiveZoom: computed(() => s.zoom() ?? fit()),
      fitting: computed(() => s.zoom() === null),
      heldIds: computed(() => new Set(payload()?.guestIds ?? [])),
      justPlacedSet: computed(() => new Set(s.justPlaced())),
      highlightSet: computed(() => new Set(s.highlight())),
      targetSeat: computed(() => {
        const t = s.target();
        return t?.kind === 'seat' ? t.seat : null;
      }),
    };
  }),
  withMethods((store) => {
    let glowTimer: ReturnType<typeof setTimeout> | undefined;
    return {
      pickUp(payload: Payload): void {
        patchState(store, { held: payload, target: null, highlight: [], activeRuleId: null });
      },
      startDrag(payload: Payload): void {
        patchState(store, { dragging: payload, target: null });
      },
      movePointer(x: number, y: number): void {
        patchState(store, { pointer: { x, y } });
      },
      endDrag(): void {
        patchState(store, { dragging: null, pointer: null, target: null });
      },
      /** Drop whatever is held without placing it. Returns what was held. */
      cancel(): Payload | null {
        const held = store.held();
        patchState(store, { held: null, dragging: null, pointer: null, target: null });
        return held;
      },
      setTarget(target: DropTarget | null): void {
        const current = store.target();
        const same =
          current === target ||
          (current?.kind === 'unseated' && target?.kind === 'unseated') ||
          (current?.kind === 'seat' && target?.kind === 'seat' && seatKey(current.seat) === seatKey(target.seat));
        if (!same) patchState(store, { target });
      },
      select(tableId: TableId | null): void {
        patchState(store, { selectedTableId: tableId });
      },
      highlightRule(ruleId: string | null, guestIds: readonly GuestId[], tableId: TableId | null): void {
        const off = ruleId === null || store.activeRuleId() === ruleId;
        patchState(store, {
          activeRuleId: off ? null : ruleId,
          highlight: off ? [] : guestIds,
          selectedTableId: off ? store.selectedTableId() : (tableId ?? store.selectedTableId()),
        });
      },
      setColorBy(colorBy: ColorBy): void {
        patchState(store, { colorBy });
      },
      zoomIn(): void {
        patchState(store, { zoom: clampZoom(store.effectiveZoom() + ZOOM.step) });
      },
      zoomOut(): void {
        patchState(store, { zoom: clampZoom(store.effectiveZoom() - ZOOM.step) });
      },
      zoomBy(factor: number): void {
        patchState(store, { zoom: clampZoom(store.effectiveZoom() * factor) });
      },
      zoomToFit(): void {
        patchState(store, { zoom: null });
      },
      setViewport(w: number, h: number): void {
        const v = store.viewport();
        if (v.w !== w || v.h !== h) patchState(store, { viewport: { w, h } });
      },
      setPlan(w: number, h: number): void {
        const p = store.plan();
        if (p.w !== w || p.h !== h) patchState(store, { plan: { w, h } });
      },
      /** Play the pop and glow on these seats, then clear it. Logic never waits on animationend. */
      markPlaced(seats: readonly SeatRef[]): void {
        clearTimeout(glowTimer);
        patchState(store, { justPlaced: seats.map(seatKey) });
        glowTimer = setTimeout(() => patchState(store, { justPlaced: [] }), GLOW_MS);
      },
      setFilter(filter: string): void {
        patchState(store, { filter });
      },
      setListOpen(listOpen: boolean): void {
        patchState(store, { listOpen });
      },
      setRailOpen(railOpen: boolean): void {
        patchState(store, { railOpen });
      },
      setIncludePending(includePending: boolean): void {
        patchState(store, { includePending });
      },
      showSummary(summary: AutoSummary | null): void {
        patchState(store, { summary });
      },
      focusGuest(guestId: GuestId | null): void {
        patchState(store, { focusGuestId: guestId });
      },
      dispose(): void {
        clearTimeout(glowTimer);
      },
    };
  }),
  withHooks({
    onDestroy(store) {
      store.dispose();
    },
  }),
);

export type SeatingStore = InstanceType<typeof SeatingStore>;
