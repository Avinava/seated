import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  StAvatar,
  StBar,
  StButton,
  StCheckbox,
  StChip,
  StField,
  StIconButton,
  StInput,
  StPill,
  StProgressRing,
  StSegmented,
  StStat,
  StSwitch,
  type SegmentedOption,
} from '@seated/kit';
import { BrandSection } from './brand-section';

@Component({
  selector: 'st-brand-controls',
  imports: [
    BrandSection,
    StAvatar,
    StBar,
    StButton,
    StCheckbox,
    StChip,
    StField,
    StIconButton,
    StInput,
    StPill,
    StProgressRing,
    StSegmented,
    StStat,
    StSwitch,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brand-controls.html',
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--st-space-4);
    }

    .cell {
      display: grid;
      align-content: start;
      gap: var(--st-space-4);
      padding: var(--st-space-5);
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-xl);
      background: var(--st-surface);
    }

    h3 {
      color: var(--st-text-3);
      font-weight: 400;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--st-space-2);
    }

    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--st-space-3);
    }
  `,
})
export class BrandControls {
  protected readonly view = signal<'plan' | 'list'>('plan');
  protected readonly views: readonly SegmentedOption<'plan' | 'list'>[] = [
    { value: 'plan', label: $localize`:@@brand.plan:Plan`, count: 11 },
    { value: 'list', label: $localize`:@@brand.list:List`, count: 120 },
  ];
  protected readonly on = signal(true);
  protected readonly checked = signal(false);
  protected readonly chips = signal(['vip', 'out-of-town', 'kids']);

  protected removeChip(tag: string): void {
    this.chips.update((c) => c.filter((t) => t !== tag));
  }
}
