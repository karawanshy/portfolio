import { motion } from '@/motion/config';
import { DOOR, DOOR_SWING, doorLeaf } from '../scenes/illusData';
import { easeInOut, easeOut, f1, f3, lerp, seg, smooth, Styler, svgEl, type IllusTimeline } from './sceneKit';

const C = motion.story.doorway;

/** The door's leaf swung between two DOOR_SWING states (k 0 → 1), written into its paths. */
function swingDoor(s: Styler, door: Element | null, from: keyof typeof DOOR_SWING, to: keyof typeof DOOR_SWING, k: number) {
  if (!door) return;
  const a = DOOR_SWING[from];
  const b = DOOR_SWING[to];
  const leaf = doorLeaf(DOOR.w * lerp(a.open, b.open, k), lerp(a.drop, b.drop, k), lerp(a.rise, b.rise, k));
  s.attr(door.querySelector('[data-door-leaf="leaf"]'), 'd', leaf.leaf);
  s.attr(door.querySelector('[data-door-leaf="recess"]'), 'd', leaf.recess);
  s.attr(door.querySelector('[data-door-part="edge"]'), 'd', leaf.edge);
  const knob = door.querySelector('[data-door-part="knob"]');
  s.attr(knob, 'cx', String(leaf.knob[0]));
  s.attr(knob, 'cy', String(leaf.knob[1]));
  // The leaf's lit free edge only shows once light reaches it.
  s.opacity(door.querySelector('[data-door-part="edge"]'), seg(k, [0, 0.3]));
}

/**
 * ch 17, the climax (see motion.story.doorway): the doorway draws itself into the wall and its
 * bricks settle; the door swings fully open and warm light spills out. `render(t)` 0→1,
 * reversible; `reset` restores the markup (the finished state: the door open). The sunrise is the stage's sun (motion.story.sun).
 */
export function doorwayMotion(root: Element): IllusTimeline {
  const s = new Styler();
  const svg = root.querySelector('svg');
  const q = <T extends Element = SVGGraphicsElement>(sel: string) => root.querySelector<T>(sel);
  const bricks = q('[data-wall-bricks]');
  const drawn = q('[data-wall-drawn]');
  const construction = q('[data-doorway="construction"]');
  const outline = q<SVGGeometryElement>('[data-doorway="outline"]');
  const door = q('g[data-door="open"]');
  const doorway = q('g[data-doorway="door"]');
  const inside = door?.querySelector('[data-door-part="light"]') ?? null;
  const spill = q('[data-doorway="spill"]');
  const bloom = q('[data-doorway="bloom"]');

  interface Sweep {
    rect: SVGRectElement;
    from: number;
    to: number;
    axis: 'x' | 'y';
  }
  let sweeps: { construction: Sweep | null; drawn: Sweep | null } | null = null;
  let outlineLength = 0;

  /** A soft-edged reveal mask (motion only) over `el`: a white rect with a faded leading edge, moved across it. */
  const sweep = (defs: SVGDefsElement, el: SVGGraphicsElement | null, id: string, axis: 'x' | 'y'): Sweep | null => {
    if (!el) return null;
    const b = el.getBBox();
    const soft = 28;
    const big = 1000;
    // x: revealed left → right (leading edge on the right); y: bottom → top (leading edge on top).
    const grad = svgEl('linearGradient', axis === 'x' ? { id: `${id}-edge`, x1: 0, y1: 0, x2: 1, y2: 0 } : { id: `${id}-edge`, x1: 0, y1: 1, x2: 0, y2: 0 });
    [
      [0, 1],
      [big / (big + soft), 1],
      [1, 0],
    ].forEach(([o, a]) => grad.append(svgEl('stop', { offset: o!, 'stop-color': 'white', 'stop-opacity': a! })));
    const mask = svgEl('mask', { id, maskUnits: 'userSpaceOnUse', x: -big, y: -big, width: 3 * big, height: 3 * big });
    const rect =
      axis === 'x'
        ? svgEl('rect', { x: -big - soft, y: -big, width: big + soft, height: 3 * big, fill: `url(#${id}-edge)` })
        : svgEl('rect', { x: -big, y: 0, width: 3 * big, height: big + soft, fill: `url(#${id}-edge)` });
    mask.append(rect);
    defs.append(grad, mask);
    s.attr(el, 'mask', `url(#${id})`);
    // Rect's leading edge: x — its right end at translate; y — its top at translate.
    return axis === 'x'
      ? { rect, axis, from: b.x - 2, to: b.x + b.width + soft + 2 }
      : { rect, axis, from: b.y + b.height + 2, to: b.y - soft - 2 };
  };
  const build = () => {
    const defs = s.adopt(svgEl('defs', { 'data-motion-copy': '' }));
    svg?.prepend(defs);
    const out = {
      construction: sweep(defs, construction, 'ch17-reveal-construction', 'x'),
      drawn: sweep(defs, drawn, 'ch17-reveal-drawn', 'y'),
    };
    outlineLength = outline?.getTotalLength() ?? 0;
    s.style(outline, 'strokeDasharray', `${f1(outlineLength)} ${f1(outlineLength + 2)}`);
    return out;
  };
  const place = (w: Sweep | null, k: number) => {
    if (!w) return;
    const v = lerp(w.from, w.to, k);
    s.style(w.rect, 'transform', w.axis === 'x' ? `translate(${f1(v)}px, 0px)` : `translate(0px, ${f1(v)}px)`);
  };

  return {
    render(t) {
      sweeps ??= build();
      // The doorway draws itself: construction lines (left → right), outlined bricks (course by course), the casing line.
      place(sweeps.construction, easeInOut(seg(t, C.draw)));
      place(sweeps.drawn, easeInOut(seg(t, C.draw)));
      const o = easeInOut(seg(t, C.outline));
      s.style(outline, 'strokeDashoffset', f1((outlineLength + 1) * (1 - o)));
      s.style(outline, 'opacity', o > 0 ? '' : '0');
      // The plain wall is there from the start; its laid bricks settle.
      const b = easeOut(seg(t, C.bricks));
      s.style(bricks, 'transform', b >= 1 ? '' : `translate(0px, ${f1(-C.settle * (1 - b))}px)`);
      // The door (casing and leaf) doesn't exist yet: it appears as the drawing completes.
      const a = smooth(seg(t, C.appear));
      s.style(doorway, 'opacity', a >= 1 ? '' : f3(a));
      // The door swings from closed to fully open; the light comes up behind it and spills out.
      const k = easeInOut(seg(t, C.door));
      swingDoor(s, door, 'closed', 'open', k);
      if (k >= 1) s.style(door?.querySelector('[data-door-part="edge"]'), 'opacity', '');
      const l = easeOut(seg(t, C.light));
      s.style(inside, 'opacity', l >= 1 ? '' : f3(lerp(0.3, 1, l)));
      s.style(spill, 'opacity', l >= 1 ? '' : f3(l));
      s.style(bloom, 'opacity', l >= 1 ? '' : f3(l));
    },
    reset: () => {
      s.reset();
      sweeps = null;
    },
  };
}
