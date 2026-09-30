import { motion } from '@/motion/config';
import { busReadyAfter, cpuBuses, cpuComponents } from '../scenes/cpuData';

/**
 * ch 5: the CPU assembles as `t` goes 0 → 1 (scroll-linked, so it reverses exactly).
 * See Cpu.tsx / cpuData.ts for the hooks. The structure (package, pins, slot guides)
 * never moves; the parts arrive into their seats one by one, the buses draw between
 * seated parts, then the signals come alive. Writes only transform, opacity and dash
 * offsets, and only when a value changed.
 */
const C = motion.story.cpu;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, [a, b]: readonly [number, number]) => clamp01((t - a) / (b - a));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/**
 * A hand bringing a part in and setting it down: an eased approach that passes the
 * seat by a hair (overshoot), then settles back: 0 → 1 (+overshoot) → 1.
 */
function seat(s: number, overshoot: number) {
  const k = 0.78; // where it passes the seat
  if (s < k) return easeInOut(s / k) * (1 + overshoot);
  return 1 + overshoot * (1 - easeInOut((s - k) / (1 - k)));
}

type Prop = 'transform' | 'opacity' | 'strokeDashoffset' | 'strokeDasharray';

export function createCpuAssembly(svg: SVGSVGElement) {
  const cache = new Map<Element, Map<Prop, string>>();
  /** The inline value each driven property had before motion touched it (restored on reset). */
  const original = new Map<Prop, Map<Element, string>>();
  const set = (el: SVGElement, prop: Prop, value: string) => {
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

  const n = cpuComponents.length;
  const [p0, p1] = C.parts;
  const startOf = (order: number) => p0 + (n > 1 ? (order * (p1 - p0 - C.partSpan)) / (n - 1) : 0);
  /** When each part is fully seated (t). */
  const seatedAt = (order: number) => startOf(order) + C.partSpan;

  const parts = cpuComponents.map((c) => ({
    c,
    el: svg.querySelector<SVGGElement>(`g[data-cpu-part="${c.id}"]`),
    slot: svg.querySelector<SVGElement>(`[data-cpu-slot="${c.id}"]`),
  }));
  const buses = cpuBuses.map((b) => ({
    el: svg.querySelector<SVGPathElement>(`path[data-cpu-bus="${b.index}"]`),
    from: seatedAt(busReadyAfter(b)),
  }));
  buses.forEach(({ el }) => el && (el.style.strokeDasharray = '1 1'));
  // Slot guides draw in the full line tone while motion runs (opacity sets their brightness).
  parts.forEach(({ slot }) => slot && (slot.style.stroke = 'var(--cpu-line)'));
  const signals = [...svg.querySelectorAll<SVGCircleElement>('circle[data-cpu-signal]')];

  const render = (t: number) => {
    for (const { c, el, slot } of parts) {
      const s = clamp01((t - startOf(c.order)) / C.partSpan);
      if (el) {
        const k = seat(s, C.overshoot);
        const x = c.dx * (1 - k);
        const y = c.dy * (1 - k);
        const r = c.rotate * (1 - Math.min(1, k));
        set(el, 'transform', s >= 1 ? 'none' : `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg)`);
        set(el, 'opacity', s <= 0 ? '0' : Math.min(1, s / C.fadeIn).toFixed(3));
      }
      if (slot) {
        // Waiting → brightens as its part seats → settles faint.
        const up = seg(s, C.slot.flash);
        const down = clamp01((t - seatedAt(c.order)) / C.slot.fade);
        const o =
          s < 1 ? C.slot.waiting + (C.slot.peak - C.slot.waiting) * up : C.slot.peak - (C.slot.peak - C.slot.seated) * easeInOut(down);
        set(slot, 'opacity', o.toFixed(3));
      }
    }
    for (const b of buses) {
      if (!b.el) continue;
      const f = easeInOut(clamp01((t - b.from) / C.busSpan));
      set(b.el, 'strokeDashoffset', (1 - f).toFixed(4));
      set(b.el, 'opacity', f > 0 ? '1' : '0');
    }
    const [s0, s1] = C.signals;
    signals.forEach((el, i) => {
      const span = (s1 - s0) / Math.max(1, signals.length);
      const f = clamp01((t - (s0 + i * span * 0.6)) / (span * 1.4));
      const pop = f <= 0 ? 0 : 1 + C.signalPop * Math.sin(Math.PI * f) * (1 - f);
      set(el, 'opacity', easeOutCubic(f).toFixed(3));
      set(el, 'transform', f >= 1 ? 'none' : `scale(${Math.max(0.01, pop * easeOutCubic(f)).toFixed(3)})`);
    });
  };

  const reset = () => {
    original.forEach((els, prop) => els.forEach((v, el) => ((el as SVGElement).style[prop] = v)));
    original.clear();
    buses.forEach(({ el }) => el && (el.style.strokeDasharray = ''));
    parts.forEach(({ slot }) => slot && (slot.style.stroke = ''));
    cache.clear();
  };

  return { render, reset };
}
