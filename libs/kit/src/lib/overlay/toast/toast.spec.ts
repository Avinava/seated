import { ChangeDetectionStrategy, Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { StToastHost } from './toast-host';
import { TOAST_DURATION, ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  beforeEach(() => (service = TestBed.inject(ToastService)));

  it('shows the newest toast with defaults', () => {
    const id = service.show({ message: 'Saved' });
    expect(service.current()).toEqual({
      id,
      message: 'Saved',
      tone: 'neutral',
      action: null,
      duration: TOAST_DURATION,
    });
  });

  it('replaces older toasts by default', () => {
    service.show({ message: 'One' });
    service.show({ message: 'Two' });
    expect(service.toasts().map((t) => t.message)).toEqual(['Two']);
  });

  it('can queue so an older toast resurfaces when the newer one goes', () => {
    service.show({ message: 'One' });
    const two = service.show({ message: 'Two' }, { replace: false });
    expect(service.current()?.message).toBe('Two');
    service.dismiss(two);
    expect(service.current()?.message).toBe('One');
    service.clear();
    expect(service.current()).toBeNull();
  });
});

@Component({
  imports: [StToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<st-toast-host />`,
})
class Host {}

describe('StToastHost', () => {
  let fixture: ComponentFixture<Host>;
  let service: ToastService;
  let root: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(Host);
    service = TestBed.inject(ToastService);
    root = fixture.nativeElement;
    await render();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  async function render() {
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  const region = () => root.querySelector<HTMLElement>('[role="status"]')!;
  const toast = () => root.querySelector<HTMLElement>('.toast');

  it('keeps an empty polite live region in the DOM before any toast', () => {
    expect(region().getAttribute('aria-live')).toBe('polite');
    expect(region().getAttribute('aria-atomic')).toBe('true');
    expect(toast()).toBeNull();
  });

  it('renders the message inside the live region', async () => {
    service.show({ message: 'Aarav moved to T3' });
    await render();
    expect(region().textContent).toContain('Aarav moved to T3');
    expect(toast()!.dataset['tone']).toBe('neutral');
  });

  it('auto-dismisses after 4.5 seconds', async () => {
    service.show({ message: 'Saved' });
    await render();
    await vi.advanceTimersByTimeAsync(TOAST_DURATION - 10);
    expect(service.current()).not.toBeNull();
    await vi.advanceTimersByTimeAsync(20);
    expect(service.current()).toBeNull();
  });

  it('pauses the countdown on hover and resumes with the time that was left', async () => {
    service.show({ message: 'Saved' });
    await render();
    await vi.advanceTimersByTimeAsync(4000);
    toast()!.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(service.current()).not.toBeNull();
    toast()!.dispatchEvent(new MouseEvent('mouseleave'));
    await vi.advanceTimersByTimeAsync(400);
    expect(service.current()).not.toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(service.current()).toBeNull();
  });

  it('pauses while focus is inside and resumes when it leaves', async () => {
    service.show({ message: 'Removed', action: { label: 'Undo', run: () => undefined } });
    await render();
    toast()!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(TOAST_DURATION * 2);
    expect(service.current()).not.toBeNull();
    toast()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await vi.advanceTimersByTimeAsync(TOAST_DURATION);
    expect(service.current()).toBeNull();
  });

  it('runs the action (Undo) and dismisses', async () => {
    const run = vi.fn();
    service.show({ message: 'Guest removed', action: { label: 'Undo', run } });
    await render();
    const undo = [...toast()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Undo')!;
    undo.click();
    await render();
    expect(run).toHaveBeenCalledOnce();
    expect(service.current()).toBeNull();
  });

  it('has a labelled dismiss button', async () => {
    service.show({ message: 'Saved' });
    await render();
    toast()!.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')!.click();
    expect(service.current()).toBeNull();
  });

  it('marks danger toasts and shows an alert icon so colour is not the only signal', async () => {
    service.show({ message: 'Could not save', tone: 'danger' });
    await render();
    expect(toast()!.dataset['tone']).toBe('danger');
    expect(toast()!.querySelector('st-icon')).not.toBeNull();
  });

  it('restarts the timer for a newer toast', async () => {
    service.show({ message: 'One' });
    await render();
    await vi.advanceTimersByTimeAsync(4000);
    service.show({ message: 'Two' });
    await render();
    await vi.advanceTimersByTimeAsync(4000);
    expect(service.current()?.message).toBe('Two');
  });
});
