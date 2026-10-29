import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createSampleWedding, decodeShare } from '@seated/domain';
import { CLOCK } from '../../core/clock';
import { EventRepository } from '../../core/storage/event-repository';
import { MemoryRepository } from '../../core/storage/memory-repository';
import { EventStore } from '../../state/event-store';
import SharePage from './share-page';

describe('SharePage', () => {
  const now = new Date('2026-10-29T10:00:00+05:30');

  async function render(): Promise<{ el: HTMLElement; settle: () => Promise<void> }> {
    const wedding = createSampleWedding(now);
    TestBed.configureTestingModule({
      imports: [SharePage],
      providers: [
        provideRouter([]),
        { provide: EventRepository, useValue: new MemoryRepository([wedding]) },
        { provide: CLOCK, useValue: () => now },
      ],
    });
    await TestBed.inject(EventStore).open(wedding.id);
    const fixture = TestBed.createComponent(SharePage);
    const el: HTMLElement = fixture.nativeElement;
    const settle = async (): Promise<void> => {
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(el.querySelector<HTMLInputElement>('input.link')?.value).toBeTruthy();
      });
      await fixture.whenStable();
    };
    await settle();
    return { el, settle };
  }

  const token = (el: HTMLElement): string => el.querySelector<HTMLInputElement>('input.link')!.value.split('#')[1]!;

  it('builds a guest link that decodes to the event, without private fields', async () => {
    const { el } = await render();
    const url = el.querySelector<HTMLInputElement>('input.link')!.value;
    expect(url).toMatch(/\/s#[A-Za-z0-9_-]+$/);
    const payload = await decodeShare(token(el));
    expect(payload.name).toBe("Ananya & Kabir's wedding");
    expect(payload.guests).toHaveLength(84);
    expect(payload.tablemates).toBeUndefined();
    expect(el.textContent).toContain('The link carries names and tables only. No emails, meals or notes.');
  });

  it('carries the tablemates choice in the link', async () => {
    const { el, settle } = await render();
    const before = token(el);
    el.querySelector<HTMLButtonElement>('[role="switch"]')!.click();
    await vi.waitFor(async () => {
      await settle();
      expect(token(el)).not.toBe(before);
    });
    expect((await decodeShare(token(el))).tablemates).toBe(false);
  });

  it('previews the guest page in a phone frame', async () => {
    const { el } = await render();
    const preview = el.querySelector('[role="region"][aria-label="Preview of the guest page"]');
    expect(preview?.querySelector('input[type="search"]')).not.toBeNull();
    expect(preview?.textContent).toContain('Juniper Hall');
  });
});
