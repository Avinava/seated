import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { StIcon } from '../../icons/icon/icon';

let nextId = 0;

/**
 * A modal side panel that slides in from the right. Focus moves into the panel
 * when it opens, stays trapped inside, and returns to the element that opened it
 * when it closes. Escape, the close button and the scrim all close it.
 *
 * ```html
 * <st-drawer [(open)]="editing" heading="Aarav Shah" description="Bride's family">
 *   ...form...
 *   <ng-container stDrawerFooter><button stButton variant="primary">Save</button></ng-container>
 * </st-drawer>
 * ```
 *
 * Project footer actions with the `stDrawerFooter` attribute and extra header
 * actions (beside the close button) with `stDrawerActions`.
 */
@Component({
  selector: 'st-drawer',
  imports: [CdkTrapFocus, StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-drawer',
    '[class.is-open]': 'open()',
    '(click)': 'onHostClick($event)',
  },
  templateUrl: './drawer.html',
  styleUrl: './drawer.scss',
})
export class StDrawer {
  readonly open = model(false);
  /** Heading text; also the dialog's accessible name. */
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly closeLabel = input($localize`:@@st.overlay.close:Close`);
  /** Emits after the drawer closes itself (Escape, scrim or close button). */
  readonly closed = output();

  protected readonly titleId = `st-drawer-title-${nextId++}`;
  protected readonly descriptionId = `${this.titleId}-description`;

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.closed.emit();
  }

  protected onEscape(event: Event): void {
    event.stopPropagation();
    this.close();
  }

  /** The scrim is purely visual; Escape and the close button are its keyboard equivalents. */
  protected onHostClick(event: MouseEvent): void {
    if ((event.target as Element | null)?.classList.contains('scrim')) this.close();
  }
}
