import { TestBed } from '@angular/core/testing';
import { GLOW_MS, SeatingStore, ZOOM, fitZoom } from './seating.store';

describe('SeatingStore', () => {
  let store: SeatingStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SeatingStore] });
    store = TestBed.inject(SeatingStore);
  });

  it.each([
    [{ w: 0, h: 0 }, 1],
    [{ w: 1228, h: 748 }, 1],
    [{ w: 638, h: 900 }, 0.5],
    [{ w: 2000, h: 398 }, 0.5],
    [{ w: 200, h: 200 }, ZOOM.min],
  ])('fits the 1180 x 700 plan into %o at %s', (viewport, zoom) => {
    expect(fitZoom(viewport, { w: 1180, h: 700 })).toBe(zoom);
  });

  it.each<[string, (s: SeatingStore) => void, number, boolean]>([
    ['fit by default', () => undefined, 0.5, true],
    ['zoom in from fit', (s) => s.zoomIn(), 0.6, false],
    ['zoom out from fit', (s) => s.zoomOut(), 0.4, false],
    ['zoom out stops at the minimum', (s) => [1, 2, 3].forEach(() => s.zoomOut()), ZOOM.min, false],
    ['zoom by a factor', (s) => s.zoomBy(2), 1, false],
    ['back to fit', (s) => (s.zoomIn(), s.zoomToFit()), 0.5, true],
  ])('%s', (_, act, zoom, fitting) => {
    store.setViewport(638, 400);
    act(store);
    expect(store.effectiveZoom()).toBe(zoom);
    expect(store.fitting()).toBe(fitting);
  });

  it('holds, targets and cancels a payload', () => {
    const payload = { guestIds: ['a', 'b'], label: 'the Mehtas', from: null };
    store.pickUp(payload);
    expect(store.payload()).toBe(payload);
    expect([...store.heldIds()]).toEqual(['a', 'b']);
    store.setTarget({ kind: 'seat', seat: { tableId: 't-1', index: 2 } });
    const target = store.target();
    store.setTarget({ kind: 'seat', seat: { tableId: 't-1', index: 2 } });
    expect(store.target()).toBe(target);
    expect(store.targetSeat()).toEqual({ tableId: 't-1', index: 2 });
    expect(store.cancel()).toBe(payload);
    expect(store.payload()).toBeNull();
    expect(store.target()).toBeNull();
  });

  it('prefers a pointer drag over a hold while it lasts', () => {
    const held = { guestIds: ['a'], label: 'A', from: null };
    const dragged = { guestIds: ['b'], label: 'B', from: null };
    store.pickUp(held);
    store.startDrag(dragged);
    expect(store.payload()).toBe(dragged);
    store.endDrag();
    expect(store.payload()).toBe(held);
  });

  it('toggles a rule highlight and selects its table', () => {
    store.highlightRule('r-1', ['g-1', 'g-2'], 't-3');
    expect(store.activeRuleId()).toBe('r-1');
    expect([...store.highlightSet()]).toEqual(['g-1', 'g-2']);
    expect(store.selectedTableId()).toBe('t-3');
    store.highlightRule('r-1', ['g-1', 'g-2'], 't-3');
    expect(store.activeRuleId()).toBeNull();
    expect(store.highlight()).toEqual([]);
    expect(store.selectedTableId()).toBe('t-3');
  });

  it('clears the placed glow on a timer, not on animationend', () => {
    vi.useFakeTimers();
    try {
      store.markPlaced([{ tableId: 't-1', index: 0 }]);
      expect(store.justPlacedSet().has('t-1:0')).toBe(true);
      vi.advanceTimersByTime(GLOW_MS);
      expect(store.justPlaced()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
