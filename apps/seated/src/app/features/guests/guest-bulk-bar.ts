import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RSVPS, type Rsvp } from '@seated/domain';
import { StBulkBar, StButton, StIcon, StInput } from '@seated/kit';
import { RSVP_LABEL } from '../../i18n/messages';
import type { TableOption } from './guests.vm';

type Mode = 'menu' | 'rsvp' | 'tag' | 'table';

/**
 * What can be done to the selected guests. Each action opens a small inline
 * step in the bar itself (pick an RSVP, type a tag, pick a table), so nothing
 * floats over the list. Escape steps back to the menu.
 */
@Component({
  selector: 'st-guest-bulk-bar',
  imports: [StBulkBar, StButton, StIcon, StInput],
  template: `
    <st-bulk-bar [count]="count()" (cleared)="cleared.emit()" (keydown.escape)="back($event)">
      @switch (mode()) {
        @case ('rsvp') {
          <span class="step" i18n="@@guests.bulk.setTo">Set to</span>
          @for (r of rsvps; track r.value; let first = $first) {
            <button
              stButton
              variant="ghost"
              size="sm"
              type="button"
              [attr.data-autofocus]="first || null"
              (click)="rsvp.emit(r.value); go('menu')"
            >
              {{ r.label }}
            </button>
          }
        }
        @case ('tag') {
          <form class="inline" (submit)="submitTag($event, tagInput.element.value)">
            <input
              #tagInput
              stInput
              class="mini"
              data-autofocus
              autocomplete="off"
              placeholder="Tag"
              i18n-placeholder="@@guests.bulk.tagPlaceholder"
              aria-label="Tag to add"
              i18n-aria-label="@@guests.bulk.tagLabel"
            />
            <button stButton variant="ghost" size="sm" type="submit" i18n="@@guests.bulk.addTagGo">Add</button>
          </form>
        }
        @case ('table') {
          <form class="inline" (submit)="submitTable($event, tableSelect.element.value)">
            <select
              #tableSelect
              stInput
              class="mini"
              data-autofocus
              aria-label="Table"
              i18n-aria-label="@@guests.bulk.tableLabel"
            >
              @for (t of tables(); track t.id) {
                <option [value]="t.id">{{ t.text }}</option>
              }
            </select>
            <button stButton variant="ghost" size="sm" type="submit" i18n="@@guests.bulk.assignGo">Assign</button>
          </form>
        }
        @default {
          <button stButton variant="ghost" size="sm" type="button" (click)="go('rsvp')">
            <st-icon name="check" [size]="14" /><span i18n="@@guests.bulk.rsvp">Set RSVP</span>
          </button>
          <button stButton variant="ghost" size="sm" type="button" (click)="go('tag')">
            <st-icon name="tag" [size]="14" /><span i18n="@@guests.bulk.tag">Add tag</span>
          </button>
          <button stButton variant="ghost" size="sm" type="button" (click)="go('table')">
            <st-icon name="table" [size]="14" /><span i18n="@@guests.bulk.table">Assign table</span>
          </button>
          <button stButton variant="ghost" size="sm" type="button" (click)="remove.emit()">
            <st-icon name="trash" [size]="14" /><span i18n="@@guests.bulk.remove">Remove</span>
          </button>
        }
      }
      @if (mode() !== 'menu') {
        <button stButton variant="ghost" size="sm" type="button" (click)="go('menu')" i18n="@@guests.bulk.back">
          Back
        </button>
      }
    </st-bulk-bar>
  `,
  styles: `
    :host {
      display: contents;
    }

    st-bulk-bar {
      max-width: calc(100vw - 2 * var(--st-space-4));
      overflow-x: auto;
    }

    .step {
      padding: 0 var(--st-space-2);
      opacity: 0.7;
      white-space: nowrap;
    }

    .inline {
      display: inline-flex;
      align-items: center;
      gap: var(--st-space-1);
    }

    .mini {
      width: 180px;
      min-height: var(--st-size-control-sm);
      height: var(--st-size-control-sm);
      font-size: var(--st-fs-md);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestBulkBar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly count = input.required<number>();
  readonly tables = input<readonly TableOption[]>([]);

  readonly rsvp = output<Rsvp>();
  readonly tag = output<string>();
  readonly assign = output<string>();
  readonly remove = output();
  readonly cleared = output();

  protected readonly mode = signal<Mode>('menu');
  protected readonly rsvps = RSVPS.map((r) => ({ value: r, label: RSVP_LABEL[r] }));

  protected go(mode: Mode): void {
    this.mode.set(mode);
    afterNextRender(
      () => {
        const el = this.host.nativeElement;
        const target =
          mode === 'menu'
            ? el.querySelector<HTMLElement>('.actions button')
            : el.querySelector<HTMLElement>('[data-autofocus]');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  protected back(event: Event): void {
    if (this.mode() === 'menu') return;
    event.stopPropagation();
    this.go('menu');
  }

  protected submitTag(event: Event, value: string): void {
    event.preventDefault();
    if (value.trim() === '') return;
    this.tag.emit(value.trim());
    this.go('menu');
  }

  protected submitTable(event: Event, tableId: string): void {
    event.preventDefault();
    if (tableId) this.assign.emit(tableId);
    this.go('menu');
  }
}
