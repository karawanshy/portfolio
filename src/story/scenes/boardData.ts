import { r1, seeded } from './rng';

/**
 * Chapter 3 board: chalk handwriting as single-line strokes, so motion can draw it.
 *
 * The writing is authored once, in "hand units" (x-height = 10, baseline y = 0, y down),
 * as two short fragments (`if x == 5` with `if` circled, then an arrow to `print(x)`). Each
 * layout (landscape board lg+, portrait board below) only places and scales the fragments,
 * so both boards share the same strokes in the same order. Everything is baked into
 * viewBox coordinates (no group transforms): `path.getPointAtLength()` is the chalk tip.
 *
 * A "stroke" is one unit of writing the way a teacher writes: a word's letters in order,
 * then its i-dots and t/f-crosses, then a mark. Each stroke is made of "parts": one
 * continuous pen movement each (no pen-lifts), rendered as its own path so a dash draws
 * it cleanly (Chromium restarts a dash pattern at every sub-path).
 * Pure and seeded: identical on the server and the client (prerender-safe).
 */

// ---------------------------------------------------------------------------
// Hand-lettering: a single-stroke glyph set for the few characters needed
// ---------------------------------------------------------------------------

/** A point in hand units; a third element `1` marks a sharp corner (no smoothing through it). */
type Pt = readonly [number, number] | readonly [number, number, 1];
type Sub = readonly Pt[];

interface Glyph {
  /** Advance width (hand units). */
  w: number;
  /** Sub-paths written with the letter, in order. */
  body: readonly Sub[];
  /** Marks added after the whole word (i-dots, t/f-crosses, the ?-dot). */
  late?: readonly Sub[];
}

const dot = (x: number, y: number): Sub => [[x, y], [x + 0.35, y + 0.45]];

const glyphs: Record<string, Glyph> = {
  x: { w: 9, body: [[[0, -10], [7, 0]], [[7, -10], [0, 0]]] },
  '=': { w: 10.5, body: [[[0, -7.2], [8, -7]], [[0.4, -3], [8.2, -3.2]]] },
  i: { w: 4.5, body: [[[1.5, -10], [1.5, -2], [2.6, 0]]], late: [dot(1.4, -14.5)] },
  n: { w: 9, body: [[[0, -10], [0, 0, 1], [0.2, -6], [2.6, -9.8], [5.4, -9.8], [7, -7.5], [7, 0]]] },
  p: { w: 9, body: [[[0, -10], [0, 5.5]], [[0, -7.5], [3, -10.2], [6.6, -8.8], [7.1, -3.5], [4, -0.2], [0.3, -2]]] },
  t: { w: 7, body: [[[2, -15], [2, -2], [3.6, 0], [5.6, -0.8]]], late: [[[-0.6, -10], [5.4, -10.3]]] },
  '(': { w: 6, body: [[[4.2, -15], [1.3, -8.5], [1.2, -1], [4.2, 5]]] },
  ')': { w: 6, body: [[[1, -15], [3.9, -8.5], [4, -1], [1, 5]]] },
  f: { w: 7, body: [[[6.4, -14.6], [4.4, -16.4], [2.3, -15], [2, -9], [2, 0]]], late: [[[-0.6, -10], [5.4, -10.2]]] },
  '5': { w: 9, body: [[[1.6, -15], [1, -8.2, 1], [3.6, -9.6], [6.6, -8.2], [7.2, -4], [5.2, -0.4], [2, -0.4], [0, -2.2]], [[1.6, -15.2], [7, -15]]] },
  r: { w: 7.4, body: [[[0, -10], [0, 0, 1], [0.2, -6], [2.2, -9.4], [5.2, -10]]] },
  e: { w: 9, body: [[[0.6, -5], [7, -5.2, 1], [6.4, -8.6], [3.6, -10], [0.6, -7.6], [0.5, -2.2], [3.4, 0], [7, -1.4]]] },
  h: { w: 9, body: [[[0, -16], [0, 0, 1], [0.2, -6], [2.6, -9.8], [5.4, -9.8], [7, -7.5], [7, 0]]] },
  w: { w: 12, body: [[[0, -10], [2.5, 0, 1], [5, -7, 1], [7.5, 0, 1], [10, -10]]] },
  l: { w: 4.5, body: [[[1.5, -16], [1.5, -2], [3, 0]]] },
};

// ---------------------------------------------------------------------------
// Strokes and fragments (hand units, fragment-local)
// ---------------------------------------------------------------------------

/** Chalk colours: plain chalk, a dimmer chalk for the diagram, and two sparing accents. */
export type ChalkTone = 'chalk' | 'soft' | 'peach' | 'pink';

export const chalkColor: Record<ChalkTone, string> = {
  chalk: 'var(--board-chalk-line)',
  soft: 'var(--board-chalk)',
  peach: 'var(--board-chalk-peach)',
  pink: 'var(--board-chalk-pink)',
};

interface RawStroke {
  subs: Sub[];
  tone: ChalkTone;
}

const rand = seeded(303);
/** Hand wobble: every point moves a little, every letter sits a little off the baseline. */
const JITTER = 0.32;
const jitterSub = (sub: Sub, dx: number, dy: number): Sub =>
  sub.map((p) => {
    const q: Pt = [p[0] + dx + (rand() - 0.5) * JITTER * 2, p[1] + dy + (rand() - 0.5) * JITTER * 2];
    return p[2] ? [q[0], q[1], 1] : q;
  });

/** A word: its letters as one stroke, then each late mark as its own stroke. */
function word(text: string, x0 = 0, y0 = 0, tone: ChalkTone = 'chalk'): { strokes: RawStroke[]; end: number } {
  const body: Sub[] = [];
  const late: Sub[] = [];
  let x = x0;
  for (const ch of text) {
    const g = glyphs[ch];
    if (!g) throw new Error(`board: no glyph for "${ch}"`);
    const dy = y0 + (rand() - 0.5) * 0.9;
    g.body.forEach((s) => body.push(jitterSub(s, x, dy)));
    g.late?.forEach((s) => late.push(jitterSub(s, x, dy)));
    x += g.w;
  }
  return { strokes: [{ subs: body, tone }, ...late.map((s) => ({ subs: [s], tone }))], end: x };
}

/** A line of words separated by `gap`, written left to right. */
function line(tokens: readonly string[], gap = 5): RawStroke[] {
  const out: RawStroke[] = [];
  let x = 0;
  for (const t of tokens) {
    const w = word(t, x);
    out.push(...w.strokes);
    x = w.end + gap;
  }
  return out;
}

const shape = (tone: ChalkTone, ...subs: Sub[]): RawStroke => ({ subs: subs.map((s) => jitterSub(s, 0, 0)), tone });

/** A loose open ellipse (the circle round a keyword), overshooting where it started. */
function loop(cx: number, cy: number, rx: number, ry: number): Sub {
  const pts: Pt[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = -0.35 * Math.PI - (i / n) * 2.18 * Math.PI;
    const grow = 1 + (i / n) * 0.1;
    pts.push([cx + Math.cos(a) * rx * grow, cy + Math.sin(a) * ry * grow]);
  }
  return pts;
}

/**
 * The fragments, in writing order. Deliberately few, so each mark can be written
 * slowly within the pin: just the beat "code looks like English words".
 */
const fragments: readonly (readonly RawStroke[])[] = [
  // 0  if x == 5   — "if" circled in pink, as the teacher's point
  (() => {
    const [ifBody, ...ifMarks] = word('if').strokes;
    return [ifBody!, ...ifMarks, shape('pink', loop(5.6, -7.6, 11, 13.2)), ...line(['x', '==', '5']).map(shift(20.5))];
  })(),
  // 1  a chalk arrow swinging down from the `if` line, then print(x) off to the right
  [
    shape('soft', [[-21, -29], [-20.5, -17], [-15, -8.6], [-5, -6]], [[-8.6, -9.4], [-4.6, -6, 1], [-8.8, -2.6]]),
    ...line(['print(x)']),
  ],
];

/**
 * Each fragment's own tilt (degrees, about its origin), shared by both boards: a few
 * degrees either way so the board reads as thinking out loud, not a code listing.
 */
const tilts: readonly number[] = [-2, 1.5];

/** Shift a stroke right by `dx` hand units (used to continue a line after a mark). */
function shift(dx: number) {
  return (s: RawStroke): RawStroke => ({ ...s, subs: s.subs.map((sub) => sub.map((p) => (p[2] ? [p[0] + dx, p[1], 1] : [p[0] + dx, p[1]]))) });
}

// Chalk pressure: each stroke gets its own width; marks and the diagram sit a touch lighter.
const widths = fragments.map((f) => f.map((s) => (s.tone === 'soft' ? 2.6 : 3) + rand() * 1));

// ---------------------------------------------------------------------------
// Layouts: where each fragment sits on each board (viewBox px)
// ---------------------------------------------------------------------------

export interface BoardLayout {
  id: 'landscape' | 'portrait';
  width: number;
  height: number;
  /** px per hand unit (x-height = 10 units). */
  scale: number;
  /** Chalk ledge inset from the board's sides (px). */
  ledgeX: number;
  /** Forward slant of the handwriting (x shift per unit of height). */
  slant: number;
  /** Baseline origin of each fragment, in viewBox px. */
  origins: readonly (readonly [number, number])[];
}

export const landscape: BoardLayout = {
  id: 'landscape',
  width: 620,
  height: 380,
  scale: 3.6,
  ledgeX: 44,
  slant: 0.14,
  // The pair is centred on the board (≈ 107 × 63 hand units incl. the circle).
  origins: [
    [137, 146], // if x == 5
    [295, 276], // → print(x)   (= the `if` origin + 44, 36 hand units)
  ],
};

export const portrait: BoardLayout = {
  id: 'portrait',
  width: 340,
  height: 440,
  scale: 2.45,
  ledgeX: 28,
  slant: 0.14,
  // Centred, sitting a touch above the middle (the chalk rests below-right of print(x)).
  origins: [
    [40, 184], // if x == 5
    [148, 272], // → print(x)   (= the `if` origin + 44, 36 hand units)
  ],
};

// ---------------------------------------------------------------------------
// Baking: hand units → smooth path data in viewBox px
// ---------------------------------------------------------------------------

type XY = readonly [number, number];

/** Catmull-Rom through the points (split at corners), as cubic Béziers. */
function smooth(pts: readonly XY[]): string {
  if (pts.length === 2) return `L${r1(pts[1]![0])} ${r1(pts[1]![1])}`;
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0]!)} ${r1(c1[1]!)} ${r1(c2[0]!)} ${r1(c2[1]!)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

/** One continuous pen movement (no pen-lifts): one `<path pathLength="1">`. */
export interface BoardStrokePart {
  d: string;
  /** Approximate length in viewBox px. */
  length: number;
  /** Where the chalk tip starts and ends this part (viewBox px). */
  start: XY;
  end: XY;
}

export interface BoardStroke {
  /** Global writing order (0-based), the `data-stroke` value. */
  index: number;
  fragment: number;
  tone: ChalkTone;
  width: number;
  /** The pen movements, in writing order (a word's letters, a box, an arrow's shaft then head). */
  parts: BoardStrokePart[];
  /** Sum of the parts' lengths (viewBox px; pen-lifts excluded). */
  length: number;
  start: XY;
  end: XY;
}

function bake(layout: BoardLayout): BoardStroke[] {
  const out: BoardStroke[] = [];
  fragments.forEach((frag, fi) => {
    const [ox, oy] = layout.origins[fi]!;
    const a = (tilts[fi]! * Math.PI) / 180;
    const [cos, sin] = [Math.cos(a), Math.sin(a)];
    const place = (p: Pt): XY => {
      const x = p[0] - p[1] * layout.slant;
      const y = p[1];
      return [ox + (x * cos - y * sin) * layout.scale, oy + (x * sin + y * cos) * layout.scale];
    };
    frag.forEach((s, si) => {
      const parts = s.subs.map((sub): BoardStrokePart => {
        const pts = sub.map(place);
        let length = 0;
        for (let k = 1; k < pts.length; k++) length += Math.hypot(pts[k]![0] - pts[k - 1]![0], pts[k]![1] - pts[k - 1]![1]);
        let d = `M${r1(pts[0]![0])} ${r1(pts[0]![1])}`;
        // Corners split the smoothing into runs.
        let run: XY[] = [pts[0]!];
        for (let k = 1; k < pts.length; k++) {
          run.push(pts[k]!);
          if (sub[k]![2] || k === pts.length - 1) {
            d += smooth(run);
            run = [pts[k]!];
          }
        }
        return { d, length, start: pts[0]!, end: pts[pts.length - 1]! };
      });
      out.push({
        index: out.length,
        fragment: fi,
        tone: s.tone,
        width: r1(widths[fi]![si]!),
        parts,
        length: parts.reduce((n, p) => n + p.length, 0),
        start: parts[0]!.start,
        end: parts[parts.length - 1]!.end,
      });
    });
  });
  return out;
}

export const boardStrokes: Record<BoardLayout['id'], BoardStroke[]> = {
  landscape: bake(landscape),
  portrait: bake(portrait),
};

/** Total strokes (same on both boards); `data-stroke` runs 0 … BOARD_STROKE_COUNT − 1. */
export const BOARD_STROKE_COUNT = boardStrokes.landscape.length;
/** Total pen movements (`<path>`s) per board. */
export const BOARD_PART_COUNT = boardStrokes.landscape.reduce((n, s) => n + s.parts.length, 0);
/** Fragments (`data-board-fragment` runs 0 … BOARD_FRAGMENT_COUNT − 1). */
export const BOARD_FRAGMENT_COUNT = fragments.length;

/**
 * Pacing weights: each stroke's share of the total drawn length (sums to 1). Both
 * layouts scale all fragments uniformly, so the shares are the same on both boards.
 */
export const boardStrokeWeights: readonly number[] = (() => {
  const s = boardStrokes.landscape;
  const total = s.reduce((n, x) => n + x.length, 0);
  return s.map((x) => x.length / total);
})();

/** How far the chalk lifts off the writing when it's done (so it doesn't hide the last letter). */
export const CHALK_LIFT: XY = [10, 4];
/**
 * Where the chalk tip rests in the static (finished) state: just past the last letter of
 * the last fragment (not on the final i-dot / t-cross, which sit mid-word).
 */
export const boardChalkRest = (id: BoardLayout['id']): XY => {
  const last = boardStrokes[id].filter((s) => s.fragment === BOARD_FRAGMENT_COUNT - 1).flatMap((s) => s.parts);
  const [x, y] = last.reduce((best, p) => (p.end[0] > best[0] ? p.end : best), last[0]!.end);
  return [r1(x + CHALK_LIFT[0]), r1(y + CHALK_LIFT[1])];
};
