import { ChangeDetectionStrategy, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import type { TableShape } from '@seated/domain';
import { StButton, StIcon } from '@seated/kit';
import { NEW_TABLE } from './seating.vm';

/**
 * "Add table" as a disclosure: a button that reveals three plain buttons, one
 * per shape. Escape or a choice closes it and returns focus to the trigger.
 */
@Component({
  selector: 'st-add-table-menu',
  imports: [StButton, StIcon],
  host: {
    '(document:pointerdown)': 'onOutside($event)',
    '(keydown.escape)': 'onEscape($event)',
  },
  template: `
    <button
      #trigger
      stButton
      [attr.aria-expanded]="open()"
      aria-controls="add-table-options"
      (click)="open.set(!open())"
    >
      <st-icon name="plus" />
      <span i18n="@@addTable.trigger">Add table</span>
    </button>
    @if (open()) {
      <div id="add-table-options" class="panel">
        @for (o of options; track o.shape) {
          <button type="button" class="option" (click)="choose(o.shape)">
            <span class="shape" [attr.data-shape]="o.shape" aria-hidden="true"></span>
            <span class="label">{{ o.label }}</span>
            <span class="seats st-mono">{{ o.seats }}</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
    }

    .panel {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: var(--st-z-bar);
      display: grid;
      min-width: 220px;
      padding: var(--st-space-1);
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-lg);
      background: var(--st-surface);
      box-shadow: var(--st-shadow-raised);
      animation: st-fade-up var(--st-dur-fast) var(--st-ease-settle);
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--st-space-3);
      height: 36px;
      padding: 0 var(--st-space-3);
      border: 0;
      border-radius: var(--st-radius-md);
      background: transparent;
      color: var(--st-text);
      font-size: var(--st-fs-md);
      text-align: left;
      cursor: pointer;

      &:hover {
        background: var(--st-surface-2);
      }
    }

    .label {
      flex: 1;
    }

    .seats {
      font-size: var(--st-fs-2xs);
      color: var(--st-text-3);
    }

    .shape {
      width: 16px;
      height: 16px;
      border: 1.5px solid var(--st-text-3);
      border-radius: 50%;

      &[data-shape='long'] {
        width: 8px;
        border-radius: 2px;
      }

      &[data-shape='head'] {
        height: 8px;
        border-radius: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTableMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly trigger = viewChild.required('trigger', { read: ElementRef });

  readonly add = output<TableShape>();
  protected readonly open = signal(false);

  protected readonly options = (['round', 'long', 'head'] as const).map((shape) => ({
    shape,
    seats: NEW_TABLE[shape],
    label: {
      round: $localize`:@@addTable.round:Round table`,
      long: $localize`:@@addTable.long:Long table`,
      head: $localize`:@@addTable.head:Head table`,
    }[shape],
  }));

  protected choose(shape: TableShape): void {
    this.add.emit(shape);
    this.close();
  }

  protected close(): void {
    this.open.set(false);
    (this.trigger().nativeElement as HTMLElement).focus();
  }

  protected onEscape(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    event.preventDefault();
    this.close();
  }

  protected onOutside(event: PointerEvent): void {
    if (this.open() && !this.host.contains(event.target as Node)) this.open.set(false);
  }
}
