import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createSampleWedding } from '@seated/domain';
import { CLOCK } from '../../core/clock';
import { EventRepository } from '../../core/storage/event-repository';
import { MemoryRepository } from '../../core/storage/memory-repository';
import { EventStore } from '../../state/event-store';
import ImportPage from './import-page';

describe('ImportPage', () => {
  const now = new Date('2026-10-29T10:00:00+05:30');
  let fixture: ComponentFixture<ImportPage>;
  let store: EventStore;
  let el: HTMLElement;

  const button = (text: string | RegExp): HTMLButtonElement => {
    const found = [...el.querySelectorAll('button')].find((b) =>
      typeof text === 'string' ? b.textContent?.trim() === text : text.test(b.textContent ?? ''),
    );
    if (!found) throw new Error(`No button "${text}"`);
    return found;
  };

  const settle = async (): Promise<void> => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    const wedding = createSampleWedding(now);
    TestBed.configureTestingModule({
      imports: [ImportPage],
      providers: [
        provideRouter([]),
        { provide: EventRepository, useValue: new MemoryRepository([wedding]) },
        { provide: CLOCK, useValue: () => now },
      ],
    });
    store = TestBed.inject(EventStore);
    await store.open(wedding.id);
    fixture = TestBed.createComponent(ImportPage);
    el = fixture.nativeElement;
    await settle();
  });

  it('imports the sample CSV as one undoable step', async () => {
    expect(store.guests()).toHaveLength(120);
    expect(el.querySelector('[aria-current="step"]')?.textContent).toContain('Choose file');

    button(/Use sample: late-rsvps\.csv/).click();
    await settle();
    expect(el.querySelector('[aria-current="step"]')?.textContent).toContain('Match columns');
    expect(el.textContent).toContain('late-rsvps.csv · 10 columns · 12 rows');
    // The name column is suggested and previewed.
    expect(el.textContent).toContain('Farah Qureshi');

    button(/Review rows/).click();
    await settle();
    expect(el.textContent).toContain('12 rows: 9 new, 1 to merge, 2 skipped (1 missing name, 1 duplicate)');
    expect(el.querySelectorAll('tbody tr')).toHaveLength(12);

    // Filter to the duplicates: Dev (same email, merge) and Kamla (same name, skip).
    const dupes = [...el.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((b) =>
      b.textContent?.includes('Duplicates'),
    );
    dupes?.click();
    await settle();
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);

    button('Import 10 rows').click();
    await settle();
    expect(store.guests()).toHaveLength(129);
    expect(store.undoLabel()).toBe('import 9 guests and update 1');
    expect(el.textContent).toContain('Import finished');

    button(/Undo import/).click();
    await settle();
    expect(store.guests()).toHaveLength(120);
    expect(el.querySelector('[aria-current="step"]')?.textContent).toContain('Review');
  });

  it('lets a duplicate be kept instead of skipped', async () => {
    button(/Use sample/).click();
    await settle();
    button(/Review rows/).click();
    await settle();
    const group = el.querySelector('[role="radiogroup"][aria-label*="Kamla"]');
    const keep = [...(group?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [])].find(
      (b) => b.textContent?.trim() === 'Keep both',
    );
    keep?.click();
    await settle();
    expect(el.textContent).toContain('12 rows: 10 new, 1 to merge, 1 skipped (1 missing name)');
  });

  it('needs a name column before review', async () => {
    button(/Use sample/).click();
    await settle();
    const select = el.querySelector<HTMLSelectElement>('select');
    select!.value = '';
    select!.dispatchEvent(new Event('change'));
    await settle();
    expect(button(/Review rows/).disabled).toBe(true);
    expect(el.textContent).toContain('Choose the column with guest names to continue');
  });
});
