import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { describeRule, type RuleCheck, type RuleKind, type RuleStatus } from '@seated/domain';
import { StButton, StIconButton, StPill, type StTone } from '@seated/kit';
import { STATUS_LABEL, ruleDetail, ruleTitle } from '../../i18n/messages';
import { EventStore } from '../../state/event-store';
import { AddRuleDialog } from './add-rule-dialog';
import { SeatingCommands } from './seating-commands';
import { SeatingStore } from './seating.store';

const KIND_LABEL: Record<RuleKind, string> = {
  apart: $localize`:@@rules.kind.apart:Keep apart`,
  together: $localize`:@@rules.kind.together:Together`,
  'near-exit': $localize`:@@rules.kind.nearExit:Near exit`,
  capacity: $localize`:@@rules.kind.capacity:Capacity`,
};

const STATUS_TONE: Record<RuleStatus, StTone> = { met: 'ok', waiting: 'neutral', conflict: 'danger' };
const ORDER: Record<RuleStatus, number> = { conflict: 0, waiting: 1, met: 2 };

interface RuleItem {
  readonly check: RuleCheck;
  readonly kind: string;
  readonly title: string;
  readonly detail: string;
  readonly status: RuleStatus;
  readonly statusLabel: string;
  readonly tone: StTone;
  readonly removable: boolean;
}

/**
 * The rules, judged live. Each is a button that highlights the guests and
 * selects the table it is about; explicit rules can be removed (undoable).
 * Capacity is implicit per table, so it only shows when it is broken.
 */
@Component({
  selector: 'st-rules-panel',
  imports: [StButton, StIconButton, StPill, AddRuleDialog],
  template: `
    <section aria-labelledby="rules-title">
      <div class="row">
        <h2 id="rules-title" class="title" i18n="@@rules.heading">Rules</h2>
        <button stButton size="sm" (click)="adding.set(true)" i18n="@@rules.add">Add rule</button>
      </div>
      <p class="counts st-mono">{{ counts() }}</p>
      <ul class="list">
        @for (r of items(); track r.check.rule.id) {
          <li class="rule" [attr.data-status]="r.status" [class.is-active]="view.activeRuleId() === r.check.rule.id">
            <button
              type="button"
              class="main"
              [attr.aria-pressed]="view.activeRuleId() === r.check.rule.id"
              (click)="highlight(r.check)"
            >
              <span class="top">
                <span class="kind st-mono">{{ r.kind }}</span>
                <st-pill [tone]="r.tone">{{ r.statusLabel }}</st-pill>
              </span>
              <span class="text">{{ r.title }}</span>
              <span class="detail">{{ r.detail }}</span>
            </button>
            @if (r.removable) {
              <button
                stIconButton
                class="remove"
                icon="trash"
                size="sm"
                [aria-label]="removeLabel(r.title)"
                (click)="commands.removeRule(r.check.rule.id, r.title)"
              ></button>
            }
          </li>
        } @empty {
          <li class="empty" i18n="@@rules.empty">
            No rules yet. Add one to keep people apart, together or near an exit.
          </li>
        }
      </ul>
    </section>
    <st-add-rule-dialog [(open)]="adding" />
  `,
  styleUrl: './rules-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesPanel {
  private readonly events = inject(EventStore);
  protected readonly view = inject(SeatingStore);
  protected readonly commands = inject(SeatingCommands);
  protected readonly adding = signal(false);

  protected readonly items = computed<RuleItem[]>(() => {
    const doc = this.events.doc();
    const report = this.events.report();
    if (!doc || !report) return [];
    return report.checks
      .filter((c) => c.rule.kind !== 'capacity' || c.status === 'conflict')
      .map((check) => {
        const d = describeRule(check.rule, doc);
        return {
          check,
          kind: KIND_LABEL[check.rule.kind],
          title: ruleTitle(d),
          detail: ruleDetail(d, check.status),
          status: check.status,
          statusLabel: STATUS_LABEL[check.status],
          tone: STATUS_TONE[check.status],
          removable: check.rule.kind !== 'capacity',
        };
      })
      .sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  });

  protected readonly counts = computed(() => {
    const items = this.items();
    const n = (s: RuleStatus) => items.filter((i) => i.status === s).length;
    return $localize`:@@rules.counts:${n('met')}:met: met · ${n('waiting')}:waiting: waiting · ${n('conflict')}:conflict: conflict`;
  });

  protected highlight(check: RuleCheck): void {
    this.view.highlightRule(check.rule.id, check.guestIds, check.tableIds[0] ?? null);
  }

  protected removeLabel(title: string): string {
    return $localize`:@@rules.remove:Remove rule: ${title}:rule:`;
  }
}
