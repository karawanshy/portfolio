import { motion } from '@/motion/config';
import { moves, squareXY, type Side } from '../scenes/chessData';

/**
 * ch 6: the chess exchange as `p` goes 0 → 1 (scroll-linked, so it un-plays exactly on
 * the way back). See Chess.tsx / chessData.ts for the hooks. For each move, in order:
 * the mover's piece lifts, crosses to its square and lands; a pulse runs the thread
 * (the hub glows as it passes); the mirrored piece moves on the other board; the
 * last-move highlights follow. The thread brightens as the exchange runs.
 *
 * Pieces are board-local: `translate(x px, y px)` from squareXY (+ a lift scale about
 * the piece itself); the board groups keep their own placement and tilt. Only the
 * pieces that move are driven (the rest stand still). Writes only transform and
 * opacity (plus the highlight's fill, swapped only when the mover's side changes),
 * and only when a value changed. Thread geometry is measured once per SVG.
 */
const X = motion.story.chess;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type Prop = 'transform' | 'opacity' | 'fill' | 'strokeOpacity';

interface Geo {
  thread: SVGPathElement | null;
  len: number;
  glow: SVGElement | null;
  hub: SVGGElement | null;
  ring: SVGElement | null;
  pulses: (SVGCircleElement | null)[];
  tails: (SVGElement | null)[];
  pieces: Map<string, SVGGElement>; // `${side}:${id}`
  highlights: Record<Side, { from: SVGRectElement | null; to: SVGRectElement | null }>;
}

export function createChessExchange() {
  const cache = new Map<Element, Map<Prop, string>>();
  /** The inline value each driven property had before motion touched it (restored on reset). */
  const original = new Map<Prop, Map<Element, string>>();
  const set = (el: SVGElement | null, prop: Prop, value: string) => {
    if (!el) return;
    let m = cache.get(el);
    if (!m) cache.set(el, (m = new Map()));
    if (m.get(prop) === value) return;
    if (!m.has(prop)) {
      let o = original.get(prop);
      if (!o) original.set(prop, (o = new Map()));
      o.set(el, el.style[prop]);
    }
    m.set(prop, value);
    el.style[prop] = value;
  };
  const geos = new Map<SVGSVGElement, Geo>();

  const build = (svg: SVGSVGElement): Geo => {
    const thread = svg.querySelector<SVGPathElement>('path[data-chess-thread]');
    let len: number;
    try {
      len = thread?.getTotalLength() ?? 0;
    } catch {
      len = 0;
    }
    const pieces = new Map<string, SVGGElement>();
    const highlights = {} as Geo['highlights'];
    for (const side of ['a', 'b'] as const) {
      const board = svg.querySelector<SVGGElement>(`g[data-chess-board="${side}"]`);
      for (const m of moves) {
        const el = board?.querySelector<SVGGElement>(`g[data-chess-piece="${m.piece}"]`);
        if (el) pieces.set(`${side}:${m.piece}`, el);
      }
      highlights[side] = {
        from: board?.querySelector<SVGRectElement>('rect[data-chess-highlight="from"]') ?? null,
        to: board?.querySelector<SVGRectElement>('rect[data-chess-highlight="to"]') ?? null,
      };
    }
    return {
      thread,
      len,
      glow: svg.querySelector<SVGElement>('path[data-chess-thread-glow]'),
      hub: svg.querySelector<SVGGElement>('g[data-chess-hub]'),
      // The hub's outer (dashed) ring: its first circle.
      ring: svg.querySelector<SVGElement>('g[data-chess-hub] > circle'),
      pulses: moves.map((m) => svg.querySelector<SVGCircleElement>(`circle[data-chess-pulse="${m.index}"]`)),
      tails: moves.map((m) => svg.querySelector<SVGElement>(`rect[data-chess-pulse-tail="${m.index}"]`)),
      pieces,
      highlights,
    };
  };

  const render = (svg: SVGSVGElement, p: number) => {
    let g = geos.get(svg);
    if (!g) geos.set(svg, (g = build(svg)));
    const play = seg(p, X.play);
    const slot = 1 / moves.length;

    // Where each driven piece is on each board: start square, then each of its moves.
    const place = new Map<string, { x: number; y: number; lift: number }>();
    const lastOn: Record<Side, number> = { a: -1, b: -1 }; // last move shown on each board
    let hubGlow = 0;
    moves.forEach((m, i) => {
      const local = clamp01((play - i * slot) / slot);
      for (const side of ['a', 'b'] as const) {
        const key = `${side}:${m.piece}`;
        const mover = side === m.side;
        // Travel progress on this board: the mover lifts and travels; the other board receives.
        const f = mover ? easeInOut(seg(local, X.travel)) : easeInOut(seg(local, X.receive));
        const up = mover ? seg(local, X.lift) * (1 - seg(local, [X.travel[1] - 0.06, X.travel[1]])) : Math.sin(Math.PI * seg(local, X.receive));
        const [x0, y0] = place.has(key) ? [place.get(key)!.x, place.get(key)!.y] : squareXY(m.from, side);
        const [x1, y1] = squareXY(m.to, side);
        if (f > 0 || !place.has(key)) place.set(key, { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, lift: f > 0 || up > 0 ? up : 0 });
        if (f >= 1) lastOn[side] = i;
      }
      // The pulse along the thread (its tail behind it, along its heading), and the hub as it passes.
      const pl = seg(local, X.pulse);
      const pulse = g!.pulses[i] ?? null;
      const tail = g!.tails[i] ?? null;
      if (g!.thread && g!.len > 0) {
        const [a0, a1] = m.pulse;
        // Near-constant speed along the thread (so the pass through the hub reads), softened at the ends.
        const at = a0 + (a1 - a0) * (0.8 * pl + 0.2 * easeInOut(pl));
        const pt = g!.thread.getPointAtLength(at * g!.len);
        const back = g!.thread.getPointAtLength(clamp01(at - Math.sign(a1 - a0) * 0.03) * g!.len);
        const heading = (Math.atan2(pt.y - back.y, pt.x - back.x) * 180) / Math.PI;
        const visible = pl > 0 && pl < 1 ? Math.min(1, Math.min(pl, 1 - pl) / 0.08) : 0;
        const xy = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)`;
        set(pulse, 'transform', xy);
        set(pulse, 'opacity', visible.toFixed(3));
        set(tail, 'transform', `${xy} rotate(${heading.toFixed(1)}deg)`);
        set(tail, 'opacity', (visible * X.tail * Math.min(1, pl / 0.12)).toFixed(3));
        if (visible > 0) hubGlow = Math.max(hubGlow, clamp01(1 - Math.abs(at - 0.5) / X.hubGlow.width));
      }
    });

    for (const [key, el] of g.pieces) {
      const pos = place.get(key);
      if (!pos) continue;
      const s = 1 + X.liftScale * pos.lift;
      set(
        el,
        'transform',
        `translate(${pos.x.toFixed(2)}px, ${(pos.y - X.liftRise * pos.lift).toFixed(2)}px)${pos.lift > 0 ? ` scale(${s.toFixed(3)})` : ''}`,
      );
    }
    // Last-move highlights follow each board's own latest move.
    for (const side of ['a', 'b'] as const) {
      const k = lastOn[side];
      const hl = g.highlights[side];
      for (const which of ['from', 'to'] as const) {
        const el = hl[which];
        if (!el) continue;
        if (k < 0) {
          set(el, 'opacity', '0');
          continue;
        }
        const m = moves[k]!;
        const [x, y] = squareXY(which === 'from' ? m.from : m.to, side);
        set(el, 'transform', `translate(${x}px, ${y}px)`);
        set(el, 'fill', `var(--chess-highlight-${m.side})`);
        set(el, 'opacity', '1');
      }
    }
    // The thread brightens as the exchange runs.
    const lit = play;
    set(g.thread, 'opacity', (X.thread.dim + (1 - X.thread.dim) * lit).toFixed(3));
    set(g.glow, 'opacity', (X.thread.glowDim + (0.35 - X.thread.glowDim) * lit).toFixed(3));
    const glow = easeOut(hubGlow);
    set(g.hub, 'transform', hubGlow > 0 ? `scale(${(1 + X.hubGlow.scale * glow).toFixed(3)})` : 'none');
    set(g.ring, 'strokeOpacity', (0.3 + (X.hubGlow.ring - 0.3) * glow).toFixed(3));
  };

  /** Pinned: the art rises toward its pinned pose while `d` px remain before the pin engages. */
  const entry = (art: HTMLElement | null, d: number) => {
    if (!art) return;
    const L = X.entryLift;
    const y = d > 0 ? -L * (1 - Math.exp(-d / L)) : 0;
    set(art as unknown as SVGElement, 'transform', y < -0.05 ? `translate3d(0, ${y.toFixed(1)}px, 0)` : 'none');
  };

  const reset = () => {
    // Back to the markup's own inline values (pieces, highlights and pulses are placed inline).
    original.forEach((els, prop) => els.forEach((v, el) => ((el as SVGElement).style[prop] = v)));
    original.clear();
    cache.clear();
    geos.clear();
  };

  return { render, entry, reset };
}

