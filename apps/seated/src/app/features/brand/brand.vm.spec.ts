import { COLOR_TOKENS, TYPE_SCALE, type ColorToken } from '@seated/kit';
import { SEAT_SAMPLES, demoSeats, radiusSteps, swatchGroups, themeVars, typeSteps } from './brand.vm';

describe('brand vm', () => {
  it('puts every colour token in exactly one named group', () => {
    const groups = swatchGroups();
    const names = groups.flatMap((g) => g.tokens.map((t) => t.name));
    expect(names.sort()).toEqual(COLOR_TOKENS.map((t) => t.name).sort());
    expect(groups.map((g) => g.id)).not.toContain('other');
  });

  it('collects unknown tokens under Other', () => {
    const odd: ColorToken = { name: 'mystery', cssVar: '--st-mystery', light: 'x', dark: 'y', note: '' };
    expect(swatchGroups([odd]).map((g) => [g.id, g.tokens.length])).toEqual([['other', 1]]);
  });

  it.each(['light', 'dark'] as const)('re-declares every colour for the %s panel', (mode) => {
    const vars = themeVars(mode);
    for (const t of COLOR_TOKENS) expect(vars[t.cssVar]).toBe(t[mode]);
    expect(vars['color-scheme']).toBe(mode);
  });

  it('lists the type scale largest first, with its variables', () => {
    const steps = typeSteps();
    expect(steps).toHaveLength(Object.keys(TYPE_SCALE).length);
    expect(steps[0]).toEqual({ name: '5xl', size: '56px', cssVar: '--st-fs-5xl' });
    expect(steps.at(-1)?.name).toBe('2xs');
  });

  it('names a radius variable per step', () => {
    expect(radiusSteps({ md: '8px' })).toEqual([{ name: 'md', value: '8px', cssVar: '--st-radius-md' }]);
  });

  it('shows every seat state with a non-colour cue', () => {
    expect(SEAT_SAMPLES.map((s) => s.state)).toEqual(['empty', 'filled', 'picked', 'drop-target', 'conflict']);
    for (const s of SEAT_SAMPLES) expect(s.signal.length).toBeGreaterThan(10);
  });

  it.each([
    [4, -1, [], ['filled', 'filled', 'filled', 'filled']],
    [3, 1, [2], ['filled', 'picked', 'empty']],
  ])('builds %i demo seats', (count, picked, gaps, states) => {
    const seats = demoSeats(count, picked, gaps);
    expect(seats.map((s) => s.state)).toEqual(states);
    expect(seats.every((s) => s.label.startsWith('Seat '))).toBe(true);
  });
});
