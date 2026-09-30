import { motion } from '@/motion/config';
import { OCCUPIED_WINDOWS } from '../scenes/illusData';
import {
  baseMatrix,
  clamp01,
  easeInOut,
  easeOut,
  f1,
  f3,
  lerp,
  seg,
  settle,
  smooth,
  staggerStart,
  Styler,
  svgEl,
  type IllusTimeline,
} from './sceneKit';

/**
 * Scroll-driven motion for the chapter illustrations (S4): each factory takes the art's
 * root ([data-illus]) and returns a timeline whose `render(t)` puts it at progress t (0→1,
 * exactly reversible) and whose `reset()` restores the prerendered markup — which is the
 * finished state, so no-JS and reduced motion show it (ch 16 excepted; see trunkMotion).
 * Hooks are documented on each illustration (src/story/scenes/). Only transform, opacity,
 * dash offsets, masks' reveal rects and a few SVG geometry attributes (the door's swing) change.
 */
const I = motion.story.illus;

/** The copy of a responsive illustration that is displayed (desktop/phone twins). */
const shown = <T extends Element>(els: readonly T[]) => els.find((el) => el.getClientRects().length > 0) ?? null;
const byIndex = (attr: string) => (a: Element, b: Element) => Number(a.getAttribute(attr)) - Number(b.getAttribute(attr));
const fillBox = (s: Styler, el: Element | null, origin = 'center') => {
  s.style(el, 'transformBox', 'fill-box');
  s.style(el, 'transformOrigin', origin);
};

// ---------------------------------------------------------------------------------- ch 1
/**
 * The five warm glows appear one by one round the girl, each switching on its spotlight on her;
 * their shared pool and her lit side brighten with them.
 */
export function sparkMotion(root: Element): IllusTimeline {
  const C = I.spark;
  const s = new Styler();
  const glows = [...root.querySelectorAll('g[data-glow]')].sort(byIndex('data-glow'));
  const beams = [...root.querySelectorAll('g[data-beam]')].sort(byIndex('data-beam'));
  const pools = [...root.querySelectorAll('[data-spark-pool]')];
  const lit = root.querySelector('[data-girl-lit]');
  return {
    render(t) {
      glows.forEach((g, i) => {
        fillBox(s, g);
        const st = staggerStart(i, glows.length, C.glows, C.glowSpan);
        const k = smooth(seg(t, [st, st + C.glowSpan]));
        s.opacity(g, k);
        s.style(g, 'transform', k >= 1 ? 'none' : `scale(${f3(lerp(C.fromScale, 1, k))})`);
        // Its spotlight follows it on, a beat later.
        s.opacity(beams[i], smooth(seg(t, [st + C.beamDelay, st + C.beamDelay + C.glowSpan])));
      });
      const pool = smooth(seg(t, C.pool));
      pools.forEach((el) => s.opacity(el, 0.5 * pool));
      s.opacity(lit, lerp(C.litFrom, 1, pool));
    },
    reset: () => s.reset(),
  };
}

// ---------------------------------------------------------------------------------- ch 2
/** Curtains open: they gather back from across the opening, the spotlight comes on, the spark lands in its light. */
export function stageMotion(root: Element): IllusTimeline {
  const C = I.stage;
  const s = new Styler();
  const q = (sel: string) => root.querySelector<SVGGraphicsElement>(sel);
  const left = q('g[data-stage="curtain-left"]');
  const right = q('g[data-stage="curtain-right"]');
  const spot = q('g[data-stage="spot"]');
  const bulb = q('g[data-stage="lamp"] > ellipse');
  const spark = q('g[data-stage="spark"]');
  const sparkGlow = spark?.querySelector('circle') ?? null;
  const marks = [...root.querySelectorAll<SVGGElement>('g[data-stage="mark"]')].sort(byIndex('data-mark'));
  const pages = [...root.querySelectorAll('g[data-stage="page"]')];
  let edge = NaN;
  let rightBase = '';
  let markBase: string[] = [];
  return {
    render(t) {
      if (Number.isNaN(edge)) {
        // The curtains' outer edge (both are the same shape; the right one mirrored by its transform).
        edge = left?.getBBox().x ?? 36;
        rightBase = right ? baseMatrix(right) : '';
        markBase = marks.map(baseMatrix);
      }
      const k = easeInOut(seg(t, C.curtains));
      const sx = lerp(C.closedScale, 1, k);
      const gather = `translate(${f1(edge)}px, 0px) scale(${f3(sx)}, 1) translate(${f1(-edge)}px, 0px)`;
      s.style(left, 'transform', k >= 1 ? '' : gather);
      s.style(right, 'transform', k >= 1 ? '' : `${rightBase} ${gather}`);

      const on = smooth(seg(t, C.spot));
      s.opacity(spot, on);
      s.opacity(bulb, on);
      // The props on the boards show once the light is on them.
      pages.forEach((pg) => s.opacity(pg, on));

      const d = seg(t, C.spark);
      const y = C.sparkDrop * (1 - settle(d, C.overshoot));
      s.style(spark, 'transform', d >= 1 ? '' : `translate(0px, ${f1(-y)}px)`);
      s.opacity(spark, d / 0.3);
      fillBox(s, sparkGlow);
      const bloom = easeOut(seg(d, [0.55, 1]));
      s.style(sparkGlow, 'transform', bloom >= 1 ? 'none' : `scale(${f3(lerp(C.bloomFrom, 1, bloom))})`);
      s.style(sparkGlow, 'opacity', bloom >= 1 ? '' : f3(0.8 * bloom));

      marks.forEach((m, i) => {
        const st = staggerStart(i, marks.length, C.marks, 0.14);
        const e = easeOut(seg(t, [st, st + 0.14]));
        s.opacity(m, e);
        s.style(m, 'transform', e >= 1 ? '' : `translate(0px, ${f1(C.markRise * (1 - e))}px) ${markBase[i]}`);
      });
    },
    reset: () => {
      s.reset();
      edge = NaN;
    },
  };
}

// ---------------------------------------------------------------------------------- ch 7
type Pt = [number, number];
/**
 * One after another (bottom course first), the applications fly in from the upper left along
 * their (undrawn) path — small and upright far off, larger as they near the door, shedding a
 * little tumble — and settle flat into their place on the pile; the certificate lands last.
 */
export function applicationsMotion(root: Element): IllusTimeline {
  const C = I.applications;
  const s = new Styler();
  const svgs = [...root.querySelectorAll<SVGSVGElement>(':scope > svg')];
  const measure = () =>
    svgs.map((svg) => {
      const [x0 = 0, y0 = 0, cx = 0, cy = 0, x1 = 0, y1 = 0] = (svg.dataset.trail ?? '').split(' ').map(Number);
      const trail = (u: number): Pt => [
        (1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * x1,
        (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * y1,
      ];
      const order = [...svg.querySelectorAll<SVGGElement>('g[data-envelope]')].sort(byIndex('data-envelope')).map((el, i) => {
        const m = el.transform?.baseVal?.consolidate()?.matrix;
        // Each flies its own line: a little above or below the shared path (never at its ends).
        const spread = (((i * 37) % 9) / 4 - 1) * C.scatter;
        return { el, base: baseMatrix(el), at: [m?.e ?? 0, m?.f ?? 0] as Pt, turn: (i % 2 ? 1 : -1) * C.tumble, spread };
      });
      const cert = svg.querySelector<SVGGElement>('g[data-cert]');
      const shadow = svg.querySelector<SVGGElement>('g[data-pile-shadow]');
      return { svg, trail, order, cert, shadow, certBase: cert ? baseMatrix(cert) : '' };
    });
  let layouts: ReturnType<typeof measure> | null = null;
  return {
    render(t) {
      layouts ??= measure();
      const L = shown(layouts.map((l) => l.svg));
      const lay = layouts.find((l) => l.svg === L);
      if (!lay) return;
      const n = lay.order.length;
      let landed = 0;
      lay.order.forEach((x, k) => {
        const st = staggerStart(k, n, C.sheets, C.sheetSpan);
        const p = seg(t, [st, st + C.sheetSpan]);
        landed += smooth(seg(p, [C.land - 0.05, 1]));
        if (p >= 1) {
          s.style(x.el, 'transform', '');
          s.style(x.el, 'opacity', '');
          return;
        }
        // Along the path to the door's foot, then onto its own place in the pile.
        const u = easeInOut(clamp01(p / C.land));
        let [px, py] = lay.trail(u);
        py += x.spread * Math.sin(Math.PI * u);
        const k2 = smooth(seg(p, [C.land - 0.05, 1]));
        px = lerp(px, x.at[0], k2);
        py = lerp(py, x.at[1], k2);
        // Far off = small; upright in flight (twice the pile's flattened height), flat once down.
        const grow = C.farScale + (1 - C.farScale) * u;
        const lift = lerp(2, 1, k2);
        s.style(
          x.el,
          'transform',
          `translate(${f1(px - x.at[0])}px, ${f1(py - x.at[1])}px) ${x.base} scale(${f3(grow)}, ${f3(grow * lift)}) rotate(${f1(x.turn * (1 - p))}deg)`,
        );
        s.opacity(x.el, clamp01(p / 0.12) * lerp(C.farOpacity, 1, u));
      });
      // The pile's shadow darkens as it grows.
      s.style(lay.shadow, 'opacity', landed >= n ? '' : f3(landed / n));
      const c = seg(t, C.cert);
      const y = C.certDrop * (1 - settle(c, 0.05));
      s.style(lay.cert, 'transform', c >= 1 ? '' : `translate(0px, ${f1(-y)}px) ${lay.certBase} rotate(${f1(C.certTurn * (1 - c))}deg)`);
      s.style(lay.cert, 'opacity', c >= 1 ? '' : f3(clamp01(c / 0.3)));
    },
    reset: () => s.reset(),
  };
}

// ---------------------------------------------------------------------------------- ch 8
/**
 * The builds come together in turn: the robot part by part (each drops into place) until its eyes light,
 * then the board and the breadboard with its LED settle, the wires draw and the LED lights, then the house's outline appears
 * on the workplane and the house rises out of it. Each build's pool of light warms as it's done.
 */
export function workbenchMotion(root: Element): IllusTimeline {
  const C = I.workbench;
  const s = new Styler();
  const q = (sel: string) => root.querySelector(sel);
  const pieces = [...root.querySelectorAll('g[data-ch8-piece]')].sort(byIndex('data-ch8-piece'));
  const board = q('g[data-ch8-arduino]');
  const ledPart = q('g[data-ch8-led-part]');
  const robotShadow = q('g[data-ch8-robot-shadow]');
  const robotEyes = q('[data-ch8-robot-eyes]');
  const wires = [...root.querySelectorAll('path[data-ch8-wire]')].sort(byIndex('data-ch8-wire'));
  const led = q('[data-ch8-led]');
  const outline = q('[data-ch8-outline]');
  const shape = q('g[data-ch8-shape]');
  const pool = (k: string) => q(`[data-ch8-pool="${k}"]`);
  const draw = (el: Element | null, k: number) => {
    s.style(el, 'strokeDasharray', '1 1');
    s.style(el, 'strokeDashoffset', f3(1 - k));
    s.style(el, 'opacity', k > 0 ? '' : '0');
  };
  const warm = (el: Element | null, k: number) => s.style(el, 'opacity', k >= 1 ? '' : f3(0.5 * k));
  return {
    render(t) {
      pieces.forEach((g, i) => {
        const st = staggerStart(i, pieces.length, C.pieces, C.pieceSpan);
        const p = seg(t, [st, st + C.pieceSpan]);
        const y = C.pieceDrop * (1 - settle(p, C.overshoot));
        s.style(g, 'transform', p >= 1 ? '' : `translate(0px, ${f1(-y)}px)`);
        s.style(g, 'opacity', p >= 1 ? '' : f3(clamp01(p / 0.3)));
      });
      const f = smooth(seg(t, [C.pieces[0], C.pieces[0] + C.pieceSpan]));
      s.style(robotShadow, 'opacity', f >= 1 ? '' : f3(f));
      const eyes = smooth(seg(t, C.robotEyes));
      s.style(robotEyes, 'opacity', eyes >= 1 ? '' : f3(eyes));
      warm(pool('robot'), eyes);

      const b = seg(t, C.board);
      s.style(board, 'transform', b >= 1 ? '' : `translate(0px, ${f1(-C.boardDrop * (1 - easeOut(b)))}px)`);
      s.style(board, 'opacity', b >= 1 ? '' : f3(clamp01(b / 0.4)));
      const lp = seg(t, C.ledPart);
      s.style(ledPart, 'transform', lp >= 1 ? '' : `translate(0px, ${f1(-C.boardDrop * (1 - easeOut(lp)))}px)`);
      s.style(ledPart, 'opacity', lp >= 1 ? '' : f3(clamp01(lp / 0.4)));
      wires.forEach((w, i) => {
        const st = staggerStart(i, wires.length, C.wires, C.wireSpan);
        draw(w, easeInOut(seg(t, [st, st + C.wireSpan])));
      });
      const l = smooth(seg(t, C.led));
      s.style(led, 'opacity', l >= 1 ? '' : f3(l));
      warm(pool('arduino'), l);

      const o = smooth(seg(t, C.outline));
      s.style(outline, 'opacity', o >= 1 ? '' : f3(o));
      const r = easeOut(seg(t, C.rise));
      s.style(shape, 'transform', r >= 1 ? '' : `scale(1, ${f3(lerp(0.02, 1, r))})`);
      s.style(shape, 'opacity', r >= 1 ? '' : f3(clamp01(r / 0.15)));
      warm(pool('shape'), smooth(seg(t, C.shapePool)));
    },
    reset: () => s.reset(),
  };
}

// ---------------------------------------------------------------------------------- ch 9
/** One after another, a few people in the crowd light up (their beam, glow and pool with them). */
export function crowdMotion(root: Element): IllusTimeline {
  const C = I.crowd;
  const s = new Styler();
  const lights = [...root.querySelectorAll('g[data-crowd-pick]')].sort(byIndex('data-crowd-pick'));
  const lit = [...root.querySelectorAll('path[data-pick-part="lit"]')].sort(byIndex('data-pick'));
  return {
    render(t) {
      lit.forEach((person, i) => {
        const st = staggerStart(i, lit.length, C.picks, C.pickSpan);
        const k = smooth(seg(t, [st, st + C.pickSpan]));
        s.style(person, 'opacity', k >= 1 ? '' : f3(k));
        s.style(lights[i], 'opacity', k >= 1 ? '' : f3(k));
      });
    },
    reset: () => s.reset(),
  };
}

// ---------------------------------------------------------------------------------- ch 10
/** Day by day the layers seat (bottom up), each with its check (day 6's rail drawing up beside them). */
export function daysMotion(root: Element): IllusTimeline {
  const C = I.days;
  const s = new Styler();
  const build = [...root.querySelectorAll<SVGGElement>('g[data-day][data-day-kind="build"]')].sort(byIndex('data-day-order'));
  const rail = root.querySelector('path[data-day-rail]');
  const checks = build.map((g) => root.querySelector(`g[data-day-check="${g.getAttribute('data-day')}"]`));
  return {
    render(t) {
      build.forEach((g, i) => {
        const st = staggerStart(i, build.length, C.layers, C.layerSpan);
        const p = seg(t, [st, st + C.layerSpan]);
        const k = settle(p, C.overshoot);
        const dx = Number(g.dataset.dayDx) * (1 - k);
        const dy = Number(g.dataset.dayDy) * (1 - k);
        const r = Number(g.dataset.dayRotate) * (1 - Math.min(1, k));
        s.style(g, 'transform', p >= 1 ? '' : `translate(${f1(dx)}px, ${f1(dy)}px) rotate(${r.toFixed(2)}deg)`);
        s.style(g, 'opacity', p >= 1 ? '' : f3(clamp01(p / C.fadeIn)));
        // Its check ticks in as it seats.
        const e = easeOut(seg(p, [C.checkFrom, 1]));
        s.style(checks[i], 'opacity', e >= 1 ? '' : f3(e));
      });
      // The rail draws up from its bottom end.
      const r = seg(t, C.rail);
      s.style(rail, 'strokeDasharray', '1 1');
      s.style(rail, 'strokeDashoffset', f3(-(1 - r)));
      s.style(rail, 'opacity', r > 0 ? '' : '0');
    },
    reset: () => s.reset(),
  };
}

// ---------------------------------------------------------------------------------- ch 11 / 13
/** A window's glass rect duplicated (same box) with another fill: an unlit underlay or a lit overlay. */
function windowCopy(s: Styler, glass: Element, fill: string, where: 'before' | 'after') {
  const copy = s.adopt(glass.cloneNode(false) as SVGRectElement);
  copy.removeAttribute('data-window');
  copy.removeAttribute('data-window-state');
  copy.removeAttribute('style');
  copy.setAttribute('fill', fill);
  copy.setAttribute('data-motion-copy', '');
  glass[where](copy);
  return copy;
}
const rowOf = (el: Element) => Number(el.getAttribute('data-window')!.split('-')[0]);

/** ch 11: the sign comes on, rooms light floor by floor from the ground up, hers last and brightest, then the date. */
export function windowLitMotion(root: Element): IllusTimeline {
  const C = I.windowLit;
  const s = new Styler();
  const sign = root.querySelector('[data-product-sign]');
  const signLit = sign ? [...sign.querySelectorAll(':scope > rect, :scope > path:last-of-type')] : [];
  const soft = [...root.querySelectorAll('rect[data-window-state="soft"]')];
  const kept = root.querySelector('rect[data-window-state="kept"]');
  const halo = root.querySelector('[data-window-halo]');
  const date = root.querySelector('[data-date]');
  const rows = [...new Set(soft.map(rowOf))].sort((a, b) => b - a); // ground floor first
  let unlit: Map<Element, Element> | null = null;
  /** A room fades up from dark glass: the unlit copy under it fades out as it lights (none left at the end). */
  const light = (g: Element | null, e: number) => {
    s.style(g, 'opacity', e >= 1 ? '' : f3(e));
    s.opacity(g && unlit?.get(g), 1 - e);
  };
  return {
    render(t) {
      unlit ??= new Map([...soft, kept].flatMap((g) => (g ? [[g, windowCopy(s, g, 'var(--illus-glass-dark)', 'before')] as const] : [])));
      const on = seg(t, C.sign);
      const flick = on <= 0 ? 0.12 : on >= 1 ? 1 : lerp(0.12, 1, on) * (on < 0.5 ? 0.6 + 0.4 * Math.abs(Math.sin(on * 18)) : 1);
      signLit.forEach((el) => s.style(el, 'opacity', on >= 1 ? '' : f3(flick)));
      soft.forEach((g) => {
        const k = rows.indexOf(rowOf(g));
        const st = staggerStart(k, rows.length, C.floors, C.floorSpan) + (Number(g.getAttribute('data-window')!.split('-')[1]) * 0.012);
        light(g, smooth(seg(t, [st, st + C.floorSpan])));
      });
      const kk = smooth(seg(t, C.kept));
      light(kept, kk);
      s.style(halo, 'opacity', kk >= 1 ? '' : f3(0.55 * kk));
      const d = easeOut(seg(t, C.date));
      s.style(date, 'opacity', d >= 1 ? '' : f3(d));
      s.style(date, 'transform', d >= 1 ? '' : `translate(0px, ${f1(C.dateRise * (1 - d))}px)`);
    },
    reset: () => {
      s.reset();
      unlit = null;
    },
  };
}

/** ch 13: the same building going dark: the sign flickers off, the lit rooms go out one by one (the fading ones last); hers stays. */
export function windowsDarkMotion(root: Element): IllusTimeline {
  const C = I.windowsDark;
  const s = new Styler();
  const svg = root.querySelector('svg[data-building]');
  const sign = root.querySelector('[data-product-sign]');
  const entrance = root.querySelector('[data-entrance] > rect:nth-of-type(2)');
  const softFill = () => `url(#${svg?.querySelector('linearGradient[id$="-soft"]')?.id ?? ''})`;
  /** The order the rooms go out: scattered, the two still fading last (their overlays reveal the fading glass). */
  const ORDER = ['0-2', '3-2', '1-1', 'entrance', '5-2', '0-0', '2-0', '4-0', '2-2', '4-1'];
  let lights: Element[] = [];
  let signOn: Element | null = null;
  return {
    render(t) {
      if (!svg) return;
      if (!signOn) {
        // The ch 11 state on top of the dark building: its lit rooms, lit entrance and lit sign (motion only).
        const fill = softFill();
        lights = ORDER.flatMap((key) => {
          if (key === 'entrance') return entrance ? [windowCopy(s, entrance, fill, 'after')] : [];
          if (!OCCUPIED_WINDOWS.has(key)) return [];
          const glass = svg.querySelector(`rect[data-window="${key}"]`);
          return glass ? [windowCopy(s, glass, fill, 'after')] : [];
        });
        const face = sign?.querySelector(':scope > rect');
        const tube = sign?.querySelector(':scope > path:last-of-type');
        const g = s.adopt(svgEl('g', { 'data-motion-copy': '' }));
        if (face) {
          const f = face.cloneNode(false) as SVGRectElement;
          f.setAttribute('fill', 'var(--color-lilac)');
          f.setAttribute('fill-opacity', '0.3');
          f.setAttribute('stroke', 'var(--color-lilac)');
          f.setAttribute('stroke-opacity', '0.7');
          g.append(f);
        }
        if (tube) {
          const p = tube.cloneNode(false) as SVGPathElement;
          p.setAttribute('stroke', 'var(--color-lilac)');
          p.style.filter = 'var(--illus-glow-lilac)';
          g.append(p);
        }
        sign?.append(g);
        signOn = g;
      }
      // The sign: on, a flicker, off.
      const keys = C.flicker;
      const f = seg(t, C.sign) * (keys.length - 1);
      const i = Math.min(keys.length - 2, Math.floor(f));
      s.opacity(signOn, lerp(keys[i]!, keys[i + 1]!, f - i));
      lights.forEach((el, k) => {
        const st = staggerStart(k, lights.length, C.rooms, C.roomSpan);
        s.opacity(el, 1 - smooth(seg(t, [st, st + C.roomSpan])));
      });
    },
    reset: () => {
      s.reset();
      lights = [];
      signOn = null;
    },
  };
}

// ---------------------------------------------------------------------------------- ch 14
/**
 * The road draws toward the horizon (surface, edges and lane dashes revealed under a soft
 * edge), then the lit bend peels off: the side road's surface reveals and its centre line draws.
 * `render(t)`: the road over [0, split], the bend over [split, 1].
 */
export function forkMotion(root: Element): IllusTimeline {
  const C = I.fork;
  const s = new Styler();
  const svg = root.querySelector('svg');
  const road = ['surface', 'road', 'straight'].map((k) => root.querySelector(`[data-fork="${k}"]`));
  const branch = root.querySelector('[data-fork="branch"]');
  const bend = root.querySelector<SVGPathElement>('[data-fork="bend"]');
  let reveal: { road: SVGRectElement; branch: SVGRectElement; top: number; bottom: number } | null = null;
  let bendLen = 0;
  const build = () => {
    if (!svg) return null;
    // Two soft-edged reveal masks (motion only): a white rect with a faded top edge, moved up.
    const H = 400;
    const defs = s.adopt(svgEl('defs', { 'data-motion-copy': '' }));
    const grad = svgEl('linearGradient', { id: 'fork-reveal-edge', x1: 0, y1: 0, x2: 0, y2: 1 });
    [
      [0, 0],
      [C.soft / (H + C.soft), 1],
      [1, 1],
    ].forEach(([o, a]) => grad.append(svgEl('stop', { offset: o!, 'stop-color': 'white', 'stop-opacity': a! })));
    defs.append(grad);
    const mask = (id: string) => {
      const m = svgEl('mask', { id, maskUnits: 'userSpaceOnUse', x: -20, y: -20, width: 400, height: H + 40 });
      const r = svgEl('rect', { x: -20, y: 0, width: 400, height: H + C.soft, fill: 'url(#fork-reveal-edge)' });
      m.append(r);
      defs.append(m);
      return r;
    };
    const r = { road: mask('fork-reveal-road'), branch: mask('fork-reveal-branch') };
    svg.prepend(defs);
    road.forEach((el) => s.attr(el, 'mask', 'url(#fork-reveal-road)'));
    s.attr(branch, 'mask', 'url(#fork-reveal-branch)');
    // From just below the road's near end (nothing shown) to past the horizon (everything).
    const box = road[0] instanceof SVGGraphicsElement ? road[0].getBBox() : { y: 96, height: 244 };
    bendLen = bend?.getTotalLength() ?? 0;
    if (bend) s.style(bend, 'strokeDasharray', `${f1(bendLen)} ${f1(bendLen + 2)}`);
    return { ...r, top: box.y - C.soft - 4, bottom: box.y + box.height + 2 };
  };
  const place = (rect: SVGRectElement, k: number, top: number, bottom: number) =>
    s.style(rect, 'transform', `translate(0px, ${f1(lerp(bottom, top, k))}px)`);
  return {
    render(t) {
      reveal ??= build();
      if (!reveal) return;
      const r = easeInOut(seg(t, [0, C.split]));
      place(reveal.road, r, reveal.top, reveal.bottom);
      const b = seg(t, [C.split, 1]);
      place(reveal.branch, easeInOut(seg(b, C.branch)), reveal.top, reveal.bottom);
      const d = easeInOut(seg(b, C.bend));
      s.style(bend, 'strokeDashoffset', f1((bendLen + 1) * (1 - d)));
      s.style(bend, 'opacity', d > 0 ? '' : '0');
    },
    reset: () => {
      s.reset();
      reveal = null;
    },
  };
}

// ---------------------------------------------------------------------------------- ch 15
/** Lane by lane, a task travels in along its strand into the ◒ hub (which pulses), and the lane's done tasks come out the far side. */
export function hubMotion(root: Element): IllusTimeline {
  const C = I.hub;
  const s = new Styler();
  const hub = root.querySelector('g[data-hub]');
  const ring = hub?.querySelector('circle') ?? null;
  const lanes = [...root.querySelectorAll<SVGPathElement>('path[data-strand]')].sort(byIndex('data-strand')).map((strand) => {
    const i = strand.getAttribute('data-strand');
    const tasks = root.querySelector(`[data-lane-tasks="${i}"]`);
    return {
      strand,
      queued: [...(tasks?.querySelectorAll<SVGRectElement>('[data-task="queued"]') ?? [])],
      done: [...(tasks?.querySelectorAll<SVGRectElement>('[data-task="done"]') ?? [])],
      traveller: null as SVGRectElement | null,
      len: 0,
      /** Length along the strand where it enters and leaves the hub. */
      inAt: 0,
      out: [0, 0] as [number, number],
    };
  });
  let glow: SVGCircleElement | null = null;
  const build = () => {
    const cx = Number(ring?.getAttribute('cx') ?? 220);
    const cy = Number(ring?.getAttribute('cy') ?? 172);
    const R = Number(hub?.querySelectorAll('circle')[1]?.getAttribute('r') ?? 42);
    for (const l of lanes) {
      l.len = l.strand.getTotalLength();
      // Strands run left → right: find where they cross the hub's rim (x = cx ∓ R).
      const lengthAtX = (x: number) => {
        let [lo, hi] = [0, l.len];
        for (let k = 0; k < 24; k++) {
          const mid = (lo + hi) / 2;
          if (l.strand.getPointAtLength(mid).x < x) lo = mid;
          else hi = mid;
        }
        return lo;
      };
      l.inAt = lengthAtX(cx - R);
      const p = l.strand.getPointAtLength(lengthAtX(cx + R));
      l.out = [p.x, p.y];
      const first = l.queued[0];
      if (first) {
        const tr = s.adopt(first.cloneNode(false) as SVGRectElement);
        tr.removeAttribute('data-task');
        tr.setAttribute('data-motion-copy', '');
        tr.setAttribute('x', '-5');
        tr.setAttribute('y', '-5');
        // Filled and bright while it travels (the queued ones are hollow and quiet).
        tr.setAttribute('fill', tr.getAttribute('stroke') ?? 'var(--color-cream)');
        tr.setAttribute('fill-opacity', '0.95');
        tr.setAttribute('stroke-opacity', '1');
        tr.style.filter = 'var(--illus-glow-soft)';
        tr.style.opacity = '0';
        hub?.before(tr); // under the hub: it disappears into it
        l.traveller = tr;
      }
    }
    glow = s.adopt(svgEl('circle', { cx, cy, r: R, fill: 'none', stroke: 'var(--color-lilac)', 'stroke-width': 3, 'data-motion-copy': '' }));
    glow.style.filter = 'var(--illus-glow-lilac)';
    glow.style.opacity = '0';
    hub?.append(glow);
    fillBox(s, ring);
  };
  let built = false;
  return {
    render(t) {
      if (!built) {
        built = true;
        build();
      }
      let pulse = 0;
      lanes.forEach((l, i) => {
        const st = staggerStart(i, lanes.length, C.lanes, C.beat);
        const b = seg(t, [st, st + C.beat]);
        // In: from the lane's start along its strand to the hub's rim, fading into it.
        const tr = seg(b, C.travel);
        if (l.traveller) {
          const p = l.strand.getPointAtLength(l.inAt * easeInOut(tr));
          s.style(l.traveller, 'transform', `translate(${f1(p.x)}px, ${f1(p.y)}px) scale(${f3(C.travellerScale * (1 - 0.5 * seg(tr, [0.8, 1])))})`);
          s.opacity(l.traveller, tr <= 0 || tr >= 1 ? 0 : Math.min(seg(tr, [0, 0.12]), 1 - seg(tr, [0.85, 1])));
        }
        // The hub pulses as the task arrives.
        pulse = Math.max(pulse, Math.max(0, 1 - Math.abs(b - C.travel[1]) / C.pulse.width) * (b > 0 && b < 1 ? 1 : 0));
        // Out: the lane's done tasks, one after another, from the hub's far rim to their places.
        const em = seg(b, C.emerge);
        l.done.forEach((d, k) => {
          const x = Number(d.getAttribute('x')) + 5;
          const y = Number(d.getAttribute('y')) + 5;
          const e = easeOut(seg(em, [k * 0.3, k * 0.3 + 0.7]));
          s.style(d, 'transform', e >= 1 ? '' : `translate(${f1((l.out[0] - x) * (1 - e))}px, ${f1((l.out[1] - y) * (1 - e))}px)`);
          s.style(d, 'opacity', e >= 1 ? '' : f3(e));
        });
      });
      s.style(ring, 'transform', pulse > 0 ? `scale(${f3(1 + C.pulse.scale * pulse)})` : 'none');
      s.opacity(glow, C.pulse.ring * smooth(pulse));
    },
    reset: () => {
      s.reset();
      built = false;
      glow = null;
      lanes.forEach((l) => (l.traveller = null));
    },
  };
}

// ---------------------------------------------------------------------------------- ch 16
/**
 * Pack and close: the box settles into the trunk, the lid closes about its hinge, the tail
 * lights come on while the day markers fade one by one. Its end (the trunk closed) is not
 * the markup's (open, being packed): reduced motion applies `render(1)`.
 */
export function trunkMotion(root: Element): IllusTimeline {
  const C = I.trunk;
  const s = new Styler();
  const box = root.querySelector('[data-box]');
  const lid = root.querySelector<SVGGraphicsElement>('[data-trunk-lid]');
  const lidLine = root.querySelector('[data-trunk-lid-line]');
  const tails = [...root.querySelectorAll('[data-tail-light]')];
  const days = [3, 2].map((d) => root.querySelector(`[data-day="${d}"]`));
  let hinge = NaN;
  let lights: Element[] = [];
  return {
    render(t) {
      if (Number.isNaN(hinge)) {
        const b = typeof lid?.getBBox === 'function' ? lid.getBBox() : null;
        hinge = b && b.height ? b.y + b.height : 124;
        lights = tails.map((el) => {
          const on = s.adopt(el.cloneNode(false) as SVGRectElement);
          on.removeAttribute('data-tail-light');
          on.setAttribute('data-motion-copy', '');
          on.setAttribute('opacity', '1');
          on.style.filter = 'var(--illus-glow-pink)';
          on.style.opacity = '0';
          el.after(on);
          return on;
        });
      }
      const b = seg(t, C.box);
      const y = C.boxDrop * (1 - settle(b, 0.05));
      s.style(box, 'transform', b >= 1 ? 'none' : `translate(0px, ${f1(-y)}px)`);
      const k = easeInOut(seg(t, C.lid));
      const sy = lerp(1, C.lidClosed, k);
      const fold = `translate(0px, ${f1(hinge)}px) scale(1, ${f3(sy)}) translate(0px, ${f1(-hinge)}px)`;
      s.style(lid, 'transform', k <= 0 ? 'none' : fold);
      s.style(lidLine, 'transform', k <= 0 ? 'none' : fold);
      // The closed lid covers the box (its fill is only faintly opaque).
      s.opacity(box, clamp01(b / 0.3) * lerp(1, C.boxBehindLid, clamp01(-sy / -C.lidClosed)));
      const l = smooth(seg(t, C.lights));
      lights.forEach((el) => s.opacity(el, l));
      days.forEach((d, i) => {
        if (!d) return;
        const rest = Number(d.getAttribute('opacity') ?? 1);
        const st = staggerStart(i, days.length, C.days, (C.days[1] - C.days[0]) * 0.6);
        const f = smooth(seg(t, [st, st + (C.days[1] - C.days[0]) * 0.6]));
        s.style(d, 'opacity', f >= 1 ? '' : f3(lerp(1, rest, f)));
      });
    },
    reset: () => {
      s.reset();
      hinge = NaN;
      lights = [];
    },
  };
}
