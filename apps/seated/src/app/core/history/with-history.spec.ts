import { TestBed } from '@angular/core/testing';
import { signalStore, withState } from '@ngrx/signals';
import { withHistory } from './with-history';

interface Doc {
  readonly n: number;
}

const DocStore = signalStore(withState<{ doc: Doc | null }>({ doc: { n: 0 } }), withHistory<Doc>(3));

describe('withHistory', () => {
  let store: InstanceType<typeof DocStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [DocStore] });
    store = TestBed.inject(DocStore);
  });

  it('records commits and walks back and forward', () => {
    store.commit('one', { n: 1 });
    store.commit('two', { n: 2 });
    expect(store.undoLabel()).toBe('two');

    expect(store.undo()).toBe('two');
    expect(store.doc()).toEqual({ n: 1 });
    expect(store.redoLabel()).toBe('two');

    expect(store.redo()).toBe('two');
    expect(store.doc()).toEqual({ n: 2 });
    expect(store.canRedo()).toBe(false);
  });

  it('drops the redo stack on a new commit', () => {
    store.commit('one', { n: 1 });
    store.undo();
    store.commit('other', { n: 9 });
    expect(store.canRedo()).toBe(false);
    expect(store.undoLabel()).toBe('other');
  });

  it('keeps at most the configured number of steps', () => {
    for (let n = 1; n <= 5; n++) store.commit(`c${n}`, { n });
    expect(store.past().map((e) => e.label)).toEqual(['c3', 'c4', 'c5']);
  });

  it('ignores commits that change nothing, and undo with no history', () => {
    const same = store.doc()!;
    store.commit('noop', same);
    expect(store.canUndo()).toBe(false);
    expect(store.undo()).toBeNull();
    expect(store.redo()).toBeNull();
  });

  it('resets without recording', () => {
    store.commit('one', { n: 1 });
    store.reset({ n: 7 });
    expect(store.doc()).toEqual({ n: 7 });
    expect(store.canUndo()).toBe(false);
  });
});
