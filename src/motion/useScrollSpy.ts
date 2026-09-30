import { useEffect, useState } from 'react';
import { motion } from './config';
import { onScroll } from './driver';

/**
 * Index of the in-page anchor (`#id` hrefs) whose section is current: the one
 * whose top most recently passed `scrollSpy.line` of the viewport. At the very
 * bottom of the page the last-positioned section wins. Not motion, so it runs
 * with reduced motion too.
 */
export function useScrollSpy(hrefs: readonly string[]): number {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ids = hrefs.map((h) => h.replace(/^#/, ''));
    return onScroll(({ scrollY, vh }) => {
      const line = scrollY + vh * motion.scrollSpy.line;
      const atBottom = scrollY + vh >= document.documentElement.scrollHeight - 2;
      let best = 0;
      let bestTop = -Infinity;
      ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + scrollY;
        if ((top <= line || atBottom) && top > bestTop) {
          best = i;
          bestTop = top;
        }
      });
      setActive(best);
    });
  }, [hrefs]);

  return active;
}
