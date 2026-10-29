import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, booleanAttribute, input, model, output } from '@angular/core';
import { StIcon } from '../../icons/icon/icon';

let nextId = 0;

export type DialogRole = 'dialog' | 'alertdialog';

/**
 * A centred modal. Same focus contract as the drawer: focus moves in on open,
 * is trapped, and returns to the opener on close. Use `dialogRole="alertdialog"` for
 * confirmations that interrupt the user; those ignore scrim clicks so a stray
 * click cannot dismiss a destructive question.
 *
 * ```html
 * <st-dialog [(open)]="confirming" heading="Delete table T3?" dialogRole="alertdialog">
 *   Six guests will move back to the unseated list.
 *   <ng-container stDialogFooter>
 *     <button stButton (click)="confirming.set(false)">Cancel</button>
 *     <button stButton variant="danger" (click)="remove()">Delete</button>
 *   </ng-container>
 * </st-dialog>
 * ```
 */
@Component({
  selector: 'st-dialog',
  imports: [CdkTrapFocus, StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'st-dialog',
    '[class.is-open]': 'open()',
    '(click)': 'onHostClick($event)',
  },
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class StDialog {
  readonly open = model(false);
  /** Heading text; also the dialog's accessible name. */
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly dialogRole = input<DialogRole>('dialog');
  /** Hide the close button (alert dialogs usually offer explicit choices instead). */
  readonly hideClose = input(false, { transform: booleanAttribute });
  readonly closeLabel = input($localize`:@@st.overlay.close:Close`);
  /** Emits after the dialog closes itself (Escape, scrim or close button). */
  readonly closed = output();

  protected readonly titleId = `st-dialog-title-${nextId++}`;
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

  protected onHostClick(event: MouseEvent): void {
    if (this.dialogRole() === 'alertdialog') return;
    if ((event.target as Element | null)?.classList.contains('scrim')) this.close();
  }
}
