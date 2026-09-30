import { cubicBezier, enterProgress, pinLength, pinTimeline, staggerProgress } from './progress';

describe('cubicBezier', () => {
  it('matches the endpoints and linear()', () => {
    const linear = cubicBezier([0, 0, 1, 1]);
    for (const t of [0, 0.25, 0.5, 0.9, 1]) expect(linear(t)).toBeCloseTo(t, 5);
  });

  it('is monotonic and eases out for the reveal curve', () => {
    const ease = cubicBezier([0.22, 1, 0.36, 1]);
    let prev = 0;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = ease(t);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
    expect(ease(0.5)).toBeGreaterThan(0.8);
    expect(ease(-1)).toBe(0);
    expect(ease(2)).toBe(1);
  });
});

describe('enterProgress', () => {
  const vh = 1000;
  it('is 0 below `from`, 1 above `to`, linear between', () => {
    expect(enterProgress(990, vh, 0.96, 0.72)).toBe(0);
    expect(enterProgress(960, vh, 0.96, 0.72)).toBe(0);
    expect(enterProgress(840, vh, 0.96, 0.72)).toBeCloseTo(0.5);
    expect(enterProgress(720, vh, 0.96, 0.72)).toBe(1);
    expect(enterProgress(-500, vh, 0.96, 0.72)).toBe(1);
  });

  it('reverses exactly: the same position gives the same progress either way', () => {
    const down = [900, 850, 800].map((top) => enterProgress(top, vh, 0.96, 0.72));
    const up = [800, 850, 900].map((top) => enterProgress(top, vh, 0.96, 0.72)).reverse();
    expect(up).toEqual(down);
  });
});

describe('staggerProgress', () => {
  it('runs items one after another, the first from 0 and the last until 1', () => {
    const n = 5;
    expect(staggerProgress(0, 0, n, 0)).toBe(0);
    expect(staggerProgress(0.2, 0, n, 0)).toBeCloseTo(1);
    expect(staggerProgress(0.2, 1, n, 0)).toBeCloseTo(0);
    expect(staggerProgress(0.99, n - 1, n, 0)).toBeGreaterThan(0.9);
    expect(staggerProgress(1, n - 1, n, 0)).toBe(1);
  });

  it('with overlap, the next item starts before the previous finishes', () => {
    const n = 4;
    const o = 0.5; // window = 1 / (4 − 3 × 0.5) = 0.4, starts every 0.2
    expect(staggerProgress(0.2, 0, n, o)).toBeCloseTo(0.5);
    expect(staggerProgress(0.2, 1, n, o)).toBeCloseTo(0);
    expect(staggerProgress(0.3, 1, n, o)).toBeCloseTo(0.25);
    expect(staggerProgress(1, n - 1, n, o)).toBe(1);
    expect(staggerProgress(0.6, n - 1, n, o)).toBe(0);
  });

  it('keeps earlier items at least as far along as later ones', () => {
    for (let t = 0; t <= 1; t += 0.05)
      for (let i = 1; i < 7; i++) expect(staggerProgress(t, i - 1, 7, 0.45)).toBeGreaterThanOrEqual(staggerProgress(t, i, 7, 0.45));
  });

  it('a single item follows t', () => {
    expect(staggerProgress(0.3, 0, 1, 0.5)).toBeCloseTo(0.3);
  });
});

describe('pinTimeline', () => {
  it('starts leadIn × vh before the pin and ends count × perBox into it', () => {
    const tl = pinTimeline({ trackTop: 1000, stickyTop: 200, vh: 900, count: 7, perBox: 130, leadIn: 0.2 });
    expect(tl.pin).toBe(800);
    expect(tl.start).toBeCloseTo(620);
    expect(tl.end).toBe(800 + 910);
  });

  it('the finished state is still pinned for the end hold', () => {
    const count = 5;
    const tl = pinTimeline({ trackTop: 0, stickyTop: 0, vh: 800, count, perBox: 130, leadIn: 0.2 });
    // The stage releases pinLength px after the pin engages.
    expect(tl.pin + pinLength(count, 130, 90) - tl.end).toBe(90);
  });
});
