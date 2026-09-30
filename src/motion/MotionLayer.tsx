import { useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { hashElement } from '@/router/hash';
import { motion } from './config';
import { Cursor } from './Cursor';
import { onScroll } from './driver';
import { clamp01, cubicBezier, enterProgress, layoutTop } from './progress';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Page-level motion that isn't owned by a single component: scroll-scrubbed section
 * reveals (sections; the Skills heading is part of its sequence,
 * whose boxes are driven by useRevealSequence), timeline sun nodes, project-card tilt
 * + gloss, and the custom cursor. Component-owned motion lives next to its component
 * (ribbon drift, hero parallax, project rail, reveal sequences, time of day,
 * scroll-spy); all share motion/driver.ts.
 *
 * Nothing here runs with reduced motion, and hidden starting states are only
 * applied from here, after motion is confirmed allowed — so content is always
 * visible without JS or with reduced motion.
 */
export function MotionLayer() {
  const reduced = usePrefersReducedMotion();
  const finePointer = useMediaQuery(motion.finePointerQuery);

  useEffect(() => {
    if (reduced) return;
    const root = document.documentElement;
    root.dataset.motion = 'on';
    const r = motion.reveal;
    const sections = scrubReveal(
      [
        ...document.querySelectorAll<HTMLElement>(
          'main > section:not(:first-child):not([data-seq]):not([data-own-reveal])',
        ),
      ],
      {
        from: r.from,
        to: r.to,
        ease: cubicBezier(r.ease),
        style: (e) => `translate3d(0, ${(r.distance * (1 - e)).toFixed(2)}px, 0)`,
        // Nothing below the hero before the first scroll.
        gate: (scrollY, vh) => clamp01(scrollY / Math.max(1, r.startScroll * vh)),
      },
    );
    const n = motion.sunNodes;
    const nodes = scrubReveal([...document.querySelectorAll<HTMLElement>('[data-sun-node]')], {
      from: n.from,
      to: n.to,
      ease: cubicBezier(n.ease),
      style: (e) =>
        `translate3d(0, ${(n.fromY * (1 - e)).toFixed(2)}px, 0) scale(${(n.fromScale + (1 - n.fromScale) * e).toFixed(4)})`,
    });
    // Experience items: each one's text enters together with its sun node (same window,
    // timed by the node's position), rising a little as it fades in.
    const items = scrubReveal([...document.querySelectorAll<HTMLElement>('[data-sun-content]')], {
      from: n.from,
      to: n.to,
      ease: cubicBezier(n.ease),
      anchor: (el) => el.parentElement?.querySelector<HTMLElement>('[data-sun-node]') ?? el,
      style: (e) => `translate3d(0, ${(n.contentRise * (1 - e)).toFixed(2)}px, 0)`,
    });
    // Experience: its title and company pill wait until well in view (and the first scroll).
    const eh = motion.experienceHead;
    const gate = (scrollY: number, vh: number) => clamp01(scrollY / Math.max(1, r.startScroll * vh));
    const expHead = scrubReveal([...document.querySelectorAll<HTMLElement>('[data-exp-head]')], {
      from: eh.from,
      to: eh.to,
      ease: cubicBezier(r.ease),
      style: (e) => `translate3d(0, ${(r.distance * (1 - e)).toFixed(2)}px, 0)`,
      gate,
    });
    const stopTimeline = litTimeline(gate);
    const stopProjects = projectsReveal();

    // Anchor jumps: a section still below the fold sits up to `distance` px low, so the
    // browser would scroll it short. Settle its transform BEFORE the jump (capture
    // phase, ahead of the default action and of the mobile menu's own handler).
    const targetOf = hashElement;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const target = link && targetOf(link.getAttribute('href') ?? '');
      if (target) sections.revealNow(target);
    };
    // Back/forward or a typed hash: the jump already happened, so re-land if needed.
    const onHashChange = () => {
      const target = targetOf(location.hash);
      if (target && sections.revealNow(target)) target.scrollIntoView();
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHashChange);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHashChange);
      sections.stop();
      nodes.stop();
      items.stop();
      expHead.stop();
      stopTimeline();
      stopProjects();
      delete root.dataset.motion;
    };
  }, [reduced]);

  useEffect(() => {
    if (reduced || !finePointer) return;
    return tiltCards(document.querySelectorAll<HTMLElement>('[data-tilt]'));
  }, [reduced, finePointer]);

  return !reduced && finePointer ? <Cursor /> : null;
}

interface ScrubOptions {
  /** Viewport fractions (of vh, from the top) where the element's top starts / finishes entering. */
  from: number;
  to: number;
  ease: (t: number) => number;
  /** Transform at eased progress e (0 = hidden, 1 = in place). */
  style: (e: number) => string;
  /** The element whose position times the reveal (default: the element itself). */
  anchor?: (el: HTMLElement) => HTMLElement;
  /** Caps the progress (0…1) by scroll position, e.g. to wait for the first scroll. */
  gate?: (scrollY: number, vh: number) => number;
}

/**
 * Rise/fade each element in as its top scrolls through the `from` → `to` window,
 * scrubbed by scroll position (scrolling back reverses it). Positions are layout
 * positions (offsetTop chain), so the element's own transform never feeds back.
 * Fully-in elements carry no inline styles; all inline styles go on cleanup.
 * `revealNow(el)` snaps an element that is still offset into place (so an anchor jump
 * measures its real position) and returns whether it was offset.
 */
function scrubReveal(nodes: HTMLElement[], o: ScrubOptions) {
  const applied = new Map<HTMLElement, number>();
  const set = (el: HTMLElement, e: number) => {
    if (applied.get(el) === e) return;
    applied.set(el, e);
    if (e >= 1) {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.willChange = '';
    } else {
      el.style.opacity = e.toFixed(3);
      el.style.transform = o.style(e);
      el.style.willChange = e > 0 ? 'opacity, transform' : '';
    }
  };
  const stop = onScroll(({ scrollY, vh }) => {
    // Read every position first, then write (no layout thrash).
    const tops = nodes.map((el) => layoutTop(o.anchor ? o.anchor(el) : el));
    nodes.forEach((el, i) => {
      // Hidden elements (display: none) have no layout: leave them in place.
      let p = el.offsetParent ? enterProgress(tops[i]! - scrollY, vh, o.from, o.to) : 1;
      if (o.gate) p = Math.min(p, o.gate(scrollY, vh));
      set(el, Math.round(o.ease(p) * 1000) / 1000);
    });
  });
  return {
    stop: () => {
      stop();
      applied.clear();
      nodes.forEach((el) => {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.willChange = '';
      });
    },
    revealNow: (el: HTMLElement) => {
      const was = applied.get(el);
      if (was === undefined || was >= 1) return false;
      set(el, 1);
      return true;
    },
  };
}

/**
 * Experience timeline: dims the base line, and a lit copy follows the scroll down it 1:1
 * — its leading edge at `timeline.front` × vh, so it meets each sun node as the node
 * finishes entering — then drains the same way back up. The edge fades into the dimmed
 * line over `timeline.fade` px: the clip box is extended by that much below the line and
 * masked out over it, so when fully lit the tail falls past the line's end.
 * Reveal by transforms only: the clip box slides up by the unlit length and its content
 * slides back down by the same amount.
 */
// Last step: the section's closing horizon line draws out from its centre over
// `timeline.closingDraw` px of scroll, starting as soon as the last item has fully entered
// (its sun node's reveal is done), and undraws on the way back up.
function litTimeline(gate: (scrollY: number, vh: number) => number) {
  const base = document.querySelector<HTMLElement>('[data-timeline-base]');
  const clip = document.querySelector<HTMLElement>('[data-timeline-lit]');
  const fill = clip?.firstElementChild as HTMLElement | null | undefined;
  if (!base || !clip || !fill) return () => {};
  const { dim, front, fade, closingDraw } = motion.timeline;
  // The dimmed path fades in with the section's company pill (its last [data-exp-head]).
  const heads = clip.closest('section')?.querySelectorAll<HTMLElement>('[data-exp-head]');
  const pill = heads?.[heads.length - 1];
  const eh = motion.experienceHead;
  const headEase = cubicBezier(motion.reveal.ease);
  let lastBase = -1;
  // The section's closing line: its last step, drawn once the last item is in.
  const closing = clip.closest('section')?.querySelector<HTMLElement>(':scope > [data-horizon]');
  const lastNode = [...(clip.closest('section')?.querySelectorAll<HTMLElement>('[data-sun-node]') ?? [])].at(-1);
  if (closing) closing.style.transformOrigin = 'center';
  let lastDraw = -1;
  const tail = `linear-gradient(180deg, #000 calc(100% - ${fade}px), transparent)`;

  clip.style.marginBottom = `${-fade}px`;
  clip.style.maskImage = tail;
  clip.style.setProperty('-webkit-mask-image', tail);
  fill.style.height = `calc(100% - ${fade}px)`;
  let last = -1;
  const stop = onScroll(({ scrollY, vh }) => {
    const shown = pill ? headEase(Math.min(enterProgress(layoutTop(pill) - scrollY, vh, eh.from, eh.to), gate(scrollY, vh))) : 1;
    const baseO = Math.round(dim * shown * 1000) / 1000;
    if (baseO !== lastBase) {
      lastBase = baseO;
      base.style.opacity = String(baseO);
    }
    const box = clip.offsetHeight; // line + tail
    const line = box - fade;
    // How far down the line the lit edge has travelled (0 → line), then scaled so the
    // tail is fully past the line's end when the edge reaches it.
    const travelled = scrollY + front * vh - layoutTop(clip);
    const edge = Math.min(line, Math.max(0, travelled));
    const lit = line > 0 ? (edge / line) * box : 0;
    if (closing) {
      // Publish where the line finishes drawing (document scrollY), so the next section's
      // sequence can wait for it (useRevealSequence).
      // Starts where the last item finishes entering (its node's reveal ends at sunNodes.to).
      const startAt = lastNode
        ? layoutTop(lastNode) - motion.sunNodes.to * vh
        : layoutTop(clip) + line - front * vh;
      const drawnAt = String(Math.round(startAt + closingDraw));
      if (closing.dataset.drawnAt !== drawnAt) closing.dataset.drawnAt = drawnAt;
      const draw = Math.round(clamp01((scrollY - startAt) / closingDraw) * 1000) / 1000;
      if (draw !== lastDraw) {
        lastDraw = draw;
        closing.style.opacity = draw < 1 ? String(draw) : '';
        closing.style.transform = draw < 1 ? `scaleX(${draw})` : '';
      }
    }
    const hidden = Math.round((box - lit) * 10) / 10;
    if (hidden === last) return;
    last = hidden;
    clip.style.transform = hidden ? `translate3d(0, ${-hidden}px, 0)` : '';
    fill.style.transform = hidden ? `translate3d(0, ${hidden}px, 0)` : '';
  });
  return () => {
    stop();
    base.style.opacity = '';
    for (const el of [clip, fill]) el.style.transform = '';
    clip.style.marginBottom = '';
    clip.style.maskImage = '';
    clip.style.removeProperty('-webkit-mask-image');
    fill.style.height = '';
    if (closing) {
      for (const prop of ['opacity', 'transform', 'transformOrigin'] as const) closing.style[prop] = '';
      delete closing.dataset.drawnAt;
    }
  };
}

/**
 * Featured projects: the head (title + intro) fades and rises in with the usual reveal
 * window, but not before the line closing the section above it (Skills' [data-seq-line])
 * has drawn — it publishes where that happens as `data-drawn-at`. Once the head is in, the
 * cards fade in left to right (opacity only, so the rail's own sideways motion is
 * untouched), then the hint / progress row. All scrubbed by scroll, so it reverses.
 */
function projectsReveal() {
  const section = document.querySelector<HTMLElement>('[data-own-reveal="projects"]');
  const head = section?.querySelector<HTMLElement>('[data-projects-head]');
  if (!section || !head) return () => {};
  const cards = [...section.querySelectorAll<HTMLElement>('[data-projects-card]')];
  const after = [...section.querySelectorAll<HTMLElement>('[data-projects-after]')];
  const r = motion.reveal;
  const c = motion.projects;
  const ease = cubicBezier(r.ease);
  const set = (el: HTMLElement, e: number, rise: boolean) => {
    el.style.opacity = e >= 1 ? '' : e.toFixed(3);
    el.style.transform = rise && e < 1 ? `translate3d(0, ${(r.distance * (1 - e)).toFixed(2)}px, 0)` : '';
  };
  const stop = onScroll(({ scrollY, vh }) => {
    const prevLine = section.previousElementSibling?.querySelector<HTMLElement>('[data-seq-line]');
    const drawnAt = prevLine?.getClientRects().length ? Number(prevLine.dataset.drawnAt) : NaN;
    const headTop = layoutTop(head);
    // Scroll where the head starts / has finished entering.
    let start = headTop - r.from * vh;
    const posEnd = headTop - r.to * vh;
    if (Number.isFinite(drawnAt)) start = Math.max(start, drawnAt);
    const end = Math.max(posEnd, start + c.headSpan);
    const headP = clamp01((scrollY - start) / Math.max(1, end - start));
    set(head, ease(headP), true);
    cards.forEach((el, i) => set(el, ease(clamp01((scrollY - end - i * c.cardStagger) / c.cardSpan)), false));
    const last = end + (cards.length - 1) * c.cardStagger;
    const afterP = ease(clamp01((scrollY - last) / c.cardSpan));
    after.forEach((el) => set(el, afterP, false));
  });
  return () => {
    stop();
    for (const el of [head, ...cards, ...after]) {
      el.style.opacity = '';
      el.style.transform = '';
    }
  };
}

/** Hover tilt toward the cursor + one gloss sweep per hover (fine pointers only). */
function tiltCards(cards: NodeListOf<HTMLElement>): () => void {
  const c = motion.projectCard;
  const offs: (() => void)[] = [];
  cards.forEach((card) => {
    let raf = 0;
    let px = 0.5;
    let py = 0.5;
    const apply = () => {
      raf = 0;
      const ry = (px - 0.5) * 2 * c.maxTiltDeg;
      const rx = -(py - 0.5) * 2 * c.maxTiltDeg;
      card.style.transform = `perspective(${c.perspectivePx}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      card.style.setProperty('--gloss-ms', `${c.glossMs}ms`);
      card.style.transition = 'transform 120ms ease-out';
      card.dataset.hovered = '';
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      delete card.dataset.hovered;
      card.style.transition = `transform ${c.settleMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      card.style.transform = '';
    };
    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
    offs.push(() => {
      if (raf) cancelAnimationFrame(raf);
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
      delete card.dataset.hovered;
      card.style.transform = '';
      card.style.transition = '';
    });
  });
  return () => offs.forEach((fn) => fn());
}
