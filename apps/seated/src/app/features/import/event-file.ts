import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toExportFile } from '@seated/domain';
import { Announcer, StButton, StCard, StIcon, ToastService } from '@seated/kit';
import { CLOCK } from '../../core/clock';
import { Download, slug } from '../../core/download';
import { EventStore } from '../../state/event-store';
import { EventsStore } from '../../state/events-store';
import { exportFileName, restoreError } from './import.vm';

/**
 * Move a whole event between browsers: export it as a versioned JSON file,
 * or restore one. Older files are upgraded on the way in.
 */
@Component({
  selector: 'st-event-file',
  imports: [StButton, StCard, StIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-card padding="lg">
      <h2 class="title" i18n="@@import.fileTitle">Move this event to another device</h2>
      <p class="st-muted body" i18n="@@import.fileBody">
        Events live in this browser. Export one as a Seated file to back it up or open it elsewhere. Files are
        versioned, so older exports still open.
      </p>
      <div class="actions">
        <button type="button" stButton (click)="exportEvent()">
          <st-icon name="arrow-down" />
          <span i18n="@@import.export">Export event</span>
        </button>
        <input
          #restore
          class="st-sr-only"
          type="file"
          accept=".json,application/json"
          tabindex="-1"
          aria-hidden="true"
          (change)="onRestore(restore)"
        />
        <button type="button" stButton variant="ghost" (click)="restore.click()">
          <st-icon name="upload" />
          <span i18n="@@import.restore">Import a Seated file</span>
        </button>
        <span class="file st-num">{{ fileName() }}</span>
      </div>
      @if (error(); as e) {
        <p class="error" role="alert"><st-icon name="alert" />{{ e }}</p>
      }
    </st-card>
  `,
  styles: `
    .title {
      font-size: var(--st-fs-lg);
      font-weight: 600;
    }

    .body {
      max-width: 62ch;
      margin-top: var(--st-space-1);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--st-space-2);
      margin-top: var(--st-space-4);
    }

    .file {
      color: var(--st-text-3);
      font-size: var(--st-fs-sm);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--st-space-2);
      margin-top: var(--st-space-3);
      color: var(--st-danger);
      font-weight: 500;
    }
  `,
})
export class EventFile {
  private readonly store = inject(EventStore);
  private readonly events = inject(EventsStore);
  private readonly clock = inject(CLOCK);
  private readonly files = inject(Download);
  private readonly toast = inject(ToastService);
  private readonly announcer = inject(Announcer);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);
  protected readonly fileName = computed(() => {
    const e = this.store.doc();
    return e ? exportFileName(slug(e.name), this.clock()) : '';
  });

  protected exportEvent(): void {
    const e = this.store.doc();
    if (!e) return;
    const now = this.clock();
    this.files.save(this.fileName(), JSON.stringify(toExportFile(e, now.toISOString()), null, 2), 'application/json');
    this.say($localize`:@@import.exported:Exported ${this.fileName()}:file:`);
  }

  protected async onRestore(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const result = await this.events.importFile(await file.text());
    if (!result.ok) {
      this.error.set(restoreError(result.errors));
      return;
    }
    this.error.set(null);
    const { event } = result;
    this.say($localize`:@@import.restored:Restored ${event.name}:event:`);
    // A file for the open event replaces it on this device: reopen so the screens show the restored copy.
    if (event.id === this.store.doc()?.id) await this.store.open(event.id, { reload: true });
    await this.router.navigate(['/events', event.id, 'seating']);
  }

  private say(message: string): void {
    this.toast.show({ message });
    void this.announcer.announce(message);
  }
}
