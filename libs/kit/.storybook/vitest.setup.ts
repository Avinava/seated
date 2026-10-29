import { afterEach, beforeEach, expect, vi } from 'vitest';

/*
 * Angular reports render and change-detection errors through its ErrorHandler, which
 * logs instead of throwing, so a broken story could otherwise still pass. Any
 * console.error during a story fails its test.
 */
let logged: string[] = [];

beforeEach(() => {
  logged = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    logged.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  expect(logged, 'console.error while the story ran').toEqual([]);
});
