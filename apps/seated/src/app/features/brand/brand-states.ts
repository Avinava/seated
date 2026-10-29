import { ChangeDetectionStrategy, Component } from '@angular/core';
import { StButton, StEmptyState, StIcon, StSkeleton } from '@seated/kit';
import { BrandSection } from './brand-section';

@Component({
  selector: 'st-brand-states',
  imports: [BrandSection, StButton, StEmptyState, StIcon, StSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-brand-section
      id="states"
      num="06"
      heading="States"
      i18n-heading="@@brand.states"
      intro="Every screen has an answer for empty, loading, offline and error. These shared patterns keep the answers consistent."
      i18n-intro="@@brand.statesIntro"
    >
      <ul class="gallery">
        <li>
          <div class="frame">
            <st-empty-state
              icon="calendar"
              heading="Plan your first event"
              i18n-heading="@@brand.emptyHeading"
              [level]="3"
            >
              <p i18n="@@brand.emptyBody">Start from a template or import a guest list.</p>
              <button actions type="button" stButton variant="primary" size="sm" i18n="@@brand.emptyAction">
                New event
              </button>
            </st-empty-state>
          </div>
          <p class="title" i18n="@@brand.firstRun">First run</p>
          <p class="why" i18n="@@brand.firstRunWhy">Teaches the next step instead of showing a blank page.</p>
        </li>
        <li>
          <div class="frame pad" aria-hidden="true">
            <st-skeleton width="50%" height="20px" />
            <st-skeleton height="14px" />
            <st-skeleton width="80%" height="14px" />
            <div class="row">
              <st-skeleton shape="circle" width="32px" height="32px" /><st-skeleton height="14px" />
            </div>
            <div class="row">
              <st-skeleton shape="circle" width="32px" height="32px" /><st-skeleton height="14px" />
            </div>
          </div>
          <p class="title" i18n="@@brand.loading">Loading</p>
          <p class="why" i18n="@@brand.loadingWhy">Skeletons match the layout that is coming, so nothing jumps.</p>
        </li>
        <li>
          <div class="frame">
            <st-empty-state icon="search" heading="No guests match" i18n-heading="@@brand.noResults" [level]="3">
              <p i18n="@@brand.noResultsBody">Try a shorter search, or clear the filters.</p>
              <button actions type="button" stButton size="sm" i18n="@@brand.clear">Clear filters</button>
            </st-empty-state>
          </div>
          <p class="title" i18n="@@brand.noResultsTitle">No results</p>
          <p class="why" i18n="@@brand.noResultsWhy">Says what happened and offers the way out.</p>
        </li>
        <li>
          <div class="frame pad center">
            <p class="banner" role="presentation">
              <st-icon name="wifi-off" />
              <span i18n="@@brand.offline">You're offline. Everything still works and is saved on this device.</span>
            </p>
            <p class="blocked">
              <st-icon name="alert" />
              <span i18n="@@brand.blocked">T3 has 2 free seats. The Mehtas need 4.</span>
            </p>
          </div>
          <p class="title" i18n="@@brand.offlineTitle">Offline and blocked</p>
          <p class="why" i18n="@@brand.offlineWhy">
            Explains where changes go, or why an action can't happen and what would fix it.
          </p>
        </li>
      </ul>
    </st-brand-section>
  `,
  styles: `
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: var(--st-space-4);
    }

    li {
      display: grid;
      align-content: start;
      gap: var(--st-space-1);
    }

    .frame {
      display: grid;
      align-content: center;
      min-height: 240px;
      margin-bottom: var(--st-space-2);
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-xl);
      background: var(--st-surface);
    }

    .pad {
      gap: var(--st-space-3);
      padding: var(--st-space-6);
    }

    .row {
      display: grid;
      grid-template-columns: 32px 1fr;
      gap: var(--st-space-3);
      align-items: center;
    }

    .banner,
    .blocked {
      display: flex;
      gap: var(--st-space-2);
      padding: var(--st-space-3);
      border-radius: var(--st-radius-md);
      font-size: var(--st-fs-md);
    }

    .banner {
      background: var(--st-warn-soft);
    }

    .blocked {
      background: var(--st-danger-soft);
    }

    st-icon {
      flex: none;
      margin-top: 2px;
    }

    .title {
      font-weight: 600;
    }

    .why {
      color: var(--st-text-3);
      font-size: var(--st-fs-sm);
    }
  `,
})
export class BrandStates {}
