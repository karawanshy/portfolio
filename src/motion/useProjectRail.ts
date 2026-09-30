import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { motion } from './config';
import { invalidate, onScroll } from './driver';
import { layoutTop } from './progress';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** Per-rail tunables (motion.rail for Projects, motion.skillsRail for Skills). */
export interface RailConfig {
  /** The cards: `closest()` selector for a card <li> (keyboard focus brings it into view). */
  cardSelector: string;
  /** Page scroll can slide the rail from this viewport width up (below: row / swipe). */
  pinMinWidth: number;
  /** Vertical scroll px per px of horizontal travel while pinned. */
  scrollPerPx: number;
  /** Extra scroll (px) the finished rail stays pinned, last card on the gutter, before release. */
  endHold: number;
  /** Below this much horizontal travel (px, at the design card widths) nothing slides: `fit`. */
  minTravel: number;
  /** The pinned stage must fit the viewport (below the stage's scroll-margin-top) minus this (px). */
  fitMargin: number;
}

/**
 * Horizontal rail driven by vertical scroll — the Projects rail and the Skills rail.
 * Modes:
 * "Travel" is how far the rail would have to slide with the cards at their design
 * widths (`data-card-width` on each <li>, else the card's CSS flex-basis), so the
 * decision never depends on the current mode's layout. "Pin width" = config.pinMinWidth
 * (Projects: lg, Skills: md).
 * - `pin`   (pin width+, motion allowed, travel ≥ minTravel, stage fits the viewport):
 *           the section (or the stage's track) gets taller, the stage is `position: sticky`
 *           (both in CSS, from the vars set here), and page scroll slides the rail sideways.
 *           Native scroll throughout — it can't trap.
 * - `fit`   (pin width+, travel < minTravel — with or without reduced motion): nothing
 *           to slide; the cards flex to fit the gutters.
 * - `row`   (md up to the pin width, or pin width+ when a long slide can't pin): scroll-snap row.
 * - `swipe` (phones): scroll-snap row, the hint follows the current card.
 * - `stack` (md+ with reduced motion and a long travel): cards stack / wrap.
 * Without JS the markup is a static fallback with every card visible (global.css).
 *
 * The slide starts at the later of the section top and the moment the stage pins, so an
 * anchor jump to the section lands on card 1; CSS sizes the pin so it ends `endHold` px
 * after the slide (vars: --rail-slide, --rail-end-hold, --rail-stage-h, --rail-lead =
 * the stage's track top below the section top).
 */
export type RailMode = 'pin' | 'fit' | 'row' | 'swipe' | 'stack';

interface Refs {
  section: RefObject<HTMLElement | null>;
  stage: RefObject<HTMLElement | null>;
  rail: RefObject<HTMLElement | null>;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A card's design width: `data-card-width`, else its CSS flex-basis, else its box. */
function cardWidth(li: HTMLElement) {
  if (li.dataset.cardWidth) return Number(li.dataset.cardWidth);
  const basis = getComputedStyle(li).flexBasis;
  return basis.endsWith('px') ? parseFloat(basis) : li.offsetWidth;
}

/** Travel with the cards at their design widths (independent of the current layout). */
function designTravel(rail: HTMLElement) {
  const cards = [...rail.children] as HTMLElement[];
  const style = getComputedStyle(rail);
  const widths = cards.reduce((sum, li) => sum + cardWidth(li), 0);
  const gaps = (cards.length - 1) * (parseFloat(style.columnGap) || 0);
  return widths + gaps + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) - rail.clientWidth;
}

/** Horizontal distance the rail must travel so the last card ends on the right gutter. */
function measureTravel(rail: HTMLElement) {
  const cards = rail.children;
  const last = cards[cards.length - 1] as HTMLElement | undefined;
  if (!last) return 0;
  const style = getComputedStyle(rail);
  // offsetLeft is layout-only (ignores the transform we apply).
  const end = last.offsetLeft - (rail.firstElementChild as HTMLElement).offsetLeft + last.offsetWidth;
  return end + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) - rail.clientWidth;
}

/** The Projects rail (motion.rail). */
export const useProjectRail = (refs: Refs, count: number) => useRail(refs, count, motion.rail);

export function useRail({ section: sectionRef, stage: stageRef, rail: railRef }: Refs, count: number, config: RailConfig) {
  const { cardSelector, pinMinWidth, scrollPerPx, endHold, minTravel, fitMargin } = config;
  const reduced = usePrefersReducedMotion();
  const md = useMediaQuery('(min-width: 768px)');
  const lg = useMediaQuery(`(min-width: ${pinMinWidth}px)`);
  const [lgLayout, setLgLayout] = useState<{ longTravel: boolean; fitsViewport: boolean }>({
    longTravel: true,
    fitsViewport: true,
  });
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  let mode: RailMode;
  if (!md) mode = 'swipe';
  else if (!lg) mode = reduced ? 'stack' : 'row';
  else if (!lgLayout.longTravel) mode = 'fit';
  else if (reduced) mode = 'stack';
  else mode = lgLayout.fitsViewport ? 'pin' : 'row';

  // Pin width+: is there a meaningful slide, and would the pinned block fit the viewport?
  useLayoutEffect(() => {
    const rail = railRef.current;
    const stage = stageRef.current;
    if (!lg || !rail || !stage) return;
    const check = () => {
      const longTravel = designTravel(rail) >= minTravel;
      // A stage that must stay clear of the top bar says so with its scroll-margin-top.
      const inset = parseFloat(getComputedStyle(stage).scrollMarginTop) || 0;
      // Unrounded height: the same rule as the pre-hydration CSS estimate (global.css).
      const fitsViewport = stage.getBoundingClientRect().height <= window.innerHeight - inset - fitMargin;
      setLgLayout((prev) =>
        prev.longTravel === longTravel && prev.fitsViewport === fitsViewport ? prev : { longTravel, fitsViewport },
      );
    };
    check();
    return onScroll(({ resized }) => {
      if (resized) check();
    });
  }, [lg, railRef, stageRef, minTravel, fitMargin]);

  // Pinned: feed the pin geometry to CSS, map scroll → translateX.
  // The pin length and the stage's sticky `top` are CSS (global.css, "Pinned project
  // rail" / "Skills rail pin"), computed from the --rail-* vars, so the prerendered page
  // already reserves them before hydration (no layout shift). Here we only measure the real values.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const rail = railRef.current;
    const track = stage?.parentElement;
    if (mode !== 'pin' || !section || !stage || !rail || !track) return;

    let travel = 0;
    let distance = 1;
    /** The stage's sticky `top` (px; CSS, from --rail-stage-h and the viewport). */
    let stickyTop = 0;

    const measure = () => {
      travel = Math.max(0, measureTravel(rail));
      distance = Math.max(1, Math.round(travel * scrollPerPx));
      section.style.setProperty('--rail-slide', `${distance}px`);
      section.style.setProperty('--rail-end-hold', `${endHold}px`);
      section.style.setProperty('--rail-stage-h', `${stage.getBoundingClientRect().height}px`);
      section.style.setProperty('--rail-lead', `${layoutTop(track) - layoutTop(section)}px`);
      stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    };
    measure(); // before paint

    // The stage can change height after this (e.g. a late font swap re-wraps card
    // text), which moves its centred sticky position; re-measure whenever the stage or
    // rail resizes so the slide still ends while pinned.
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            measure();
            invalidate();
          });
    ro?.observe(stage);
    ro?.observe(rail);
    /**
     * Page scrollY at which the slide starts (progress 0): the section top, or the moment
     * the stage pins (its track's top minus its sticky top) if that's later — in layout
     * coordinates. offsetTop ignores transforms, so a section still running its reveal
     * (translateY) doesn't delay the slide against the (untransformed) sticky range.
     */
    const slideStart = () => Math.max(layoutTop(section), layoutTop(track) - stickyTop);

    const stop = onScroll(({ scrollY, resized }) => {
      if (resized) measure();
      const progress = clamp01((scrollY - slideStart()) / distance);
      rail.style.transform = `translate3d(${(-progress * travel).toFixed(1)}px, 0, 0)`;
      setActive(Math.round(progress * (count - 1)));
    });

    // Keyboard: tabbing into an off-screen card scrolls the page to where it's shown.
    // Not on a mouse click (no :focus-visible): scrolling under the pointer between
    // press and release would move the button away and swallow the click.
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element;
      const li = el.closest(cardSelector);
      if (!li || !el.matches(':focus-visible')) return;
      const index = [...rail.children].indexOf(li);
      const r = li.getBoundingClientRect();
      if (r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight) return;
      const y = slideStart() + (count > 1 ? index / (count - 1) : 0) * distance;
      window.scrollTo({ top: y, behavior: 'instant' });
    };
    rail.addEventListener('focusin', onFocusIn);

    return () => {
      stop();
      ro?.disconnect();
      rail.removeEventListener('focusin', onFocusIn);
      rail.style.transform = '';
      for (const v of ['--rail-slide', '--rail-end-hold', '--rail-stage-h', '--rail-lead']) section.style.removeProperty(v);
    };
  }, [mode, count, sectionRef, stageRef, railRef, cardSelector, scrollPerPx, endHold]);

  // Row / swipe: follow the rail's own horizontal scroll.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || (mode !== 'row' && mode !== 'swipe')) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = rail.scrollWidth - rail.clientWidth;
      const x = rail.scrollLeft;
      const first = (rail.firstElementChild as HTMLElement | null)?.offsetLeft ?? 0;
      let index = 0;
      if (max > 0 && x >= max - 2) index = count - 1;
      else {
        let best = Infinity;
        [...rail.children].forEach((li, i) => {
          const d = Math.abs((li as HTMLElement).offsetLeft - first - x);
          if (d < best) {
            best = d;
            index = i;
          }
        });
      }
      setActive(index);
      setEdges({ start: x <= 2, end: max <= 2 || x >= max - 2 });
    };
    const onRailScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    rail.addEventListener('scroll', onRailScroll, { passive: true });
    const stop = onScroll(({ resized }) => {
      if (resized) onRailScroll();
    });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      rail.removeEventListener('scroll', onRailScroll);
      stop();
    };
  }, [mode, count, railRef]);

  /**
   * Row/swipe: scroll one card back (-1) or on (+1). Counted from the card nearest the
   * scroll position (the one the counter shows, so a press during the previous smooth
   * scroll still moves on by one). At the row's end — where the last cards are all in
   * view and the leftmost one may be cut — "back" is the nearest card start left of it.
   */
  const step = useCallback(
    (dir: -1 | 1) => {
      const rail = railRef.current;
      const first = rail?.firstElementChild as HTMLElement | null | undefined;
      if (!rail || !first) return;
      const x = rail.scrollLeft;
      const max = rail.scrollWidth - rail.clientWidth;
      const starts = [...rail.children].map((li) => (li as HTMLElement).offsetLeft - first.offsetLeft);
      let nearest = 0;
      starts.forEach((s, i) => {
        if (Math.abs(s - x) < Math.abs(starts[nearest]! - x)) nearest = i;
      });
      let target: number;
      if (dir > 0) target = starts.slice(nearest + 1).find((s) => s > x + 2) ?? max;
      else if (x >= max - 2) target = [...starts].reverse().find((s) => s < x - 2) ?? 0;
      else target = starts[Math.max(0, nearest - 1)]!;
      rail.scrollTo({ left: Math.min(max, target), behavior: reduced ? 'auto' : 'smooth' });
    },
    [railRef, reduced],
  );

  return { mode, active: mode === 'stack' || mode === 'fit' ? 0 : active, atStart: edges.start, atEnd: edges.end, step };
}
