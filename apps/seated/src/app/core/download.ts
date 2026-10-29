import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** A file-name part: lowercase ASCII words joined by hyphens. */
export function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'event'
  );
}

/** Saves generated text as a file through a temporary object URL. Does nothing outside a browser. */
@Injectable({ providedIn: 'root' })
export class Download {
  private readonly doc = inject(DOCUMENT);

  save(fileName: string, text: string, type: string): void {
    const view = this.doc.defaultView;
    if (!view?.URL?.createObjectURL) return;
    const url = view.URL.createObjectURL(new Blob([text], { type }));
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    this.doc.body.append(a);
    a.click();
    a.remove();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
  }
}
