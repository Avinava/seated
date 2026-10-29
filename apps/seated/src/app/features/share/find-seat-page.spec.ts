import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { createSampleWedding, encodeShare } from '@seated/domain';
import FindSeatPage from './find-seat-page';

describe('FindSeatPage', () => {
  const wedding = createSampleWedding(new Date('2026-10-29T10:00:00+05:30'));

  async function open(url: string): Promise<{ harness: RouterTestingHarness; el: HTMLElement }> {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 's', component: FindSeatPage }])] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    const el = harness.routeNativeElement as HTMLElement;
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(el.querySelector('[aria-busy="true"]')).toBeNull();
    });
    return { harness, el };
  }

  it('decodes a real link and finds Kamla', async () => {
    const { harness, el } = await open(`/s#${await encodeShare(wedding)}`);
    expect(el.textContent).toContain("Ananya & Kabir's wedding");
    expect(el.textContent).toContain('Juniper Hall');

    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'kamla';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(el.querySelector('.count')?.textContent).toContain('1 match');

    el.querySelector<HTMLButtonElement>('.match')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(el.querySelector('.where')?.textContent).toContain('T1');
    expect(el.querySelector('.where')?.textContent).toContain('Seat 1');
    expect(el.querySelector('button.st-seat[data-state="picked"]')?.textContent).toContain('Seat 1, you');
    expect(el.textContent).toContain('At your table');
  });

  it('hides tablemates when the link says so', async () => {
    const { harness, el } = await open(`/s#${await encodeShare(wedding, { tablemates: false })}`);
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'Kamla Mehta';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    el.querySelector<HTMLButtonElement>('.match')!.click();
    harness.detectChanges();
    expect(el.textContent).not.toContain('At your table');
    // Taken seats show a dot, never initials, and the table still counts them.
    const others = [...el.querySelectorAll('button.st-seat[data-state="filled"] .initials')];
    expect(others.length).toBe(8);
    expect(others.every((s) => s.textContent?.trim() === '•')).toBe(true);
    expect(el.querySelector('st-table')?.textContent).toContain('9/10');
  });

  it('says when no name matches', async () => {
    const { harness, el } = await open(`/s#${await encodeShare(wedding)}`);
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'Zebedee';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(el.textContent).toContain("We can't find that name. Try your first name only, or ask the hosts.");
  });

  it.each([
    ['/s#***', 'This link looks cut short'],
    ['/s#AQID', "We can't read this link"],
    ['/s', 'Open the link from your hosts'],
  ])('explains %s kindly', async (url, heading) => {
    const { el } = await open(url);
    expect(el.querySelector('[role="alert"] h2')?.textContent).toContain(heading);
  });
});
