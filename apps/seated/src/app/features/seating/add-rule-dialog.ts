import { ChangeDetectionStrategy, Component, computed, effect, inject, model, signal } from '@angular/core';
import { describeRule, type Rule, type RuleDraft } from '@seated/domain';
import { StButton, StDialog, StField, StInput, StSegmented, type SegmentedOption } from '@seated/kit';
import { ruleTitle } from '../../i18n/messages';
import { EventStore } from '../../state/event-store';
import { SeatingCommands } from './seating-commands';

type Kind = Rule['kind'];

/** A small form for the three explicit rules: keep two guests apart, keep a party together, seat near an exit. */
@Component({
  selector: 'st-add-rule-dialog',
  imports: [StDialog, StButton, StField, StInput, StSegmented],
  template: `
    <st-dialog
      [(open)]="open"
      heading="Add a rule"
      i18n-heading="@@addRule.heading"
      description="Rules are checked live, and auto-seat never breaks one."
      i18n-description="@@addRule.description"
    >
      <form id="add-rule-form" class="form" (submit)="submit($event)">
        <st-segmented aria-label="Kind of rule" i18n-aria-label="@@addRule.kind" [options]="kinds" [(value)]="kind" />
        @switch (kind()) {
          @case ('apart') {
            <st-field label="First guest" i18n-label="@@addRule.first">
              <select stInput [value]="first()" (change)="first.set($any($event.target).value)">
                <option value="" i18n="@@addRule.choose">Choose a guest</option>
                @for (g of guests(); track g.id) {
                  <option [value]="g.id">{{ g.name }}</option>
                }
              </select>
            </st-field>
            <st-field label="Second guest" i18n-label="@@addRule.second" [error]="sameError()">
              <select stInput [value]="second()" (change)="second.set($any($event.target).value)">
                <option value="" i18n="@@addRule.choose">Choose a guest</option>
                @for (g of guests(); track g.id) {
                  <option [value]="g.id">{{ g.name }}</option>
                }
              </select>
            </st-field>
          }
          @case ('together') {
            <st-field label="Party" i18n-label="@@addRule.party">
              <select stInput [value]="party()" (change)="party.set($any($event.target).value)">
                <option value="" i18n="@@addRule.chooseParty">Choose a party</option>
                @for (p of parties(); track p.id) {
                  <option [value]="p.id">{{ p.label }}</option>
                }
              </select>
            </st-field>
          }
          @case ('near-exit') {
            <st-field label="Guest" i18n-label="@@addRule.guest">
              <select stInput [value]="first()" (change)="first.set($any($event.target).value)">
                <option value="" i18n="@@addRule.choose">Choose a guest</option>
                @for (g of guests(); track g.id) {
                  <option [value]="g.id">{{ g.name }}</option>
                }
              </select>
            </st-field>
          }
        }
        @if (preview(); as p) {
          <p class="preview">{{ p }}</p>
        }
      </form>
      <ng-container stDialogFooter>
        <button stButton type="button" (click)="open.set(false)" i18n="@@addRule.cancel">Cancel</button>
        <button
          stButton
          variant="primary"
          type="submit"
          form="add-rule-form"
          [disabled]="!draft()"
          i18n="@@addRule.save"
        >
          Add rule
        </button>
      </ng-container>
    </st-dialog>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--st-space-4);
    }

    .preview {
      margin: 0;
      padding: var(--st-space-3);
      border-radius: var(--st-radius-md);
      background: var(--st-surface-2);
      font-size: var(--st-fs-md);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRuleDialog {
  private readonly events = inject(EventStore);
  private readonly commands = inject(SeatingCommands);

  readonly open = model(false);

  protected readonly kinds: readonly SegmentedOption<Kind>[] = [
    { value: 'apart', label: $localize`:@@addRule.apart:Keep apart` },
    { value: 'together', label: $localize`:@@addRule.together:Keep together` },
    { value: 'near-exit', label: $localize`:@@addRule.nearExit:Near exit` },
  ];
  protected readonly kind = signal<Kind | null>('apart');
  protected readonly first = signal('');
  protected readonly second = signal('');
  protected readonly party = signal('');

  protected readonly guests = computed(() =>
    this.events
      .guests()
      .filter((g) => g.rsvp !== 'declined')
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  protected readonly parties = computed(() =>
    [...(this.events.doc()?.parties ?? [])].sort((a, b) => a.label.localeCompare(b.label)),
  );

  protected readonly sameError = computed(() =>
    this.first() && this.first() === this.second() ? $localize`:@@addRule.same:Choose two different guests` : null,
  );

  protected readonly draft = computed<RuleDraft | null>(() => {
    switch (this.kind()) {
      case 'apart':
        return this.first() && this.second() && this.first() !== this.second()
          ? { kind: 'apart', guests: [this.first(), this.second()] }
          : null;
      case 'together':
        return this.party() ? { kind: 'together', partyId: this.party() } : null;
      case 'near-exit':
        return this.first() ? { kind: 'near-exit', guestId: this.first() } : null;
      default:
        return null;
    }
  });

  protected readonly preview = computed(() => {
    const d = this.draft();
    const doc = this.events.doc();
    return d && doc ? ruleTitle(describeRule({ ...d, id: '' } as Rule, doc)) : null;
  });

  constructor() {
    // Start fresh each time the dialog opens.
    effect(() => {
      if (!this.open()) return;
      this.kind.set('apart');
      this.first.set('');
      this.second.set('');
      this.party.set('');
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const d = this.draft();
    const title = this.preview();
    if (!d || !title) return;
    if (this.commands.addRule(d, title)) this.open.set(false);
  }
}
