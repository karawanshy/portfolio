import { useLayoutEffect, useState, useSyncExternalStore, type CSSProperties, type RefObject } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { decodeHash } from '@/router/hash';
import { motion } from './config';
import { invalidate, onScroll } from './driver';
import { clamp01, cubicBezier, enterProgress, layoutTop, pinTimeline, staggerProgress } from './progress';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Skills: boxes (`[data-seq-item]`) enter one after another, then the section's
 * closing horizon line (`[data-seq-line]`, md+) draws in, scrubbed by scroll (scrolling
 * back reverses them). Markup:
 *   section[data-seq] > [data-seq-track] > [data-seq-stage] (the content) + [data-seq-spacer]
 *
 * Modes (`data-seq-mode` on the section):
 * - `auto`   server render and first client render. CSS pins where JS will pin
 *            (≥ pinMinWidth, motion allowed, tall enough), so the page doesn't shift on hydration.
 * - `pin`    ≥ pinMinWidth, `canPin` (nothing else pins the stage), motion allowed, the
 *            stage fits below the top bar: the spacer adds
 *            `count × perBox + endHold` px and the stage sticks (CSS, "Reveal sequences"
 *            in global.css) — centred below the top bar, but only once the line closing
 *            the previous section has scrolled away under the bar (--seq-clear). The sequence runs from `leadIn` × vh before the pin to
 *            `count × perBox` px into it. The section's scroll-margin makes anchor jumps
 *            land on the finished (all boxes in, still pinned) state.
 * - `scrub`  narrower, or a stage taller than the viewport, or the Skills rail pinning the
 *            stage for its slide (the stage may then be sticky: positions are measured
 *            from the track, as if unpinned);
 *            each box enters over its own position with the section-reveal window. Boxes
 *            already in view on load, or when an anchor jump lands on the section, show
 *            fully in; scrolling back up eases them back onto the scrub (`settleSpan`).
 * - `static` reduced motion: no pin, nothing hidden.
 * Without JS nothing is hidden and nothing pins (all rules are scoped to html.js / modes).
 */
export type SequenceMode = 'auto' | 'pin' | 'scrub' | 'static';

const noSubscribe = () => () => {};
const isClient = () => true;
const isServer = () => false;

/**
 * `name` keys the section's pre-hydration pin estimate in global.css (`[data-seq='…']`);
 * `pinCount` is how many steps show at md+ — boxes + the closing line (the pre-hydration pin length).
 */
export function useRevealSequence(
  sectionRef: RefObject<HTMLElement | null>,
  name: string,
  pinCount: number,
  /** false while something else pins the stage (the Skills rail sliding): scrub instead. */
  canPin = true,
) {
  const reduced = usePrefersReducedMotion();
  const wide = useMediaQuery(`(min-width: ${motion.sequence.pinMinWidth}px)`) && canPin;
  // false for the server render and hydration, true after (and in a client-only render).
  const mounted = useSyncExternalStore(noSubscribe, isClient, isServer);
  const [fits, setFits] = useState(true);

  const mode: SequenceMode = !mounted ? 'auto' : reduced ? 'static' : wide && fits ? 'pin' : 'scrub';

  // Would the pinned stage fit the viewport below the top bar?
  useLayoutEffect(() => {
    const stage = sectionRef.current?.querySelector<HTMLElement>('[data-seq-stage]');
    if (reduced || !wide || !stage) return;
    const check = () => {
      // The stage's scroll-margin-top is the top bar inset (--pin-top-inset), resolved to px.
      // Same rule (and exact height) as the pre-hydration estimate in global.css.
      const inset = parseFloat(getComputedStyle(stage).scrollMarginTop) || 0;
      setFits(stage.getBoundingClientRect().height <= window.innerHeight - inset - motion.sequence.fitMargin);
    };
    check();
    return onScroll(({ resized }) => {
      if (resized) check();
    });
  }, [reduced, wide, sectionRef]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = section?.querySelector<HTMLElement>('[data-seq-stage]');
    const track = stage?.parentElement;
    if ((mode !== 'pin' && mode !== 'scrub') || !section || !stage || !track) return;
    const s = motion.sequence;
    const r = motion.reveal;
    const ease = cubicBezier(r.ease);

    let items: HTMLElement[] = [];
    let line: HTMLElement | null = null;
    /** The section heading: the sequence's first step (before the boxes). */
    const head = stage.querySelector<HTMLElement>('[data-seq-head]');
    /** The line closing the previous section (it may publish `data-drawn-at`). */
    let prevLine: HTMLElement | null = null;
    let stickyTop = 0;
    let scrollPad = 0;
    let margin = NaN;
    const applied = new Map<HTMLElement, number>();

    const clear = (el: HTMLElement) => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.willChange = '';
    };
    const set = (el: HTMLElement, p: number) => {
      const e = Math.round(ease(p) * 1000) / 1000;
      if (applied.get(el) === e) return;
      applied.set(el, e);
      if (e >= 1) return clear(el);
      el.style.opacity = e.toFixed(3);
      // Boxes rise into place; the closing line draws out from its centre.
      el.style.transform =
        el === line ? `scaleX(${e.toFixed(3)})` : `translate3d(0, ${(r.distance * (1 - e)).toFixed(2)}px, 0)`;
      el.style.willChange = e > 0 ? 'opacity, transform' : '';
    };

    const measure = () => {
      // Only the boxes shown at this breakpoint.
      // The closing line (md+) is the last step, after every box.
      const shown = (el: HTMLElement) => el.getClientRects().length > 0;
      const closing = stage.querySelector<HTMLElement>('[data-seq-line]');
      line = closing && shown(closing) ? closing : null;
      const next = [...section.querySelectorAll<HTMLElement>('[data-seq-item]')].filter(shown);
      if (line) next.push(line);
      items.filter((el) => !next.includes(el)).forEach((el) => {
        clear(el);
        applied.delete(el);
      });
      items = next;
      // The line closing the previous section (it publishes where it finishes drawing).
      const above = section.previousElementSibling?.querySelectorAll<HTMLElement>('[data-horizon]');
      const prev = above && [...above].reverse().find(shown);
      prevLine = prev ?? null;
      if (mode === 'pin') {
        section.style.setProperty('--seq-count', String(items.length));
        section.style.setProperty('--seq-stage-h', `${stage.getBoundingClientRect().height}px`);
        // Pin only once that line has scrolled away under the top bar: the stage may stick
        // no lower than its distance above it. (The track, not the sticky stage, gives the
        // stage's layout position.)
        if (prev) {
          const clearance = layoutTop(track) - (layoutTop(prev) + prev.offsetHeight);
          section.style.setProperty('--seq-clear', `${Math.max(0, clearance)}px`);
        } else section.style.removeProperty('--seq-clear');
        stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      }
      scrollPad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    };
    measure();

    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            measure();
            invalidate();
          });
    ro?.observe(stage);

    // Scrub mode "settle": boxes in view when the page loads, or when an anchor jump lands
    // on this section, show fully in. From the landing position y0, scrolling back up
    // blends each box's missing progress (`deficit`) out over `settleSpan` × vh, back onto
    // the plain scrub; scrolling down only adds progress. `pending` holds 'load', or the
    // scrollY when a jump to this section was requested (the jump lands on a later frame).
    let pending: 'load' | number | null = mode === 'scrub' ? 'load' : null;
    let settle: { y0: number; deficit: Map<HTMLElement, number> } | null = null;
    let size = `${window.innerWidth}x${window.innerHeight}`;
    const requestSettle = (hash: string) => {
      if (mode !== 'scrub' || hash !== `#${section.id}`) return;
      pending = window.scrollY;
      invalidate();
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (link) requestSettle(decodeHash(link.getAttribute('href') ?? ''));
    };
    const onHashChange = () => requestSettle(decodeHash(location.hash));
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHashChange);

    const stop = onScroll(({ scrollY, vw, vh, resized }) => {
      if (resized) {
        measure();
        if (size !== (size = `${vw}x${vh}`)) settle = null;
      }
      if (mode === 'pin') {
        const { start, end } = pinTimeline({
          trackTop: layoutTop(track),
          stickyTop,
          vh,
          count: items.length,
          perBox: s.perBox,
          leadIn: s.leadIn,
        });
        // The boxes wait until the previous section's closing line has finished drawing
        // (it publishes where: data-drawn-at).
        const drawnAt = Number(prevLine?.dataset.drawnAt);
        // Chained: the heading starts right as the previous line finishes drawing.
        const at = Number.isFinite(drawnAt) ? Math.min(drawnAt, end - 1) : start;
        // First the heading, then the boxes (and the closing line last).
        if (head) set(head, clamp01((scrollY - at) / s.headSpan));
        const from = head ? Math.min(at + s.headSpan, end - 1) : at;
        const t = clamp01((scrollY - from) / (end - from));
        // This section's own closing line is fully drawn at `end`: publish it for the next section.
        if (line && line.dataset.drawnAt !== String(Math.round(end))) line.dataset.drawnAt = String(Math.round(end));
        // Boxes share the first `boxes` steps (overlapping); the closing line gets the last
        // step to itself, so it only starts drawing once every box is fully in.
        const boxes = line ? items.length - 1 : items.length;
        const tBoxes = boxes ? clamp01((t * items.length) / boxes) : 1;
        items.forEach((el, i) =>
          set(el, el === line ? clamp01(t * items.length - boxes) : staggerProgress(tBoxes, i, boxes, s.overlap)),
        );
        // Anchor jumps (nav, deep links, back/forward) land on the finished, still-pinned state.
        const m = Math.round(layoutTop(section) - scrollPad - end);
        if (m !== margin) {
          margin = m;
          section.style.scrollMarginTop = `${m}px`;
        }
      } else {
        // Unpinned layout positions: the stage may be sticky (the Skills rail pin), so
        // measure each element from the (non-sticky) track instead of where it's stuck.
        const base = layoutTop(track) - layoutTop(stage);
        const flowTop = (el: HTMLElement) => base + layoutTop(el);
        const tops = items.map(flowTop);
        // Wherever the previous section's closing line shows (md+), wait for it to draw:
        // the heading after it, the boxes after the heading.
        const drawnAt = prevLine?.getClientRects().length ? Number(prevLine.dataset.drawnAt) : NaN;
        const wait = (delay: number) =>
          Number.isFinite(drawnAt) ? clamp01((scrollY - drawnAt - delay) / s.headSpan) : 1;
        if (head) set(head, Math.min(enterProgress(flowTop(head) - scrollY, vh, r.from, r.to), wait(0)));
        // Unpinned, the closing line (md+ only) is fully in once its top reaches `to`.
        if (line) {
          const at = String(Math.round(flowTop(line) - r.to * vh));
          if (line.dataset.drawnAt !== at) line.dataset.drawnAt = at;
        }
        const raw = items.map((_, i) => {
          // Boxes sharing a row enter a little apart, left to right.
          let k = 0;
          for (let j = 0; j < i; j++) if (Math.abs(tops[j]! - tops[i]!) < 2) k++;
          return enterProgress(tops[i]! - scrollY + k * s.rowStagger, vh, r.from, r.to);
        });
        if (pending !== null) {
          const maxY = document.documentElement.scrollHeight - vh;
          const landed =
            pending === 'load' || Math.abs(scrollY - Math.min(maxY, layoutTop(section) - scrollPad)) <= 2;
          if (landed) {
            // Only boxes on screen; those still below the fold keep their entrance.
            const deficit = new Map(items.map((el, i) => [el, tops[i]! - scrollY < vh ? 1 - raw[i]! : 0]));
            settle = { y0: scrollY, deficit };
            pending = null;
          } else if (scrollY !== pending) pending = null;
        }
        const span = Math.max(1, s.settleSpan * vh);
        if (settle && scrollY < settle.y0 - span) settle = null;
        const blend = settle ? clamp01(1 - (settle.y0 - scrollY) / span) : 0;
        items.forEach((el, i) =>
          set(el, Math.min(1, raw[i]! + (settle?.deficit.get(el) ?? 0) * blend, wait(s.headSpan))),
        );
      }
    });

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHashChange);
      stop();
      ro?.disconnect();
      items.forEach(clear);
      if (head) clear(head);
      if (line) delete line.dataset.drawnAt;
      for (const v of ['--seq-count', '--seq-stage-h', '--seq-clear']) section.style.removeProperty(v);
      section.style.scrollMarginTop = '';
    };
  }, [mode, sectionRef]);

  return {
    mode,
    sectionProps: {
      'data-seq': name,
      'data-seq-mode': mode,
      // Pre-hydration pin height (CSS); JS re-measures the visible count.
      style: { '--seq-count': pinCount } as CSSProperties,
    },
  };
}
