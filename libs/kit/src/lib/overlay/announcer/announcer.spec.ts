import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { Announcer } from './announcer';

describe('Announcer', () => {
  let live: { announce: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> };
  let announcer: Announcer;

  beforeEach(() => {
    live = { announce: vi.fn().mockResolvedValue(undefined), clear: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: LiveAnnouncer, useValue: live }] });
    announcer = TestBed.inject(Announcer);
  });

  it('is polite by default', async () => {
    await announcer.announce('Aarav seated at T3, seat 4');
    expect(live.announce).toHaveBeenCalledWith('Aarav seated at T3, seat 4', 'polite', undefined);
  });

  it('passes politeness and duration through', async () => {
    await announcer.announce('Saved', 'assertive', 1000);
    expect(live.announce).toHaveBeenCalledWith('Saved', 'assertive', 1000);
  });

  it('alerts assertively', async () => {
    await announcer.alert('Could not save');
    expect(live.announce).toHaveBeenCalledWith('Could not save', 'assertive');
  });

  it('clears the live region', () => {
    announcer.clear();
    expect(live.clear).toHaveBeenCalled();
  });
});

describe('Announcer with the real CDK live region', () => {
  it('writes the message into a polite aria-live element', async () => {
    vi.useFakeTimers();
    const done = TestBed.inject(Announcer).announce('Table T3 is full');
    await vi.advanceTimersByTimeAsync(150);
    await done;
    const region = document.querySelector('.cdk-live-announcer-element')!;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('Table T3 is full');
    vi.useRealTimers();
  });
});
