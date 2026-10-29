import { DOCUMENT, LocationStrategy } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { encodeShare, toSharePayload } from '@seated/domain';
import { Announcer, StButton, StCard, StIcon, StSkeleton, StSwitch, ToastService } from '@seated/kit';
import { count } from '../../i18n/messages';
import { EventStore } from '../../state/event-store';
import { FindSeatView } from './find-seat-view';
import { PhoneFrame } from './phone-frame';
import { QrCard } from './qr-card';
import { slug } from '../../core/download';
import { shareUrl } from './share.vm';

/**
 * Share (organiser): the guest link, its QR code and a live preview of what
 * guests see. The link carries the seating in its fragment, so there is no
 * server and no account; it changes whenever the seating does.
 */
@Component({
  selector: 'st-share-page',
  imports: [FindSeatView, PhoneFrame, QrCard, StButton, StCard, StIcon, StSkeleton, StSwitch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-page.html',
  styleUrl: './share-page.scss',
})
export default class SharePage {
  private readonly store = inject(EventStore);
  private readonly doc = inject(DOCUMENT);
  private readonly baseHref = inject(LocationStrategy).getBaseHref();
  private readonly toast = inject(ToastService);
  private readonly announcer = inject(Announcer);

  protected readonly event = this.store.doc;
  protected readonly tablemates = signal(true);

  /** What the guest page will show; the preview renders it without a round trip through the link. */
  protected readonly payload = computed(() => {
    const e = this.event();
    return e ? toSharePayload(e, { tablemates: this.tablemates() }) : null;
  });

  protected readonly seatedText = computed(() => count(this.payload()?.guests.length ?? 0));

  private readonly token = resource({
    params: () => {
      const e = this.event();
      return e ? { e, tablemates: this.tablemates() } : undefined;
    },
    loader: ({ params }) => encodeShare(params.e, { tablemates: params.tablemates }),
  });

  protected readonly link = computed(() => {
    if (!this.token.hasValue()) return null;
    const origin = this.doc.location?.origin ?? '';
    return shareUrl(origin, this.baseHref, this.token.value());
  });

  protected readonly qrFile = computed(() => `seated-${slug(this.event()?.name ?? '')}-qr.svg`);

  protected async copy(input: HTMLInputElement): Promise<void> {
    const link = this.link();
    if (!link) return;
    try {
      await this.doc.defaultView?.navigator.clipboard.writeText(link);
      const message = $localize`:@@share.copied:Link copied`;
      this.toast.show({ message });
      void this.announcer.announce(message);
    } catch {
      // No clipboard permission: select the text so Ctrl+C or Cmd+C finishes the job.
      input.focus();
      input.select();
      const message = $localize`:@@share.copyManual:Press Ctrl+C or Cmd+C to copy the selected link`;
      this.toast.show({ message });
      void this.announcer.announce(message);
    }
  }
}
