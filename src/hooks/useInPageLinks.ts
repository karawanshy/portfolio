import { useEffect } from 'react';
import { hashElement } from '@/router/hash';
import { focusQuietly } from '@/router/router';

/**
 * In-page links (`href="#work"`, the logo's `#top`, the skip link…) scroll to their
 * section without routing: the address stays the page's own (`/`), no `#section` is
 * added and no history entry is created. The landing is the browser's own
 * (`scrollIntoView` honours scroll-padding-top under the fixed bar and each section's
 * scroll-margin, e.g. the pinned sequences' finished state), and focus moves to the
 * target like a real fragment jump. A `#section` already in the address (a shared deep
 * link) is dropped on the first in-page click. Modified clicks (new tab / window) are
 * left to the browser. Runs in the bubble phase, after the capture-phase listeners that
 * prepare the landing (MotionLayer, useRevealSequence) and the menu's own handler.
 */
export function useInPageLinks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      const target = hashElement(link?.getAttribute('href') ?? '');
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView();
      focusQuietly(target);
      if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
