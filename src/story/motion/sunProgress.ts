/**
 * The sun's state along the Story's scroll (pure; see motion.story.sun): a monotone cubic
 * (Fritsch–Carlson) through the chapters' keyframes, placed at their anchors (page px), for
 * height and brightness separately. C1 (no corners at the keyframes); at a turning point it
 * doesn't stop dead but turns gently (a slight overshoot); otherwise it never passes a keyframe.
 * So the sun moves wherever the page scrolls between the first and last anchor.
 */
export interface SunState {
  /** Height: −1 sunk below the horizon, 0 a half-sun on it, 1 fully risen. */
  h: number;
  /** Brightness 0 (dull) → 1 (radiant). */
  b: number;
}

/**
 * Monotone cubic Hermite through (xs[i], ys[i]); xs strictly increasing. Monotone between
 * keyframes, except at turning points, whose slope is `turn` × the Catmull-Rom slope.
 */
export function monotoneCubic(xs: readonly number[], ys: readonly number[], turn = 0.5) {
  const n = xs.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  const m: number[] = new Array(n).fill(0);
  if (n > 1) {
    m[0] = d[0]!;
    m[n - 1] = d[n - 2]!;
  }
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1]! * d[i]! > 0) m[i] = (d[i - 1]! + d[i]!) / 2;
    // A turning point (the sun sinks, then rises): not a dead stop but a gentle turn — a fraction
    // of the Catmull-Rom slope, so it keeps moving through it (a small overshoot, well under the
    // keyframe steps).
    else if (d[i - 1]! * d[i]! < 0) m[i] = turn * ((ys[i + 1]! - ys[i - 1]!) / (xs[i + 1]! - xs[i - 1]!));
  }
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d[i]!;
    const b = m[i + 1]! / d[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i]!;
      m[i + 1] = t * b * d[i]!;
    }
  }
  return (x: number) => {
    if (n === 0) return 0;
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (x > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!;
    const t = (x - xs[i]!) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i]! + (t3 - 2 * t2 + t) * h * m[i]! + (-2 * t3 + 3 * t2) * ys[i + 1]! + (t3 - t2) * h * m[i + 1]!
    );
  };
}

/**
 * Anchors (page px, one per keyframe) are clamped to [0, maxScroll] and forced strictly
 * increasing (1px apart), so the curve is always defined and reverses exactly.
 */
export function createSunCurve(anchors: readonly number[], states: readonly SunState[], maxScroll: number) {
  const xs: number[] = [];
  let prev = -Infinity;
  for (const a of anchors) {
    prev = Math.max(prev + 1, Math.min(maxScroll, Math.max(0, a)));
    xs.push(prev);
  }
  const h = monotoneCubic(xs, states.map((s) => s.h));
  const b = monotoneCubic(xs, states.map((s) => s.b));
  return { anchors: xs, at: (y: number): SunState => ({ h: h(y), b: b(y) }) };
}
