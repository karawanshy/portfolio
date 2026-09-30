import { useEffect, type RefObject } from 'react';
import { sectionIds } from '@/content';
import { motion } from './config';
import { onScroll } from './driver';

const smooth = (edge0: number, edge1: number, x: number) => {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Sky shifts with the scroll: sunset at the top (the static page), late night
 * peaking at Projects, a warm sunrise at Contact. Only overlay opacity changes.
 * This is a color shift, not movement, so it also runs with reduced motion.
 */
export function useTimeOfDay(nightRef: RefObject<HTMLElement | null>, dawnRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const night = nightRef.current;
    const dawn = dawnRef.current;
    if (!night || !dawn) return;
    let lastN = -1;
    let lastD = -1;

    const stop = onScroll(({ scrollY, vh }) => {
      const page = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top + scrollY, bottom: r.bottom + scrollY };
      };
      const work = page(sectionIds.work);
      const projects = page(sectionIds.projects);
      const contact = page(sectionIds.contact);
      if (!work || !projects || !contact) return;

      const center = scrollY + vh / 2;
      const projectsMid = (projects.top + projects.bottom) / 2;
      const maxCenter = document.documentElement.scrollHeight - vh / 2;
      const dawnPeak = Math.min((contact.top + contact.bottom) / 2, maxCenter);

      const n =
        motion.lights.nightMax *
        smooth(work.top, projectsMid, center) *
        (1 - smooth(projects.bottom, dawnPeak, center));
      const d = motion.lights.dawnMax * smooth(projectsMid, dawnPeak, center);

      if (Math.abs(n - lastN) > 0.004) night.style.opacity = (lastN = n).toFixed(3);
      if (Math.abs(d - lastD) > 0.004) dawn.style.opacity = (lastD = d).toFixed(3);
    });

    return () => {
      stop();
      night.style.opacity = '';
      dawn.style.opacity = '';
    };
  }, [nightRef, dawnRef]);
}
