import { useMediaQuery } from '@/hooks/useMediaQuery';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The ONE place the app checks reduced motion. Every animated component must
 * read this hook (or the CSS media query in the same breath) and render static.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

/** The same check for event handlers (e.g. navigation transitions). Never call during render. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION_QUERY).matches;
}
