import { Injectable, inject } from '@angular/core';
import type { OpResult } from '@seated/domain';
import { Announcer, ToastService } from '@seated/kit';
import { failure } from '../i18n/messages';
import type { Command } from './command';
import { EventStore } from './event-store';

/**
 * The one place screens run commands. It applies the change, then tells the
 * person what happened: a toast with Undo for visible changes, a polite
 * announcement for screen readers, and a plain reason when a change is refused.
 */
@Injectable({ providedIn: 'root' })
export class Actions {
  private readonly store = inject(EventStore);
  private readonly toast = inject(ToastService);
  private readonly announcer = inject(Announcer);

  /** Run a command. `done` is the confirmation shown with Undo; omit it for quiet edits like typing. */
  run(cmd: Command, done?: string): OpResult {
    const result = this.store.execute(cmd);
    if (!result.ok) {
      const message = failure(result);
      this.toast.show({ message, tone: 'danger' });
      this.announcer.alert(message);
    } else if (done) {
      this.toast.show({ message: done, action: { label: $localize`:@@action.undo:Undo`, run: () => this.undo() } });
      this.announcer.announce(done);
    }
    return result;
  }

  undo(): void {
    const label = this.store.undo();
    if (label === null) return;
    const message = $localize`:@@history.undid:Undid: ${label}:label:`;
    this.toast.show({ message, action: { label: $localize`:@@action.redo:Redo`, run: () => this.redo() } });
    this.announcer.announce(message);
  }

  redo(): void {
    const label = this.store.redo();
    if (label === null) return;
    const message = $localize`:@@history.redid:Redid: ${label}:label:`;
    this.toast.show({ message, action: { label: $localize`:@@action.undo:Undo`, run: () => this.undo() } });
    this.announcer.announce(message);
  }
}
