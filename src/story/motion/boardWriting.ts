import { motion } from '@/motion/config';
import { CHALK_LIFT, boardChalkRest, boardStrokeWeights, type BoardLayout } from '../scenes/boardData';

/**
 * ch 3: the chalkboard is written by hand as `write` goes 0 → 1 (scroll-linked, so it
 * reverses exactly). See Board.tsx for the hooks.
 *
 * Strokes draw one after another, each taking its `data-stroke-weight` of the time;
 * the chalk rides the tip while drawing, and between strokes (and across a word's
 * pen-lifts) it lifts slightly and travels to the next start. Pauses make it read as
 * a person writing: longer before a new fragment.
 *
 * Each stroke (g[data-stroke]) is made of parts (path[data-stroke-part], one pen
 * movement each, pathLength=1): a part draws with `stroke-dasharray: 1 1` and its dash
 * offset 1 → 0, hidden while its progress is 0 (a round cap alone would leave a dot).
 *
 * Everything is measured once per board (getTotalLength / getPointAtLength of the
 * parts); per frame it writes only what changed: dash offsets, opacity, and the
 * chalk's transform.
 */
type XY = readonly [number, number];
const B = motion.story.board;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

interface Part {
  el: SVGPathElement;
  len: number;
  t0: number;
  t1: number;
}
type Step =
  | { kind: 'draw'; t0: number; t1: number; part: Part }
  | { kind: 'travel'; t0: number; t1: number; from: XY; to: XY; lift0: number; lift1: number; lift: number };

interface Geo {
  parts: Part[];
  steps: Step[];
  total: number;
  chalk: SVGGElement | null;
  glow: SVGElement | null;
}

export function createBoardWriter() {
  const geos = new Map<SVGSVGElement, Geo>();
  const cache = new WeakMap<Element, Map<string, string>>();
  const set = (el: SVGElement, prop: 'strokeDashoffset' | 'opacity' | 'transform', value: string) => {
    let m = cache.get(el);
    if (!m) cache.set(el, (m = new Map()));
    if (m.get(prop) === value) return;
    m.set(prop, value);
    el.style[prop] = value;
  };
  const point = (el: SVGPathElement, at: number): XY => {
    const p = el.getPointAtLength(at);
    return [p.x, p.y];
  };

  const build = (svg: SVGSVGElement): Geo => {
    // Which layout this board is (its glow gradient is `board-glow-<layout id>`).
    const glowId = svg.querySelector('radialGradient[id^="board-glow-"]')?.id ?? '';
    const id: BoardLayout['id'] = glowId.endsWith('portrait') ? 'portrait' : 'landscape';
    const strokes = [...svg.querySelectorAll<SVGGElement>('g[data-stroke]')].sort(
      (a, b) => Number(a.dataset.stroke) - Number(b.dataset.stroke),
    );
    const geo: Geo = {
      parts: [],
      steps: [],
      total: 0,
      chalk: svg.querySelector<SVGGElement>('[data-board-chalk]'),
      glow: svg.querySelector<SVGElement>('[data-board-chalk-glow]'),
    };
    let t = 0;
    let at: XY | null = null; // where the chalk is (on the board) after the previous step
    let lastFragment = -1;
    const travel = (to: XY, dur: number, lift: number, lift0 = 0, lift1 = 0) => {
      const from = at ?? to;
      geo.steps.push({ kind: 'travel', t0: t, t1: t + dur, from, to, lift0, lift1, lift });
      t += dur;
    };

    strokes.forEach((stroke, i) => {
      const weight = boardStrokeWeights[i] ?? (Number(stroke.dataset.strokeWeight) || 0);
      const fragment = Number((stroke.closest('[data-board-fragment]') as SVGGElement | null)?.dataset.boardFragment ?? 0);
      const els = [...stroke.querySelectorAll<SVGPathElement>('path[data-stroke-part]')].sort(
        (a, b) => Number(a.dataset.strokePart) - Number(b.dataset.strokePart),
      );
      const lens = els.map((el) => {
        try {
          return el.getTotalLength();
        } catch {
          return 0;
        }
      });
      const sum = lens.reduce((n, l) => n + l, 0) || 1;
      els.forEach((el, k) => {
        el.style.strokeDasharray = '1 1';
        const start = point(el, 0);
        if (k === 0) {
          const pause = i === 0 ? B.pace.lead : fragment !== lastFragment ? B.pace.fragment : B.pace.stroke;
          if (i === 0) {
            at = [start[0] + CHALK_LIFT[0], start[1] + CHALK_LIFT[1]]; // hovering near the first stroke
            travel(start, pause, 1, 1, 0);
          } else travel(start, pause, B.lift.stroke);
        } else travel(start, B.pace.lift, B.lift.word);
        const part: Part = { el, len: lens[k]!, t0: t, t1: t + (weight * lens[k]!) / sum };
        geo.parts.push(part);
        geo.steps.push({ kind: 'draw', t0: part.t0, t1: part.t1, part });
        t = part.t1;
        at = point(el, lens[k]!);
      });
      lastFragment = fragment;
    });
    const rest = boardChalkRest(id);
    travel(rest, B.pace.end, 1, 0, 1);
    geo.total = t;
    return geo;
  };

  const render = (svg: SVGSVGElement, write: number) => {
    let geo = geos.get(svg);
    if (!geo) geos.set(svg, (geo = build(svg)));
    const u = clamp01(write) * geo.total;
    for (const p of geo.parts) {
      const f = u <= p.t0 ? 0 : u >= p.t1 ? 1 : (u - p.t0) / (p.t1 - p.t0);
      set(p.el, 'strokeDashoffset', (1 - f).toFixed(4));
      set(p.el, 'opacity', f > 0 ? '1' : '0'); // a round cap alone would leave a dot
    }
    // The chalk: on the tip while drawing; lifted and travelling between.
    const step = geo.steps.find((s) => u < s.t1) ?? geo.steps[geo.steps.length - 1]!;
    let x: number;
    let y: number;
    let lift: number;
    if (step.kind === 'draw') {
      const f = clamp01((u - step.t0) / (step.t1 - step.t0));
      [x, y] = point(step.part.el, f * step.part.len);
      lift = 0;
    } else {
      const k = clamp01(step.t1 > step.t0 ? (u - step.t0) / (step.t1 - step.t0) : 1);
      const e = smooth(k);
      x = step.from[0] + (step.to[0] - step.from[0]) * e;
      y = step.from[1] + (step.to[1] - step.from[1]) * e;
      lift = Math.max(step.lift0 + (step.lift1 - step.lift0) * e, step.lift * Math.sin(Math.PI * k));
    }
    if (geo.chalk) {
      const lx = x + CHALK_LIFT[0] * lift;
      const ly = y + CHALK_LIFT[1] * lift;
      set(geo.chalk, 'transform', `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`);
    }
    if (geo.glow) set(geo.glow, 'opacity', (B.glow.drawing + (B.glow.lifted - B.glow.drawing) * Math.min(1, lift)).toFixed(3));
  };

  const reset = () => {
    geos.forEach((geo) => {
      for (const p of geo.parts) {
        p.el.style.strokeDasharray = '';
        p.el.style.strokeDashoffset = '';
        p.el.style.opacity = '';
        cache.delete(p.el);
      }
      for (const el of [geo.chalk, geo.glow]) {
        if (!el) continue;
        el.style.transform = '';
        el.style.opacity = '';
        cache.delete(el);
      }
    });
    geos.clear();
  };

  return { render, reset };
}
