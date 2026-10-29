import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { StIcon } from '@seated/kit';
import { ImportChoose } from './import-choose';
import { ImportDone } from './import-done';
import { ImportMap } from './import-map';
import { ImportReview } from './import-review';
import { ImportWizardStore } from './import-wizard.store';
import { IMPORT_STEPS, STEP_LABEL } from './import.vm';

/**
 * The three-step CSV import (choose, match, review) plus its result. Each step
 * is its own component over one store; moving between steps puts focus on the
 * new step's heading so screen reader and keyboard users land in the right place.
 */
@Component({
  selector: 'st-import-wizard',
  imports: [ImportChoose, ImportDone, ImportMap, ImportReview, StIcon],
  providers: [ImportWizardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="steps" aria-label="Import steps" i18n-aria-label="@@import.stepsLabel">
      @for (s of steps; track s.id; let i = $index) {
        <li
          class="step"
          [attr.data-state]="i < current() ? 'done' : i === current() ? 'current' : 'todo'"
          [attr.aria-current]="i === current() ? 'step' : null"
        >
          <span class="dot st-num" aria-hidden="true">
            @if (i < current()) {
              <st-icon name="check" [size]="12" />
            } @else {
              {{ i + 1 }}
            }
          </span>
          <span>{{ s.label }}</span>
          @if (i < current()) {
            <span class="st-sr-only" i18n="@@import.stepDone">(done)</span>
          }
        </li>
      }
    </ol>

    <div class="body">
      @switch (wizard.step()) {
        @case ('choose') {
          <st-import-choose />
        }
        @case ('map') {
          <st-import-map />
        }
        @case ('review') {
          <st-import-review />
        }
        @case ('done') {
          <st-import-done />
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--st-space-6);
    }

    .steps {
      display: flex;
      flex-wrap: wrap;
      gap: var(--st-space-2) var(--st-space-6);
      counter-reset: step;
    }

    .step {
      display: flex;
      align-items: center;
      gap: var(--st-space-2);
      color: var(--st-text-3);
      font-size: var(--st-fs-md);
      font-weight: 500;
    }

    .step[data-state='current'] {
      color: var(--st-text);
    }

    .step[data-state='done'] {
      color: var(--st-text-2);
    }

    .dot {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border: 1.5px dashed var(--st-line-2);
      border-radius: 50%;
      font-size: var(--st-fs-2xs);
    }

    .step[data-state='current'] .dot {
      border-style: solid;
      border-color: var(--st-accent);
      background: var(--st-accent);
      color: var(--st-on-accent);
      box-shadow: 0 0 0 3px var(--st-accent-soft);
    }

    .step[data-state='done'] .dot {
      border-style: solid;
      border-color: var(--st-text-2);
      background: var(--st-surface-2);
    }

    .body {
      min-height: 320px;
    }
  `,
})
export class ImportWizard {
  protected readonly wizard = inject(ImportWizardStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly steps = IMPORT_STEPS.filter((s) => s !== 'done').map((id) => ({ id, label: STEP_LABEL[id] }));
  protected readonly current = computed(() => IMPORT_STEPS.indexOf(this.wizard.step()));

  constructor() {
    let first = true;
    effect(() => {
      this.wizard.step();
      if (first) {
        first = false;
        return;
      }
      untracked(() =>
        afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('[data-step-heading]')?.focus(), {
          injector: this.injector,
        }),
      );
    });
  }
}
