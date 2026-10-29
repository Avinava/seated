import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A numbered style-guide section: number, heading, a line of intent, then the specimens. */
@Component({
  selector: 'st-brand-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-labelledby]': "'brand-' + id()", role: 'region' },
  template: `
    <header class="head">
      <span class="num st-mono" aria-hidden="true">{{ num() }}</span>
      <div>
        <h2 class="title st-display" [id]="'brand-' + id()">{{ heading() }}</h2>
        <p class="intro">{{ intro() }}</p>
      </div>
    </header>
    <div class="content"><ng-content /></div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--st-space-6);
      padding-block: var(--st-space-10);
      border-top: 1px solid var(--st-line);
    }

    .head {
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr);
      gap: var(--st-space-4);
    }

    .num {
      padding-top: 6px;
      color: var(--st-text-3);
    }

    .title {
      font-size: var(--st-fs-3xl);
    }

    .intro {
      max-width: 64ch;
      margin-top: var(--st-space-2);
      color: var(--st-text-2);
      text-wrap: pretty;
    }

    .content {
      min-width: 0;
    }

    @media (min-width: 900px) {
      .content {
        padding-left: calc(48px + var(--st-space-4));
      }
    }
  `,
})
export class BrandSection {
  readonly id = input.required<string>();
  readonly num = input.required<string>();
  readonly heading = input.required<string>();
  readonly intro = input.required<string>();
}
