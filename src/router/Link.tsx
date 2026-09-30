import { useCallback, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { navigate, resolveRoute } from './router';
import { navigateWithTransition } from './transition';

/**
 * Internal link that navigates client-side (modifier-clicks fall through to the browser).
 * Links between the Portfolio and the Story play the orb transition (./transition.ts).
 */
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        rest.target === '_blank'
      )
        return;
      event.preventDefault();
      const to = resolveRoute(new URL(href, location.href).pathname);
      const from = resolveRoute(location.pathname);
      if (to && from && to !== from) void navigateWithTransition(href, event.currentTarget);
      else navigate(href);
    },
    [href, onClick, rest.target],
  );
  return <a href={href} onClick={handleClick} {...rest} />;
}
