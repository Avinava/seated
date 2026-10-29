import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
  viewChild,
} from '@angular/core';
import type { SharePayload } from '@seated/domain';
import { StButton, StField, StIcon, StInput, StTable } from '@seated/kit';
import { localDate } from '../../core/dates';
import { Logo } from '../../shell/logo';
import { MIN_QUERY, matchCountText, matchGuests, seatResult, type GuestMatch } from './find-seat.vm';

/**
 * The guest's view of a share link: search by name, then see the table drawn
 * with your seat lit. Pure presentation over a `SharePayload`, so the public
 * page and the organiser's phone preview render exactly the same thing.
 */
@Component({
  selector: 'st-find-seat-view',
  imports: [DatePipe, StButton, StField, StIcon, StInput, StTable, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'st-find-seat-view' },
  template: `
    <header class="brand">
      <st-logo [size]="22" />
      <span class="wordmark st-display">Seated</span>
    </header>

    <div class="event">
      <p class="when st-mono">
        <time [attr.datetime]="payload().date">{{ date() | date: 'EEE d MMM y' }}</time>
        · {{ payload().venue }}, {{ payload().city }}
      </p>
      <div class="name st-display" role="heading" [attr.aria-level]="headingLevel()">{{ payload().name }}</div>
    </div>

    @if (result(); as r) {
      <section class="result" aria-labelledby="find-result-heading">
        <p class="hi">
          <span i18n="@@find.hi">Hi {{ r.firstName }}, you're at</span>
        </p>
        <div
          class="where"
          #resultHeading
          id="find-result-heading"
          tabindex="-1"
          role="heading"
          [attr.aria-level]="headingLevel() + 1"
        >
          <span class="table st-display">{{ r.table }}</span>
          <span class="seat st-num" i18n="@@find.seatNo">Seat {{ r.seat }}</span>
        </div>
        <div class="drawing">
          <st-table [shape]="r.shape" [label]="r.table" [seats]="r.seats" [ariaLabel]="tableLabel()" />
        </div>
        @if (r.showMates && r.mates.length) {
          <div class="mates">
            <p class="mates-title st-mono" i18n="@@find.matesTitle">At your table</p>
            <ul>
              @for (m of r.mates; track m.seat) {
                <li>
                  <span class="st-num mate-seat">{{ m.seat }}</span
                  >{{ m.name }}
                </li>
              }
            </ul>
          </div>
        }
        <button type="button" stButton variant="ghost" (click)="reset()">
          <st-icon name="search" />
          <span i18n="@@find.notYou">Not you? Search again</span>
        </button>
      </section>
    } @else {
      <form class="search" role="search" (submit)="$event.preventDefault(); pickFirst()">
        <st-field
          label="Type your name"
          i18n-label="@@find.label"
          hint="First or last name works"
          i18n-hint="@@find.hint"
        >
          <input
            #search
            stInput
            class="big"
            type="search"
            autocomplete="off"
            autocapitalize="words"
            spellcheck="false"
            [value]="query()"
            (input)="query.set(search.element.value)"
          />
        </st-field>
      </form>

      <p class="count" aria-live="polite" [class.miss]="tried() && !matches().length">{{ countText() }}</p>

      @if (matches().length) {
        <ul class="matches" aria-label="Matching guests" i18n-aria-label="@@find.matchesLabel">
          @for (m of matches(); track m.key) {
            <li>
              <button type="button" class="match" (click)="pick(m)">
                <span class="match-name">{{ m.name }}</span>
                <span class="match-where st-mono" i18n="@@find.matchWhere">{{ m.table }} · seat {{ m.seat }}</span>
                <st-icon name="chevron-right" />
              </button>
            </li>
          }
        </ul>
      }
    }
  `,
  styleUrl: './find-seat-view.scss',
})
export class FindSeatView {
  private readonly injector = inject(Injector);

  readonly payload = input.required<SharePayload>();
  /** Heading level of the event name: 1 on the public page, lower inside a preview. */
  readonly headingLevel = input(1, { transform: numberAttribute });

  protected readonly query = signal('');
  protected readonly picked = signal<GuestMatch | null>(null);
  private readonly resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');
  private readonly searchInput = viewChild<StInput>('search');

  protected readonly date = computed(() => localDate(this.payload().date));
  protected readonly matches = computed(() => matchGuests(this.payload(), this.query()));
  protected readonly tried = computed(() => this.query().trim().length >= MIN_QUERY);
  protected readonly countText = computed(() => (this.tried() ? matchCountText(this.matches().length) : ''));
  protected readonly result = computed(() => {
    const m = this.picked();
    return m ? seatResult(this.payload(), m) : null;
  });
  protected readonly tableLabel = computed(() => {
    const r = this.result();
    return r ? $localize`:@@find.tableLabel:${r.table}:table:, your seat is ${r.seat}:seat:` : '';
  });

  protected pick(m: GuestMatch): void {
    this.picked.set(m);
    afterNextRender(() => this.resultHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  protected pickFirst(): void {
    const first = this.matches()[0];
    if (first) this.pick(first);
  }

  protected reset(): void {
    this.picked.set(null);
    this.query.set('');
    afterNextRender(() => this.searchInput()?.element.focus(), { injector: this.injector });
  }
}
