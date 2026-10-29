import { DOCUMENT } from '@angular/common';
import { Injectable, inject, type DestroyRef } from '@angular/core';

/** A chord like 'mod+k', 'mod+shift+z' or 'escape'. `mod` is Cmd on Apple platforms, Ctrl elsewhere. */
export type Chord = string;

interface Binding {
  readonly chord: Chord;
  readonly run: (e: KeyboardEvent) => void;
  /** Fire even while typing in a field. Defaults to false, except for mod chords. */
  readonly inInputs: boolean;
}

/**
 * One document-level keydown listener for app shortcuts. Components register
 * bindings for their lifetime; the latest registration wins, so an open dialog
 * can take Escape from the page beneath it.
 */
@Injectable({ providedIn: 'root' })
export class Hotkeys {
  private readonly bindings: Binding[] = [];
  private readonly isApple = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');

  constructor() {
    inject(DOCUMENT).addEventListener('keydown', (e) => this.handle(e));
  }

  /** Register a binding until `destroyRef` fires. Returns an unregister function. */
  on(chord: Chord, run: (e: KeyboardEvent) => void, destroyRef?: DestroyRef, inInputs?: boolean): () => void {
    const binding: Binding = { chord: normalize(chord), run, inInputs: inInputs ?? chord.includes('mod') };
    this.bindings.push(binding);
    const off = () => {
      const i = this.bindings.indexOf(binding);
      if (i >= 0) this.bindings.splice(i, 1);
    };
    destroyRef?.onDestroy(off);
    return off;
  }

  /** The chord as a person reads it, e.g. "⌘K" or "Ctrl+K". */
  label(chord: Chord): string {
    const parts = normalize(chord).split('+');
    const map: Record<string, string> = this.isApple
      ? { mod: '⌘', shift: '⇧', alt: '⌥' }
      : { mod: 'Ctrl+', shift: 'Shift+', alt: 'Alt+' };
    return parts.map((p) => map[p] ?? p.toUpperCase()).join('');
  }

  private handle(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.isComposing) return;
    const chord = this.chordOf(e);
    const typing = isTyping(e.target);
    for (const b of [...this.bindings].reverse()) {
      if (b.chord !== chord || (typing && !b.inInputs)) continue;
      e.preventDefault();
      b.run(e);
      return;
    }
  }

  private chordOf(e: KeyboardEvent): Chord {
    const mod = this.isApple ? e.metaKey : e.ctrlKey;
    const parts = [mod && 'mod', e.shiftKey && 'shift', e.altKey && 'alt', e.key.toLowerCase()];
    return parts.filter(Boolean).join('+');
  }
}

function normalize(chord: Chord): Chord {
  const keys = chord.toLowerCase().split('+');
  const order = ['mod', 'shift', 'alt'];
  const mods = order.filter((m) => keys.includes(m));
  const rest = keys.filter((k) => !order.includes(k));
  return [...mods, ...rest].join('+');
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}
