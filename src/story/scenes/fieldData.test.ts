import { describe, expect, it } from 'vitest';
import { CI, DOT_COUNT, ciMaskStops, ciPath, fieldPaths, flipOrder } from './fieldData';

const count = (d: string) => (d.match(/M/g) ?? []).length;

describe('ch 12 failure field', () => {
  it('has at least 600 dots, all failing at p = 0 and all passing at p = 1 (the static state)', () => {
    expect(DOT_COUNT).toBeGreaterThanOrEqual(600);
    const p = fieldPaths(0);
    expect(count(p.fail) + count(p.failAlt)).toBe(DOT_COUNT);
    expect(p.pass).toBe('');
    const done = fieldPaths(1);
    expect(count(done.pass)).toBe(DOT_COUNT);
    expect(done.fresh).toBe('');
  });

  it('flips dots progressively, each exactly once, in a fixed order', () => {
    expect(new Set(flipOrder).size).toBe(DOT_COUNT);
    const half = fieldPaths(0.5);
    expect(count(half.pass)).toBe(Math.round(DOT_COUNT / 2));
    expect(count(half.fail) + count(half.failAlt) + count(half.pass)).toBe(DOT_COUNT);
    expect(fieldPaths(1).fail + fieldPaths(1).failAlt).toBe('');
    expect(fieldPaths(0.5)).toEqual(half); // deterministic (prerender-safe)
  });

  it('the latest flips bloom: a subset of the passing dots', () => {
    const p = fieldPaths(0.4, 20);
    expect(count(p.fresh)).toBe(20);
    const pass = new Set(p.pass.split('M'));
    expect(p.fresh.split('M').every((seg) => pass.has(seg))).toBe(true);
  });

  it('fixes suite by suite: early flips cluster, and a few stubborn failures hold out to the end', () => {
    const cell = (i: number) => `${Math.floor(Math.floor(i / 25) / 5)},${Math.floor((i % 25) / 5)}`;
    const early = new Set(flipOrder.slice(0, 40).map(cell));
    expect(early.size).toBeLessThanOrEqual(4);
    const late = new Set(flipOrder.slice(-15).map(cell));
    expect(late.size).toBeGreaterThan(5); // scattered stragglers, not one block
  });

  it('CI line heals left → right: the healing front moves with s', () => {
    const ys = (d: string) => [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
    const flat = (d: string) => ys(d).filter((y) => y === CI.height / 2).length;
    let prev = -1;
    for (let s = 0; s <= 1.0001; s += 0.1) {
      const n = flat(ciPath(s));
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(ciMaskStops(0)).toEqual({ heal: [0, 0], fail: [0, 0] }); // all failing
    expect(ciMaskStops(1)).toEqual({ heal: [1, 1], fail: [1, 1] }); // all steady
    expect(ciMaskStops(0.3).heal[0]).toBeLessThan(ciMaskStops(0.6).heal[0]);
  });

  it('CI line calms from jagged to flat', () => {
    const ys = (d: string) => [...d.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
    const spread = (d: string) => Math.max(...ys(d)) - Math.min(...ys(d));
    expect(ys(ciPath(0))).toHaveLength(CI.points);
    expect(spread(ciPath(0))).toBeGreaterThan(20);
    expect(spread(ciPath(1))).toBe(0);
  });
});
