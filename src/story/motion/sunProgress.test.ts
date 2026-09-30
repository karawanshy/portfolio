import { describe, expect, it } from 'vitest';
import { motion } from '@/motion/config';
import { createSunCurve, type SunState } from './sunProgress';

const S: SunState[] = [
  { h: 0, b: 0.6 },
  { h: 0.2, b: 0.8 },
  { h: -0.4, b: 0.2 },
  { h: 1, b: 1 },
];
const anchors = [0, 300, 900, 2000];

describe('sun curve', () => {
  const c = createSunCurve(anchors, S, 2000);

  it('passes through every keyframe at its anchor', () => {
    anchors.forEach((a, i) => {
      expect(c.at(a).h).toBeCloseTo(S[i]!.h, 9);
      expect(c.at(a).b).toBeCloseTo(S[i]!.b, 9);
    });
  });

  it('moves at every step between the ends (no flat holds), barely overshooting at a turning point', () => {
    let prev = c.at(0);
    for (let y = 20; y <= 2000; y += 20) {
      const s = c.at(y);
      expect(s.h !== prev.h || s.b !== prev.b, `moves at ${y}`).toBe(true);
      expect(s.h).toBeGreaterThanOrEqual(-0.45);
      expect(s.h).toBeLessThanOrEqual(1 + 1e-9);
      prev = s;
    }
    // Monotone where it isn't turning: 900 → 2000 only rises once past the turn.
    let last = c.at(1000).h;
    for (let y = 1010; y <= 2000; y += 10) {
      expect(c.at(y).h).toBeGreaterThanOrEqual(last - 1e-12);
      last = c.at(y).h;
    }
  });

  it('has no corner at a keyframe (C1)', () => {
    const slope = (y: number) => (c.at(y + 0.01).b - c.at(y - 0.01).b) / 0.02;
    expect(slope(300 - 0.5)).toBeCloseTo(slope(300 + 0.5), 3);
  });

  it('clamps anchors to the page and keeps them increasing', () => {
    const short = createSunCurve([0, 300, 300, 9000], S, 1000);
    expect(short.anchors).toEqual([0, 300, 301, 1000]);
    expect(short.at(1000)).toEqual(S[3]);
  });

  it('config: one keyframe per scene, in range, dark in ch 7 and 16, up at the end, and no two neighbours equal', () => {
    const k = motion.story.sun.chapters;
    expect(k).toHaveLength(19);
    k.forEach(({ h, b }) => {
      expect(h).toBeGreaterThanOrEqual(-1);
      expect(h).toBeLessThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    });
    expect(k[0]).toEqual({ h: 0, b: expect.any(Number) });
    for (const n of [7, 16]) expect(k[n]!.h).toBeLessThan(0);
    expect(k[16]!.b).toBe(Math.min(...k.map((s) => s.b)));
    expect(k[17]!.h).toBeGreaterThan(0.8);
    expect(k[18]).toEqual({ h: 1, b: 1 });
    // The sun never holds still between two chapters.
    for (let i = 1; i < k.length; i++) expect(k[i]!.h !== k[i - 1]!.h || k[i]!.b !== k[i - 1]!.b).toBe(true);
  });

  it('config: through the whole story (evenly spaced chapters) it visibly moves at every 40px step', () => {
    const k = motion.story.sun.chapters;
    const c = createSunCurve(k.map((_, i) => i * 1500), k, (k.length - 1) * 1500);
    let prev = c.at(0);
    for (let y = 40; y <= (k.length - 1) * 1500; y += 40) {
      const s = c.at(y);
      expect(Math.max(Math.abs(s.h - prev.h), Math.abs(s.b - prev.b)), `moves at ${y}`).toBeGreaterThan(2e-5);
      prev = s;
    }
  });
});
