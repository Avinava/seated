import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { StButton, StCard, StIcon } from '@seated/kit';
import { Download } from '../../core/download';
import { encodeQr, qrPath, qrSvg } from './qr';

const QUIET = 4;

/**
 * The share link as a QR code, drawn as one SVG path from our own encoder.
 * The code is always dark on light, in both themes, because that is what
 * phone cameras read best.
 */
@Component({
  selector: 'st-qr-card',
  imports: [StButton, StCard, StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-card padding="lg">
      <div class="layout">
        <div class="code">
          @if (code(); as c) {
            <svg
              role="img"
              [attr.viewBox]="'0 0 ' + dim() + ' ' + dim()"
              shape-rendering="crispEdges"
              [attr.aria-label]="accessibleName()"
            >
              <rect class="paper" [attr.width]="dim()" [attr.height]="dim()" />
              <path class="ink" [attr.d]="path()" />
            </svg>
          } @else {
            <p class="st-muted" i18n="@@share.qrTooLong">This link is too long for a QR code.</p>
          }
        </div>
        <div class="copy">
          <h2 class="title" i18n="@@share.qrTitle">QR code</h2>
          <p class="st-muted" i18n="@@share.qrBody">
            Print it on the welcome board or the back of a place card. Guests point their camera at it and land on their
            seat.
          </p>
          @if (code(); as c) {
            <p class="meta st-mono" i18n="@@share.qrMeta">Version {{ c.version }} · {{ c.size }} modules</p>
            <button type="button" stButton (click)="download()">
              <st-icon name="arrow-down" />
              <span i18n="@@share.qrDownload">Download SVG</span>
            </button>
          }
        </div>
      </div>
    </st-card>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
      gap: var(--st-space-6);
      align-items: center;
    }

    @media (max-width: 640px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }

    .code {
      aspect-ratio: 1;
      border-radius: var(--st-radius-lg);
      overflow: hidden;
      box-shadow: 0 0 0 1px var(--st-line);
    }

    svg {
      width: 100%;
      height: 100%;
    }

    /* A QR code needs real contrast: paper and ink stay fixed whatever the theme. */
    .paper {
      fill: white;
    }

    .ink {
      fill: black;
    }

    .copy {
      display: grid;
      gap: var(--st-space-3);
      justify-items: start;
    }

    .title {
      font-size: var(--st-fs-lg);
      font-weight: 600;
    }

    .meta {
      color: var(--st-text-3);
    }
  `,
})
export class QrCard {
  private readonly files = inject(Download);

  readonly link = input.required<string>();
  /** Used for the image's accessible name and the downloaded file. */
  readonly eventName = input.required<string>();
  readonly fileName = input.required<string>();

  protected readonly code = computed(() => {
    try {
      return encodeQr(this.link());
    } catch {
      return null;
    }
  });
  protected readonly dim = computed(() => (this.code()?.size ?? 0) + QUIET * 2);
  protected readonly path = computed(() => {
    const c = this.code();
    return c ? qrPath(c, QUIET) : '';
  });
  protected readonly accessibleName = computed(
    () => $localize`:@@share.qrName:QR code that opens the guest page for ${this.eventName()}:event:`,
  );

  protected download(): void {
    const c = this.code();
    if (c) this.files.save(this.fileName(), qrSvg(c, this.accessibleName(), QUIET), 'image/svg+xml');
  }
}
