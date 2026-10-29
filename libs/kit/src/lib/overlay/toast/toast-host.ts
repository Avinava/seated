import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, untracked } from '@angular/core';
import { StIcon } from '../../icons/icon/icon';
import { ToastService, type Toast } from './toast.service';

/**
 * Renders the newest toast bottom-centre. Place one in the app shell.
 *
 * The polite live region is always in the DOM, so screen readers announce a
 * toast as it appears. A toast dismisses itself after its duration (4.5s by
 * default); the countdown pauses while the pointer is over it or focus is in it,
 * so nobody loses an Undo while reaching for it.
 */
@Component({
  selector: 'st-toast-host',
  imports: [StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'st-toast-host' },
  template: `
    <div class="region" role="status" aria-live="polite" aria-atomic="true">
      @if (service.current(); as toast) {
        <div
          class="toast"
          [attr.data-tone]="toast.tone"
          animate.enter="toast-in"
          animate.leave="toast-out"
          (mouseenter)="hold('pointer', true)"
          (mouseleave)="hold('pointer', false)"
          (focusin)="hold('focus', true)"
          (focusout)="onFocusOut($event)"
        >
          @if (toast.tone === 'danger') {
            <st-icon name="alert" [size]="16" />
          }
          <span class="message">{{ toast.message }}</span>
          @if (toast.action) {
            <button type="button" class="action" (click)="runAction(toast)">{{ toast.action.label }}</button>
          }
          <button type="button" class="dismiss" [attr.aria-label]="dismissLabel()" (click)="service.dismiss(toast.id)">
            <st-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-host.scss',
})
export class StToastHost {
  protected readonly service = inject(ToastService);
  readonly dismissLabel = input($localize`:@@st.toast.dismiss:Dismiss`);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private remaining = 0;
  private startedAt = 0;
  private readonly holds = new Set<'pointer' | 'focus'>();

  constructor() {
    effect(() => {
      const toast = this.service.current();
      untracked(() => {
        this.stop();
        this.holds.clear();
        if (toast) {
          this.remaining = toast.duration;
          this.start(toast.id);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected hold(reason: 'pointer' | 'focus', on: boolean): void {
    if (on) {
      this.holds.add(reason);
      if (this.timer !== null) {
        this.stop();
        this.remaining -= Date.now() - this.startedAt;
      }
    } else {
      this.holds.delete(reason);
      const toast = this.service.current();
      if (toast && this.holds.size === 0 && this.timer === null) this.start(toast.id);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as Element).contains(next)) this.hold('focus', false);
  }

  protected runAction(toast: Toast): void {
    toast.action?.run();
    this.service.dismiss(toast.id);
  }

  private start(id: number): void {
    this.startedAt = Date.now();
    this.timer = setTimeout(
      () => {
        this.timer = null;
        this.service.dismiss(id);
      },
      Math.max(0, this.remaining),
    );
  }

  private stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
