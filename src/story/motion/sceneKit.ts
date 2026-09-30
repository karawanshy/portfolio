/**
 * Shared helpers for the chapter-illustration motion (illusMotion.ts, doorwayMotion.ts):
 * timeline maths, a style writer that remembers what it replaced (so `reset` restores the
 * prerendered markup exactly), and a scene's pin range.
 */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 0→1 across [a, b]. */
export const seg = (t: number, [a, b]: readonly [number, number]) => (b > a ? clamp01((t - a) / (b - a)) : t >= b ? 1 : 0);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** An eased approach that passes its target by `overshoot` (fraction), then settles back: 0 → 1+o → 1. */
export function settle(s: number, overshoot: number) {
  const k = 0.75;
  if (s < k) return smooth(s / k) * (1 + overshoot);
  return 1 + overshoot * (1 - smooth((s - k) / (1 - k)));
}
/** Start of item i of n spread across [a, b], each lasting `span` (neighbours overlap). */
export const staggerStart = (i: number, n: number, [a, b]: readonly [number, number], span: number) =>
  a + (n > 1 ? (i * (b - a - span)) / (n - 1) : 0);
export const f1 = (n: number) => n.toFixed(1);
export const f3 = (n: number) => n.toFixed(3);

type StyleProp = 'transform' | 'opacity' | 'strokeDasharray' | 'strokeDashoffset' | 'transformBox' | 'transformOrigin' | 'visibility';

/**
 * Writes styles / attributes only when they change, remembering the value each had before
 * motion first touched it; `reset` puts every one back and removes the nodes motion added.
 */
export class Styler {
  private cache = new Map<Element, Map<string, string>>();
  private styles = new Map<Element, Map<StyleProp, string>>();
  private attrs = new Map<Element, Map<string, string | null>>();
  private customs = new Map<HTMLElement | SVGElement, Map<string, string>>();
  private added: Element[] = [];

  style(el: Element | null | undefined, prop: StyleProp, value: string) {
    if (!el) return;
    const key = `s:${prop}`;
    let m = this.cache.get(el);
    if (!m) this.cache.set(el, (m = new Map()));
    if (m.get(key) === value) return;
    m.set(key, value);
    let o = this.styles.get(el);
    if (!o) this.styles.set(el, (o = new Map()));
    const s = (el as SVGElement).style;
    if (!o.has(prop)) o.set(prop, s[prop]);
    s[prop] = value;
  }
  opacity(el: Element | null | undefined, v: number) {
    this.style(el, 'opacity', f3(clamp01(v)));
  }
  attr(el: Element | null | undefined, name: string, value: string) {
    if (!el) return;
    const key = `a:${name}`;
    let m = this.cache.get(el);
    if (!m) this.cache.set(el, (m = new Map()));
    if (m.get(key) === value) return;
    m.set(key, value);
    let o = this.attrs.get(el);
    if (!o) this.attrs.set(el, (o = new Map()));
    if (!o.has(name)) o.set(name, el.getAttribute(name));
    el.setAttribute(name, value);
  }
  /** A CSS custom property on the element's inline style. */
  custom(el: HTMLElement | SVGElement | null | undefined, name: `--${string}`, value: string) {
    if (!el) return;
    const key = `c:${name}`;
    let m = this.cache.get(el);
    if (!m) this.cache.set(el, (m = new Map()));
    if (m.get(key) === value) return;
    m.set(key, value);
    let o = this.customs.get(el);
    if (!o) this.customs.set(el, (o = new Map()));
    if (!o.has(name)) o.set(name, el.style.getPropertyValue(name));
    el.style.setProperty(name, value);
  }
  /** A node added for motion only (removed on reset). */
  adopt<T extends Element>(el: T): T {
    this.added.push(el);
    return el;
  }
  reset() {
    this.styles.forEach((m, el) => m.forEach((v, p) => ((el as SVGElement).style[p] = v)));
    this.attrs.forEach((m, el) => m.forEach((v, n) => (v === null ? el.removeAttribute(n) : el.setAttribute(n, v))));
    this.customs.forEach((m, el) => m.forEach((v, n) => (v ? el.style.setProperty(n, v) : el.style.removeProperty(n))));
    this.added.forEach((el) => el.remove());
    this.customs.clear();
    this.styles.clear();
    this.attrs.clear();
    this.cache.clear();
    this.added = [];
  }
}

/** An SVG element's own `transform` attribute as a CSS matrix (so a CSS transform can compose with it). */
export function baseMatrix(el: SVGGraphicsElement): string {
  const m = el.transform?.baseVal?.consolidate?.()?.matrix;
  return m ? `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})` : '';
}

const NS = 'http://www.w3.org/2000/svg';
export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}


/**
 * A scene's pin as useStoryScenes laid it out: the page scroll range (px) over which its
 * [data-scene-pin] block is stuck, or null when it doesn't pin (reduced motion).
 */
export function readPin(scene: HTMLElement, scrollY: number): { start: number; end: number } | null {
  const pin = scene.querySelector<HTMLElement>('[data-scene-pin]');
  if (!pin || pin.style.position !== 'sticky') return null;
  const cs = getComputedStyle(scene);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const start = scene.getBoundingClientRect().top + scrollY + padTop - (parseFloat(pin.style.top) || 0);
  const length = scene.offsetHeight - pin.offsetHeight - padTop - (parseFloat(cs.paddingBottom) || 0);
  return length > 0 ? { start, end: start + length } : null;
}

/** One chapter's illustration timeline: `render(t)` for t 0→1 (reversible), `reset` back to the markup. */
export interface IllusTimeline {
  render(t: number): void;
  reset(): void;
}
