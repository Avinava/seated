import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GEOMETRY, seatPositions, type TableShape } from '@seated/domain';
import { type SeatView } from '../seat/seat';
import { StTable } from './table';

function seats(n: number, filled: number): SeatView[] {
  return Array.from({ length: n }, (_, i) =>
    i < filled
      ? { initials: `G${i}`, tone: 1, state: 'filled', label: `Seat ${i + 1}, Guest ${i}` }
      : { initials: '', tone: null, state: 'empty', label: `Seat ${i + 1}, empty` },
  );
}

@Component({
  imports: [StTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-table
      [shape]="shape()"
      [seats]="seats()"
      label="T3"
      [rotation]="rotation()"
      [selected]="selected()"
      [x]="x()"
      [y]="200"
      (tableActivate)="events.push('table')"
      (seatActivate)="events.push('seat:' + $event)"
      (seatPointerEnter)="events.push('enter:' + $event)"
    />
  `,
})
class Host {
  readonly shape = signal<TableShape>('round');
  readonly seats = signal(seats(10, 6));
  readonly rotation = signal<0 | 90>(0);
  readonly selected = signal(false);
  readonly x = signal<number | undefined>(undefined);
  readonly events: string[] = [];
}

describe('StTable', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const table = root.querySelector('st-table') as HTMLElement;
    const seatEls = () => Array.from(table.querySelectorAll<HTMLButtonElement>('button.st-seat'));
    const top = () => table.querySelector<HTMLButtonElement>('button.top')!;
    const key = async (
      target: HTMLElement,
      k: 'ArrowLeft' | 'ArrowUp' | 'ArrowRight' | 'ArrowDown' | 'Home' | 'End',
    ) => {
      const init = { key: k, bubbles: true, cancelable: true };
      target.dispatchEvent(new KeyboardEvent('keydown', init));
      await fixture.whenStable();
    };
    return { fixture, host: fixture.componentInstance, table, seatEls, top, key };
  }

  it('is a named group with a summary on the table top', async () => {
    const { table, top } = await setup();
    expect(table.getAttribute('role')).toBe('group');
    expect(table.getAttribute('aria-label')).toBe('Table T3');
    // Named by its text: the visible label, then the count spelled out (the "6/10" glyphs are hidden).
    expect(top().hasAttribute('aria-label')).toBe(false);
    expect(top().querySelector('.st-sr-only')?.textContent).toBe('T3, 6 of 10 seated');
    expect(top().querySelector('.count')?.textContent).toBe('6/10');
  });

  it('places every seat at the domain geometry around the centre', async () => {
    const { table, seatEls } = await setup();
    const expected = seatPositions('round', 10, 0);
    const cx = parseFloat(table.style.width) / 2;
    const cy = parseFloat(table.style.height) / 2;
    const half = GEOMETRY.seat / 2;
    seatEls().forEach((el, i) => {
      expect(parseFloat(el.style.left)).toBeCloseTo(cx + expected[i]!.x - half, 1);
      expect(parseFloat(el.style.top)).toBeCloseTo(cy + expected[i]!.y - half, 1);
    });
    // A round table of 10 is as tall as the seat ring: 68 radius + half a seat at twelve and six.
    expect(table.style.height).toBe(`${2 * (GEOMETRY.round.seatRadius + half)}px`);
  });

  it.each<[TableShape, 0 | 90, number]>([
    ['head', 0, 8],
    ['long', 0, 12],
    ['long', 90, 12],
  ])('sizes the %s table (rotation %s) from tableTop', async (shape, rotation, n) => {
    const { fixture, host, top, seatEls } = await setup();
    host.shape.set(shape);
    host.rotation.set(rotation);
    host.seats.set(seats(n, 0));
    await fixture.whenStable();
    expect(seatEls()).toHaveLength(n);
    const w = parseFloat(top().style.width);
    const h = parseFloat(top().style.height);
    if (shape === 'long') expect(rotation === 90 ? w > h : h > w).toBe(true);
    else expect(h).toBe(GEOMETRY.head.depth);
  });

  it('keeps one tab stop among the seats and moves it with arrow keys', async () => {
    const { seatEls, key } = await setup();
    expect(seatEls().filter((s) => s.tabIndex === 0)).toHaveLength(1);
    seatEls()[0]!.focus();
    await key(seatEls()[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(seatEls()[1]);
    expect(seatEls()[1]!.tabIndex).toBe(0);
    expect(seatEls()[0]!.tabIndex).toBe(-1);
    await key(seatEls()[1]!, 'ArrowUp');
    expect(document.activeElement).toBe(seatEls()[0]);
  });

  it('wraps around and supports Home and End', async () => {
    const { seatEls, key } = await setup();
    seatEls()[0]!.focus();
    await key(seatEls()[0]!, 'ArrowLeft');
    expect(document.activeElement).toBe(seatEls()[9]);
    await key(seatEls()[9]!, 'Home');
    expect(document.activeElement).toBe(seatEls()[0]);
    await key(seatEls()[0]!, 'End');
    expect(document.activeElement).toBe(seatEls()[9]);
  });

  it('moves the tab stop to a seat focused by pointer or tab', async () => {
    const { seatEls, fixture } = await setup();
    seatEls()[4]!.focus();
    await fixture.whenStable();
    expect(seatEls()[4]!.tabIndex).toBe(0);
  });

  it('emits seat and table activation with the seat index', async () => {
    const { host, seatEls, top } = await setup();
    seatEls()[3]!.click();
    seatEls()[5]!.dispatchEvent(new Event('pointerenter'));
    top().click();
    expect(host.events).toEqual(['seat:3', 'enter:5', 'table']);
  });

  it('marks each seat with its index so a drop under the pointer can be hit-tested', async () => {
    const { seatEls } = await setup();
    expect(seatEls().map((s) => s.dataset['seatIndex'])).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('reflects selection on the top and positions itself when given a centre', async () => {
    const { fixture, host, table, top } = await setup();
    expect(table.classList).not.toContain('is-placed');
    host.selected.set(true);
    host.x.set(320);
    await fixture.whenStable();
    expect(top().getAttribute('aria-pressed')).toBe('true');
    expect(table.classList).toContain('is-selected');
    expect(table.classList).toContain('is-placed');
    expect(table.style.left).toBe('320px');
    expect(table.style.top).toBe('200px');
  });
});
