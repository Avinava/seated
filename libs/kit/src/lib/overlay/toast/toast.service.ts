import { Injectable, computed, signal } from '@angular/core';

export type ToastTone = 'neutral' | 'danger';

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface ToastOptions {
  readonly message: string;
  readonly tone?: ToastTone;
  readonly action?: ToastAction;
  /** Milliseconds before auto-dismiss. Defaults to 4500. */
  readonly duration?: number;
}

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
  readonly action: ToastAction | null;
  readonly duration: number;
}

export const TOAST_DURATION = 4500;

/**
 * App-wide toast queue held in a signal. `<st-toast-host>` renders the newest
 * toast, so a fresh "Moved Aarav to T3" replaces a stale one instead of stacking.
 * By default `show()` also drops older entries; with `{ replace: false }` they
 * stay queued and resurface once the newer toast is dismissed.
 *
 * ```ts
 * inject(ToastService).show({ message: 'Guest removed', action: { label: 'Undo', run: () => history.undo() } });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly queue = signal<readonly Toast[]>([]);

  /** Every queued toast, oldest first. */
  readonly toasts = this.queue.asReadonly();
  /** The toast on screen: the newest one. */
  readonly current = computed<Toast | null>(() => this.queue().at(-1) ?? null);

  /**
   * Shows a toast and returns its id. With `replace` (the default) any queued
   * toasts are dropped, which suits undo toasts: only the latest edit is undoable here.
   */
  show(options: ToastOptions, { replace = true }: { replace?: boolean } = {}): number {
    const toast: Toast = {
      id: this.nextId++,
      message: options.message,
      tone: options.tone ?? 'neutral',
      action: options.action ?? null,
      duration: options.duration ?? TOAST_DURATION,
    };
    this.queue.update((q) => (replace ? [toast] : [...q, toast]));
    return toast.id;
  }

  dismiss(id: number): void {
    this.queue.update((q) => q.filter((t) => t.id !== id));
  }

  clear(): void {
    this.queue.set([]);
  }
}
