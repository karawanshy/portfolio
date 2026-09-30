/**
 * Pure scroll-progress math for the scrubbed Portfolio reveals (MotionLayer) and the
 * Skills box sequence (useRevealSequence). Everything maps scroll position →
 * progress 0…1, so scrolling back runs the same animation in reverse.
 */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * CSS `cubic-bezier(x1, y1, x2, y2)` as a function of t ∈ [0, 1]
 * (solve x(s) = t by Newton with a bisection fallback, return y(s)).
 */
export function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (s: number) => ((ax * s + bx) * s + cx) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  const y = (s: number) => ((ay * s + by) * s + cy) * s;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const err = x(s) - t;
      if (Math.abs(err) < 1e-6) return y(s);
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = t;
    for (let i = 0; i < 30; i++) {
      if (x(s) < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return y(s);
  };
}

/**
 * Entry progress of an element whose (layout) top is `top` px from the viewport top:
 * 0 while the top is below `from` × vh, 1 once it has risen to `to` × vh.
 */
export function enterProgress(top: number, vh: number, from: number, to: number) {
  const span = Math.max(1, (from - to) * vh);
  return clamp01((from * vh - top) / span);
}

/**
 * Local progress of item `i` of `count` inside an overall progress `t`, with the items'
 * windows spread evenly so the first starts at t = 0 and the last ends at t = 1.
 * `overlap` 0 = strictly one after another; 0.5 = each starts halfway through the previous.
 */
export function staggerProgress(t: number, i: number, count: number, overlap: number) {
  if (count <= 1) return clamp01(t);
  const o = Math.min(0.95, Math.max(0, overlap));
  const width = 1 / (count - (count - 1) * o);
  const start = i * width * (1 - o);
  const local = (t - start) / width;
  return local > 1 - 1e-9 ? 1 : clamp01(local);
}

export interface PinTimelineInput {
  /** Document y of the pinned track (the sticky stage's natural top). */
  trackTop: number;
  /** The stage's sticky `top` (px from the viewport top). */
  stickyTop: number;
  vh: number;
  count: number;
  perBox: number;
  /** Fraction of vh the sequence starts before the pin engages. */
  leadIn: number;
}

/**
 * Page scrollY where a pinned sequence starts (`start`), where the stage pins (`pin`),
 * and where the last box is fully in (`end`; the stage is still pinned for the end hold).
 */
export function pinTimeline({ trackTop, stickyTop, vh, count, perBox, leadIn }: PinTimelineInput) {
  const pin = trackTop - stickyTop;
  return { start: pin - Math.max(0, leadIn) * vh, pin, end: pin + Math.max(1, count * perBox) };
}

/** Pinned block length (px of extra scroll the track reserves). */
export const pinLength = (count: number, perBox: number, endHold: number) => count * perBox + endHold;

/** Document y of an element's layout box (offsetTop chain: ignores transforms). */
export function layoutTop(el: HTMLElement) {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}
