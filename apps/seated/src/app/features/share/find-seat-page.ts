import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ShareDecodeError, decodeShare } from '@seated/domain';
import { StEmptyState, StSkeleton } from '@seated/kit';
import { Theme } from '../../core/theme';
import { Logo } from '../../shell/logo';
import { FindSeatView } from './find-seat-view';
import { linkProblem, type LinkProblem } from './find-seat.vm';

/**
 * The public "Find your seat" page at /s#<token>. Everything it shows comes
 * from the link itself: no account, no storage, no network. The fragment is
 * never sent to a server, so a prerendered copy shows the loading state and
 * the browser takes over from there.
 */
@Component({
  selector: 'st-find-seat-page',
  imports: [FindSeatView, Logo, StEmptyState, StSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page" id="main">
      @if (payload(); as p) {
        <st-find-seat-view [payload]="p" />
      } @else if (problem(); as e) {
        <h1 class="st-sr-only" i18n="@@find.title">Find your seat</h1>
        <header class="brand">
          <st-logo [size]="22" />
          <span class="wordmark st-display">Seated</span>
        </header>
        <div class="problem" role="alert">
          <st-empty-state icon="link" [heading]="e.heading" [level]="2">
            <p>{{ e.body }}</p>
          </st-empty-state>
        </div>
      } @else {
        <div class="loading" aria-busy="true">
          <span class="st-sr-only" i18n="@@find.opening">Opening the guest page</span>
          <st-skeleton width="120px" height="22px" />
          <st-skeleton width="60%" height="36px" />
          <st-skeleton shape="block" height="48px" />
        </div>
      }
      <p class="made st-mono" i18n="@@find.madeWith">Made with Seated</p>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: var(--st-bg);
    }

    .page {
      display: flex;
      flex-direction: column;
      gap: var(--st-space-6);
      max-width: 520px;
      min-height: 100dvh;
      margin: 0 auto;
      padding: var(--st-space-8) var(--st-space-4) var(--st-space-6);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--st-space-2);
    }

    .wordmark {
      font-size: var(--st-fs-lg);
    }

    .problem {
      padding-top: var(--st-space-8);
    }

    .loading {
      display: grid;
      gap: var(--st-space-4);
    }

    .made {
      margin-top: auto;
      color: var(--st-text-3);
      text-align: center;
    }
  `,
})
export default class FindSeatPage {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly fragment = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });

  constructor() {
    // Honour the theme the person picked in the app; otherwise follow the system.
    inject(Theme);
  }

  /** The token, or null for a bare /s. Undefined while prerendering, where there is no fragment yet. */
  private readonly token = computed(() => {
    if (!this.browser) return undefined;
    const t = this.fragment()?.trim();
    return t ? t : null;
  });

  private readonly share = resource({
    params: () => this.token() ?? undefined,
    loader: ({ params }) => decodeShare(params),
  });

  protected readonly payload = computed(() => (this.share.hasValue() ? this.share.value() : null));

  protected readonly problem = computed(() => {
    const token = this.token();
    if (token === undefined) return null;
    if (token === null) return linkProblem('missing');
    const err = this.share.error();
    if (!err) return null;
    const code: LinkProblem = err instanceof ShareDecodeError ? err.code : 'corrupt';
    return linkProblem(code);
  });
}
