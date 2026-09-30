import { useEffect, type RefObject } from 'react';
import { motion } from './config';
import { onScroll } from './driver';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Subtle hero parallax on the portrait layer (`[data-parallax="photo"]`: the photo and its
 * glow): translateY = factor × scrollY, clamped to ±maxShift. A pure function of scrollY,
 * so it reverses exactly on the way back up. Factors per layout live in motion.parallax.
 * Off with reduced motion.
 */
export function useHeroParallax(sectionRef: RefObject<HTMLElement | null>, layout: 'wide' | 'phone') {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (reduced || !section) return;
    const cfg = motion.parallax[layout];
    const els = [...section.querySelectorAll<HTMLElement>('[data-parallax="photo"]')];
    let settled = false;

    const stop = onScroll(({ scrollY }) => {
      // Past the hero every layer sits at its clamp; stop writing once there.
      const y = Math.max(0, scrollY);
      const past = y > section.offsetTop + section.offsetHeight;
      if (past && settled) return;
      settled = past;
      const shift = Math.max(-cfg.maxShift, Math.min(cfg.maxShift, cfg.photo * y));
      for (const el of els) el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
    });

    return () => {
      stop();
      for (const el of els) el.style.transform = '';
    };
  }, [reduced, layout, sectionRef]);
}
