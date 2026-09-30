/**
 * The Story's per-chapter art timelines (useStoryScenes drives them): ch 3's board, ch 4's
 * waver, ch 5's CPU, ch 6's chess, ch 12's field, the chapter illustrations and the quotes.
 * Each is built once per mount from the rendered scenes and knows how to draw a progress
 * and reset itself. Shared style helpers (Writer, easing) live here too.
 */
import { motion } from '@/motion/config';
import { DOT_COUNT, FIELD, setCiStability, setFieldProgress } from '../scenes/fieldData';
import { waverRoute } from '../scenes/waverRoute';
import { createBoardWriter } from './boardWriting';
import { createChessExchange } from './chessExchange';
import { createCpuAssembly } from './cpuAssembly';
import { doorwayMotion } from './doorwayMotion';
import {
  applicationsMotion,
  daysMotion,
  crowdMotion,
  forkMotion,
  hubMotion,
  sparkMotion,
  stageMotion,
  trunkMotion,
  workbenchMotion,
  windowLitMotion,
  windowsDarkMotion,
} from './illusMotion';
import { type IllusTimeline } from './sceneKit';
import { quoteTiming } from './quoteTiming';

const S = motion.story;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 0→1 across [a, b]. */
export const seg = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** The copy of a responsive art piece that is actually displayed (desktop/phone twins). */
export const visible = <T extends Element>(els: Iterable<T>) => [...els].find((el) => el.getClientRects().length > 0) ?? null;

/** Writes a style only when it changes. */
export class Writer {
  private cache = new WeakMap<Element, Map<string, string>>();
  set(el: HTMLElement | SVGElement, prop: string, value: string) {
    let m = this.cache.get(el);
    if (!m) this.cache.set(el, (m = new Map()));
    if (m.get(prop) === value) return;
    m.set(prop, value);
    if (prop.startsWith('--')) el.style.setProperty(prop, value);
    else (el.style as unknown as Record<string, string>)[prop] = value;
  }
  forget(el: Element) {
    this.cache.delete(el);
  }
}

/**
 * Build every chapter's art timeline from the rendered scenes. `allowed`: motion allowed
 * (ch 12's sweep is motion-only decoration).
 */
export function createSceneArt(sceneEls: HTMLElement[], w: Writer, allowed: boolean) {
  const byId = (id: string) => sceneEls.find((s) => s.id === id) ?? null;

  // ---------------------------------------------------------------- slice art
  const ch3 = byId('chapter-3');
  const ch4 = byId('chapter-4');
  const ch5 = byId('chapter-5');
  const ch6 = byId('chapter-6');
  const ch12 = byId('chapter-12');

  /** ch 3: the board is written stroke by stroke (chalk on the tip), then the quote lands. */
  const board = (() => {
    if (!ch3) return null;
    const boards = [...ch3.querySelectorAll<SVGSVGElement>('svg[data-scene-part="board"]')];
    const quoteLines = [...ch3.querySelectorAll<HTMLElement>('[data-quote-line]')];
    const writer = createBoardWriter();
    const render = (write: number, q0: number, q1: number) => {
      const svg = visible(boards);
      if (svg) writer.render(svg, write);
      [q0, q1].forEach((q, i) => {
        const el = quoteLines[i];
        if (!el) return;
        const e = easeOut(q);
        w.set(el, 'opacity', e.toFixed(3));
        w.set(el, 'transform', `translate3d(0, ${((1 - e) * S.board.quoteRise).toFixed(1)}px, 0)`);
      });
    };
    return {
      scene: ch3,
      /** The pin's progress drives the whole timeline. */
      pinned: (p: number) => render(seg(p, S.board.write), seg(p, S.board.quote0), seg(p, S.board.quote1)),
      /** Only the quote's lines (layout measures them untransformed; the next frame redraws them). */
      resetQuote: () =>
        quoteLines.forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
          w.forget(el);
        }),
      reset: () => {
        writer.reset();
        quoteLines.forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
          w.forget(el);
        });
      },
    };
  })();

  /**
   * ch 12: failing → being fixed → passing. The markup is the resolved state; motion
   * scrubs it back to failing and replays the fix: dots flip to lit green suite by suite
   * (the latest batch blooms), the CI line heals left → right in step, then a pale
   * green sweep and a "green build" glint; the hold stays fully lit. Reversible.
   */
  const field = (() => {
    const svg = ch12?.querySelector<SVGSVGElement>('svg[data-scene-part="field"]');
    if (!ch12 || !svg) return null;
    const halo = svg.querySelector<SVGRectElement>('[data-field-halo]');
    const pulse = svg.querySelector<SVGPathElement>('[data-ci-pulse]');

    // A single pale green light sweeps across the field once it has all passed (motion
    // only; decorative SVG added here and removed on cleanup). Clipped to the frame.
    const sweep = (() => {
      if (!allowed) return null;
      const NS = 'http://www.w3.org/2000/svg';
      const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
        const node = document.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
        return node;
      };
      const g = el('g', { 'data-field-sweep': '', 'clip-path': 'url(#field-sweep-clip)', 'pointer-events': 'none' });
      const defs = el('defs', {});
      const clip = el('clipPath', { id: 'field-sweep-clip' });
      clip.append(el('rect', { x: -6, y: -6, width: FIELD.size + 12, height: FIELD.size + 12, rx: 28 }));
      const grad = el('linearGradient', { id: 'field-sweep-grad', x1: 0, y1: 0, x2: 1, y2: 0 });
      [
        ['0', 0],
        ['0.5', 1],
        ['1', 0],
      ].forEach(([offset, o]) => {
        const stop = el('stop', { offset: offset!, 'stop-opacity': o! });
        stop.style.stopColor = 'var(--field-sweep)'; // var() only works in style, not in the attribute
        grad.append(stop);
      });
      defs.append(clip, grad);
      const band = el('rect', { x: -FIELD.size * 0.35, y: -20, width: FIELD.size * 0.35, height: FIELD.size + 40, fill: 'url(#field-sweep-grad)' });
      band.style.opacity = '0';
      g.append(defs, band);
      // After the dots, before the CI panel.
      svg.querySelector('[data-dots="fail-alt"]')?.after(g);
      return { g, band };
    })();

    let lastFlip = -1;
    let lastCalm = -1;
    const F = S.field;
    const fresh = Math.round(F.fresh * DOT_COUNT);
    const render = (p: number) => {
      const steps = F.steps;
      const ease = (t: number) => (1 - F.flipEase) * t + F.flipEase * easeInOut(t);
      const flip = Math.round(ease(seg(p, F.flip)) * steps);
      if (flip !== lastFlip) {
        lastFlip = flip;
        // The bloom marks the batch being fixed; gone once everything passes.
        setFieldProgress(svg, flip / steps, flip < steps ? fresh : 0);
      }
      const calm = Math.round(ease(seg(p, F.steady)) * steps);
      if (calm !== lastCalm) {
        lastCalm = calm;
        setCiStability(svg, calm / steps);
      }
      if (halo) w.set(halo, 'opacity', (flip / steps).toFixed(3));
      if (sweep) {
        const k = seg(p, F.sweep);
        w.set(sweep.band, 'opacity', (Math.sin(Math.PI * k) * F.sweepOpacity).toFixed(3));
        w.set(sweep.band, 'transform', `translate(${(easeInOut(k) * FIELD.size * 1.4).toFixed(1)}px, 0px)`);
      }
      if (pulse) {
        const k = seg(p, F.pulse);
        // pathLength 1, dash 0.12: from just before the start to just past the end.
        w.set(pulse, 'strokeDashoffset', (0.12 - easeInOut(k) * 1.12).toFixed(4));
        w.set(pulse, 'opacity', Math.min(1, Math.sin(Math.PI * k) * 2.5).toFixed(3));
      }
    };
    return {
      scene: ch12,
      pinned: render,
      final: () => render(1),
      /** Back to the markup's resolved state (and no motion styles). */
      reset: () => {
        sweep?.g.remove();
        lastFlip = lastCalm = -1;
        setFieldProgress(svg, 1);
        setCiStability(svg, 1);
        for (const el of [halo, pulse]) {
          if (!el) continue;
          el.style.opacity = '';
          el.style.strokeDashoffset = '';
          w.forget(el);
        }
      },
    };
  })();

  /** ch 4: lead, then the a/b alternatives, then it settles and the 99 glows in (t: pin.play). */
  const waver = (() => {
    if (!ch4) return null;
    const svgs = [...ch4.querySelectorAll<SVGSVGElement>('svg[data-scene-part="waver"]')];
    const lens = new Map<SVGPathElement, number>();
    const draw = (path: SVGPathElement | null, f: number) => {
      if (!path) return;
      let len = lens.get(path);
      if (len === undefined) {
        len = path.getTotalLength();
        lens.set(path, len);
        path.style.strokeDasharray = `${len} ${len + 2}`;
      }
      w.set(path, 'strokeDashoffset', ((len + 1) * (1 - f)).toFixed(1));
      w.set(path, 'opacity', f > 0 ? '' : '0'); // round caps would leave a dot at 0
    };
    const render = (t: number, svg: SVGSVGElement | null) => {
      if (!svg) return;
      const q = (k: string) => svg.querySelector<SVGPathElement>(`path[data-waver="${k}"]`);
      const R = waverRoute;
      // The drawing head travels the route at a constant pace (route units).
      const head = seg(t, S.waver.route) * R.settled[1];
      const along = (range: readonly [number, number]) => clamp01((head - range[0]) / (range[1] - range[0]));
      draw(q('lead'), along(R.lead));
      draw(q('b'), along(R.branches));
      // The dotted "a" can't dash-draw: a soft-edged mask window follows the head instead.
      const reveal = svg.querySelector<SVGRectElement>('[data-waver-reveal]');
      if (reveal) {
        const shift = head * Number(reveal.dataset.scale) - Number(reveal.dataset.end);
        w.set(reveal, 'transform', reveal.dataset.axis === 'x' ? `translate(${shift.toFixed(1)}px, 0)` : `translate(0, ${shift.toFixed(1)}px)`);
      }
      draw(q('settled'), along(R.settled));
      const fig = svg.querySelector<SVGElement>('[data-scene-part="figure"]');
      if (fig) w.set(fig, 'opacity', easeOut(seg(t, S.waver.figure)).toFixed(3));
    };
    return {
      scene: ch4,
      play: (t: number) => render(t, visible(svgs)),
      reset: () =>
        svgs.forEach((svg) =>
          svg.querySelectorAll<SVGElement>('path[data-waver], [data-scene-part="figure"], [data-waver-reveal]').forEach((el) => {
            el.style.transform = '';
            el.style.strokeDasharray = '';
            el.style.strokeDashoffset = '';
            el.style.opacity = '';
            w.forget(el);
          }),
        ),
    };
  })();

  /** ch 5: the CPU assembles (parts seat one by one, buses draw, signals wake) (t: pin.play). */
  const cpu = (() => {
    const svg = ch5?.querySelector<SVGSVGElement>('svg[data-scene-part="cpu"]');
    if (!ch5 || !svg) return null;
    const assembly = createCpuAssembly(svg);
    return {
      scene: ch5,
      play: (t: number) => assembly.render(t),
      reset: assembly.reset,
    };
  })();

  /** ch 6: the chess exchange — four moves, pulses along the thread, mirrored boards. */
  const chess = (() => {
    if (!ch6) return null;
    const svgs = [...ch6.querySelectorAll<SVGSVGElement>('svg[data-scene-part="chess"]')];
    const exchange = createChessExchange();
    const art = ch6.querySelector<HTMLElement>('[data-illus="chess"]');
    return {
      scene: ch6,
      /** The pin's progress drives the exchange; `entry` = px still to go before the pin engages (lane art only). */
      pinned: (p: number, entry: number) => {
        const svg = visible(svgs);
        if (svg) exchange.render(svg, p);
        exchange.entry(art, entry);
      },
      reset: exchange.reset,
    };
  })();

  /**
   * The chapter illustrations (S4): each plays while its chapter is pinned (t over pin.play);
   * ch 17's timeline spans its whole pin (the sunrise is the stage's sun, useStoryStage).
   */
  const illusDefs: [string, string, (root: Element) => IllusTimeline][] = [
    ['chapter-1', 'spark', sparkMotion],
    ['chapter-2', 'stage', stageMotion],
    ['chapter-7', 'door', applicationsMotion],
    ['chapter-8', 'workbench', workbenchMotion],
    ['chapter-9', 'crowd', crowdMotion],
    ['chapter-10', 'days', daysMotion],
    ['chapter-11', 'window', windowLitMotion],
    ['chapter-13', 'windows-dark', windowsDarkMotion],
    ['chapter-14', 'fork', forkMotion],
    ['chapter-15', 'hub', hubMotion],
    ['chapter-16', 'trunk', trunkMotion],
    ['chapter-17', 'doorway', doorwayMotion],
  ];
  // They measure SVG geometry (getBBox, path lengths): without it (e.g. jsdom) the art stays as rendered.
  const geometry = typeof SVGGraphicsElement !== 'undefined' && typeof SVGGraphicsElement.prototype.getBBox === 'function';
  const illus = new Map(
    (geometry ? illusDefs : []).flatMap(([id, name, make]) => {
      const scene = byId(id);
      const art = scene?.querySelector<HTMLElement>(`[data-illus="${name}"]`);
      return scene && art ? [[scene, { art, tl: make(art), last: NaN }] as [HTMLElement, { art: HTMLElement; tl: IllusTimeline; last: number }]] : [];
    }),
  );
  const doorwayScene = byId('chapter-17');
  const resetIllus = () =>
    illus.forEach((x) => {
      x.tl.reset();
      delete x.art.dataset.illusReady;
    });

  /**
   * The chapters' typographic beats (all but ch 3's, which the board times): the lines rise in
   * one by one at the end of the pin (motion.story.quote). `artEnd` is where the chapter's own
   * timeline must be finished (1: it keeps its pacing, the quote has a fixed window).
   */
  const quotes = new Map(
    sceneEls.flatMap((scene) => {
      if (scene === ch3) return [];
      // One quote per chapter, sometimes in two places (ch 4: beside its line on desktop, in
      // the flow below lg; one is display:none): each copy's lines land in turn.
      const blocks = [...scene.querySelectorAll<HTMLElement>('[data-scene-part="quote"]')].map((q) => [
        ...q.querySelectorAll<HTMLElement>('[data-quote-line]'),
      ]);
      const lines = blocks.flat();
      if (!lines.length || !S.pin.length[scene.id]) return [];
      const { artEnd, play, lines: [a, b] } = quoteTiming(scene.id, true);
      const Q = S.quote;
      const render = (p: number) =>
        blocks.forEach((block) =>
          block.forEach((el, i) => {
            const e = easeOut(seg(p, [a + ((b - a) * i) / block.length, a + ((b - a) * (i + 1)) / block.length]));
            w.set(el, 'opacity', e.toFixed(3));
            w.set(el, 'transform', `translate3d(0, ${((1 - e) * Q.rise).toFixed(1)}px, 0)`);
          }),
        );
      const reset = () =>
        lines.forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
          w.forget(el);
        });
      return [[scene, { artEnd, play, render, reset }] as const];
    }),
  );
  const resetQuotes = () => quotes.forEach((q) => q.reset());

  return { byId, board, field, waver, cpu, chess, illus, doorwayScene, resetIllus, quotes, resetQuotes };
}
