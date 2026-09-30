/**
 * Chapter 12 art data: a field of ≥600 test dots and a CI line.
 *
 * Dots are drawn cheaply as three SVG <path>s of round-capped zero-length
 * segments ("M x y h0"), one per state/tone — never one DOM node per dot.
 * Everything is deterministic (seeded), so prerendered and hydrated markup match.
 *
 * Motion API (call from a driver subscriber; both are allocation-light):
 *   setFieldProgress(svg, p, fresh)  p 0→1: flips dots from failing to passing green, in
 *                                    `flipOrder`; the latest `fresh` flips also bloom
 *   setCiStability(svg, s)           s 0→1: the CI line heals left → right, jagged pink → steady green
 * Hooks inside the field SVG: path[data-dots="fail"|"fail-alt"|"pass"], path[data-dots-fresh],
 * path[data-ci-line|data-ci-steady|data-ci-pulse], stop[data-ci-stop="heal-0|heal-1|fail-0|fail-1"].
 * The static (prerendered, no-JS, reduced-motion) state is the "after": all passing,
 * a steady green line. Motion scrubs it back to failing and replays the fix.
 */
import { r1, seeded } from './rng';

export const FIELD = {
  cols: 25,
  rows: 25,
  gap: 16,
  /** viewBox size of the dot field. */
  size: 400,
  dotSize: 7,
} as const;

export interface Dot {
  x: number;
  y: number;
  /** Failing tone: 0 = pink, 1 = tangerine. */
  tone: 0 | 1;
}

/**
 * Flip order ("fixing the suite"): the grid is split into SUITE×SUITE blocks (test
 * suites). Suites are fixed one after another in a seeded order that drifts from one
 * corner across the field, overlapping a little, so green arrives in clustered waves;
 * within a suite the dots flip in a seeded order. A few stubborn failures (≈ STUBBORN
 * of the dots) hold out until the very end, scattered across already-green suites.
 */
const SUITE = 5;
const STUBBORN = 0.035;
/** How far a suite's flips spread into the next suite's (1 = none, >1 = overlapping waves). */
const SUITE_SPREAD = 1.7;
/** How ragged a suite's edge is, in cells (jitter of each dot's suite membership). */
const SUITE_RAGGED = 0.8;

function makeDots(): { dots: Dot[]; flipOrder: number[] } {
  const rand = seeded(12);
  const dots: Dot[] = [];
  const pad = (FIELD.size - (FIELD.cols - 1) * FIELD.gap) / 2;
  for (let row = 0; row < FIELD.rows; row++) {
    for (let col = 0; col < FIELD.cols; col++) {
      dots.push({
        x: r1(pad + col * FIELD.gap + (rand() - 0.5) * 3),
        y: r1(pad + row * FIELD.gap + (rand() - 0.5) * 3),
        tone: rand() < 0.62 ? 0 : 1,
      });
    }
  }
  const suitesX = Math.ceil(FIELD.cols / SUITE);
  const suitesY = Math.ceil(FIELD.rows / SUITE);
  // Suite order: from the top-left corner outward, with seeded jitter.
  const suiteKey = Array.from({ length: suitesX * suitesY }, (_, i) => (i % suitesX) + Math.floor(i / suitesX) + rand() * 3.2);
  const suiteRank = new Map([...suiteKey.keys()].sort((a, b) => suiteKey[a]! - suiteKey[b]!).map((s, r) => [s, r]));
  const key = dots.map((_, i) => {
    // Suite membership with a ±1-cell ragged edge, so the waves don't read as hard squares.
    const jit = () => Math.round((rand() - 0.5) * 2 * SUITE_RAGGED);
    const col = Math.min(FIELD.cols - 1, Math.max(0, (i % FIELD.cols) + jit()));
    const row = Math.min(FIELD.rows - 1, Math.max(0, Math.floor(i / FIELD.cols) + jit()));
    const suite = Math.floor(row / SUITE) * suitesX + Math.floor(col / SUITE);
    const local = rand();
    if (rand() < STUBBORN) return suitesX * suitesY + local; // stubborn: last
    return suiteRank.get(suite)! + local * SUITE_SPREAD;
  });
  const order = dots.map((_, i) => i);
  order.sort((a, b) => key[a]! - key[b]!);
  return { dots, flipOrder: order };
}

export const { dots: fieldDots, flipOrder } = makeDots();
export const DOT_COUNT = fieldDots.length;

/** rank[i] = position of dot i in the flip order. */
const rank = new Int32Array(DOT_COUNT);
flipOrder.forEach((dotIndex, position) => {
  rank[dotIndex] = position;
});

export interface FieldPaths {
  fail: string;
  failAlt: string;
  /** Every passing dot (green, lit). */
  pass: string;
  /** The most recently flipped batch (a subset of `pass`), drawn on top as a small bloom. */
  fresh: string;
}

/**
 * Path data for each state at progress p (0 = all failing, 1 = all passing).
 * `fresh` = how many of the latest flips (by flip order) also bloom; 0 = none.
 */
export function fieldPaths(p: number, fresh = 0): FieldPaths {
  const flipped = Math.round(Math.min(1, Math.max(0, p)) * DOT_COUNT);
  const freshFrom = flipped - Math.max(0, Math.round(fresh));
  let fail = '';
  let failAlt = '';
  let pass = '';
  let bloom = '';
  for (let i = 0; i < DOT_COUNT; i++) {
    const d = fieldDots[i]!;
    const seg = `M${d.x} ${d.y}h0`;
    const r = rank[i]!;
    if (r < flipped) {
      pass += seg;
      if (r >= freshFrom) bloom += seg;
    } else if (d.tone === 0) fail += seg;
    else failAlt += seg;
  }
  return { fail, failAlt, pass, fresh: bloom };
}

export function setFieldProgress(svg: SVGSVGElement, p: number, fresh = 0): void {
  const paths = fieldPaths(p, fresh);
  svg.querySelector('[data-dots="fail"]')?.setAttribute('d', paths.fail);
  svg.querySelector('[data-dots="fail-alt"]')?.setAttribute('d', paths.failAlt);
  svg.querySelector('[data-dots="pass"]')?.setAttribute('d', paths.pass);
  svg.querySelector('[data-dots-fresh]')?.setAttribute('d', paths.fresh);
}

// ---------------------------------------------------------------------------
// CI line: a run history across the field's width, jagged → steady.
// ---------------------------------------------------------------------------

export const CI = {
  width: 400,
  height: 64,
  points: 56,
  /** The masks reach this far past each end (covers the round caps and the glow). */
  maskPad: 30,
} as const;

const ciNoise = (() => {
  const rand = seeded(1200);
  return Array.from({ length: CI.points }, (_, i) => {
    // Mostly jitter, with occasional hard drops (red builds).
    const spike = rand() < 0.22 ? (rand() < 0.5 ? -1 : 1) * (0.7 + rand() * 0.3) : 0;
    return spike || (rand() - 0.5) * 0.7 + Math.sin(i * 0.9) * 0.15;
  });
})();

/** Width of the healing front, as a fraction of the line (soft edge between jagged pink and steady green). */
export const CI_FRONT = 0.22;
/** Of the jaggedness still ahead of the front, how much calms globally with s (the rest heals at the front). */
const CI_GLOBAL_CALM = 0.3;

/**
 * The healing front at stability s: the line is healed (flat, green) left of `from`
 * and still failing (jagged, pink) right of `to`, both as fractions of CI.width.
 * s = 0: the front sits just before the line; s = 1: just past its end.
 */
export function ciFront(s: number): { from: number; to: number } {
  const c = Math.min(1, Math.max(0, s)) * (1 + CI_FRONT) - CI_FRONT / 2;
  return { from: c - CI_FRONT / 2, to: c + CI_FRONT / 2 };
}

/** CI line path at stability s (0 = jagged everywhere, 1 = flat and steady), healing left → right. */
export function ciPath(s: number): string {
  const k = Math.min(1, Math.max(0, s));
  const { from } = ciFront(k);
  const maxAmp = (CI.height / 2 - 4) * (1 - CI_GLOBAL_CALM * k);
  const mid = CI.height / 2;
  const step = CI.width / (CI.points - 1);
  return ciNoise
    .map((n, i) => {
      const u = i / (CI.points - 1);
      const heal = Math.min(1, Math.max(0, (from + CI_FRONT - u) / CI_FRONT));
      const y = k >= 1 ? mid : mid + n * maxAmp * (1 - heal);
      return `${i ? 'L' : 'M'}${r1(i * step)} ${r1(y)}`;
    })
    .join('');
}

/** Width of the colour blend at the front (fraction of the mask span), each side of its centre. */
const CI_BLEND = 0.07;

/**
 * Mask gradient-stop offsets for the front at s. Each mask spans the line plus
 * CI.maskPad at each end; the front's 0–1 maps onto that whole span (off by at most
 * maskPad at the ends, well inside the soft edge), so at s = 0 the whole line incl. its
 * caps and glow is failing and at s = 1 all of it is steady. The two blends overlap
 * (green fades out just past the centre, pink fades in just before it), so the handover
 * never dips to a half-lit grey.
 * heal = [data-ci-heal] mask (white → black), fail = [data-ci-fail] mask (black → white).
 */
export function ciMaskStops(s: number): { heal: [number, number]; fail: [number, number] } {
  const { from, to } = ciFront(s);
  const c = (from + to) / 2;
  const clamp = (u: number) => Math.min(1, Math.max(0, u));
  const k = Math.min(1, Math.max(0, s));
  // Past the ends: fully one colour.
  if (k <= 0) return { heal: [0, 0], fail: [0, 0] };
  if (k >= 1) return { heal: [1, 1], fail: [1, 1] };
  return { heal: [clamp(c), clamp(c + CI_BLEND)], fail: [clamp(c - CI_BLEND), clamp(c)] };
}

/**
 * The CI line at stability s: both copies (failing [data-ci-line], steady [data-ci-steady])
 * share the path; the masks' gradient stops ([data-ci-stop]) move with the front so the
 * steady green shows left of it and the failing pink right of it (a soft edge between).
 */
export function setCiStability(svg: SVGSVGElement, s: number): void {
  const d = ciPath(s);
  svg.querySelector('[data-ci-line]')?.setAttribute('d', d);
  svg.querySelector('[data-ci-steady]')?.setAttribute('d', d);
  svg.querySelector('[data-ci-pulse]')?.setAttribute('d', d);
  const stops = ciMaskStops(s);
  (['heal', 'fail'] as const).forEach((k) =>
    stops[k].forEach((offset, i) => svg.querySelector(`[data-ci-stop="${k}-${i}"]`)?.setAttribute('offset', offset.toFixed(4))),
  );
}
