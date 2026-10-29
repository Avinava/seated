import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Tone } from '@seated/domain';
import { StSeat, type SeatState } from './seat';

@Component({
  imports: [StSeat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/elements-content -- StSeat renders its label as text -->
    <button
      stSeat
      [state]="state()"
      [initials]="initials()"
      [tone]="tone()"
      [justPlaced]="placed()"
      label="Seat 4, Aarav Shah"
      (click)="clicks.set(clicks() + 1)"
    ></button>
  `,
})
class Host {
  readonly state = signal<SeatState>('filled');
  readonly initials = signal('ASX');
  readonly tone = signal<Tone | null>(2);
  readonly placed = signal(false);
  readonly clicks = signal(0);
}

describe('StSeat', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const seat = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    return { fixture, seat, host: fixture.componentInstance };
  }

  it('is a native button named by its label, not its initials', async () => {
    const { seat } = await setup();
    expect(seat.type).toBe('button');
    // Named by text content, not aria-label, so the visible initials never contradict the name.
    expect(seat.hasAttribute('aria-label')).toBe(false);
    expect(seat.querySelector('.st-sr-only')?.textContent).toBe('Seat 4, Aarav Shah');
    expect(seat.querySelector('.initials')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows at most two initials, and none when empty', async () => {
    const { fixture, seat, host } = await setup();
    expect(seat.querySelector('.initials')?.textContent).toBe('AS');
    host.state.set('empty');
    await fixture.whenStable();
    expect(seat.querySelector('.initials')?.textContent).toBe('');
  });

  it.each<SeatState>(['empty', 'filled', 'picked', 'drop-target', 'conflict'])(
    'exposes the %s state for styling',
    async (state) => {
      const { fixture, seat, host } = await setup();
      host.state.set(state);
      await fixture.whenStable();
      expect(seat.dataset['state']).toBe(state);
    },
  );

  it('carries its tone, or none', async () => {
    const { fixture, seat, host } = await setup();
    expect(seat.dataset['tone']).toBe('2');
    host.tone.set(null);
    await fixture.whenStable();
    expect(seat.hasAttribute('data-tone')).toBe(false);
  });

  it('plays the placement animation while justPlaced is set', async () => {
    const { fixture, seat, host } = await setup();
    expect(seat.classList).not.toContain('is-placed');
    host.placed.set(true);
    await fixture.whenStable();
    expect(seat.classList).toContain('is-placed');
  });

  it('activates like a button', async () => {
    const { seat, host } = await setup();
    seat.click();
    expect(host.clicks()).toBe(1);
  });
});
