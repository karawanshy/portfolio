import { describe, expect, it } from 'vitest';
import { days, layers, RAIL, STACK } from './daysData';

describe('ch 10 six days data', () => {
  it('has five build days and one test day, in order (the Portfolio tiles)', () => {
    expect(days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(days.map((d) => d.kind)).toEqual(['build', 'build', 'build', 'build', 'build', 'tests']);
    expect(days.map((d) => d.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('stacks the build days bottom up, each layer seated on the one below', () => {
    for (let d = 2; d <= 5; d++) expect(layers[d]!.y + layers[d]!.h).toBe(layers[d - 1]!.y);
  });

  it('brings each day in from nearby, and puts the test rail beside the stack', () => {
    for (const d of days) {
      expect(Math.hypot(d.dx, d.dy)).toBeGreaterThan(30);
      expect(Math.hypot(d.dx, d.dy)).toBeLessThan(100);
      expect(Math.abs(d.rotate)).toBeLessThanOrEqual(6);
    }
    expect(RAIL.x).toBeGreaterThan(STACK.x + STACK.w + STACK.depth.dx);
    expect(RAIL.bottom).toBeGreaterThan(layers[1]!.y);
  });
});
