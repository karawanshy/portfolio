import type { CSSProperties, ReactNode } from 'react';
import { motion } from '@/motion/config';
import { Link } from '@/router/Link';

/**
 * The lilac Story pill (lilac is reserved for Story links): orb, label, arrow on a static
 * glow (a sibling layer, since the pill clips its contents), with one glass reflection
 * sweeping across it now and then (CSS `story-sheen`, transform only; timing in
 * motion.storySheen; off with reduced motion). Styles: portfolio/topbar.css `.story-pill`.
 * `back` mirrors it for the way back ("← label ●"): the Story header's Portfolio link. The Story
 * has no custom cursor, so on hover the back pill gets its own copy of the cursor's glowing ring.
 * Portrait phones: a slimmer 36px pill in a 44px target (an invisible ::before).
 * `pillClassName` adds to the pill itself (e.g. a shallower height on short screens).
 * `storyOrigin` tags a Portfolio → Story link (`data-story-origin`): the orb transition grows
 * from its orb (`data-story-orb`) and closes back onto it on the way back (router/transition.ts).
 */
export function StoryPill({
  href,
  children,
  back = false,
  ariaLabel,
  className = '',
  pillClassName = '',
  storyOrigin,
}: {
  href: string;
  children: ReactNode;
  back?: boolean;
  ariaLabel?: string;
  className?: string;
  pillClassName?: string;
  storyOrigin?: 'topbar';
}) {
  const orb = (
    <span
      aria-hidden="true"
      data-story-orb={back ? undefined : ''}
      className="story-pill-orb relative size-7 shrink-0 rounded-full max-md:portrait:size-6"
    />
  );
  const arrow = (
    <span aria-hidden="true" className="relative">
      {back ? '←' : '→'}
    </span>
  );
  return (
    <span className={`story-pill-wrap relative inline-flex ${className}`}>
      <Link
        href={href}
        aria-label={ariaLabel}
        data-story-origin={storyOrigin}
        // Portrait phones: a slimmer 36px pill; its 44px target is an invisible ::before, 4px above
        // and below (the pill itself doesn't clip: the sheen has its own clipping layer).
        className={`story-pill relative inline-flex h-[46px] items-center gap-3 rounded-pill font-body text-(length:--fs-ui-base) leading-none font-bold text-story-ink no-underline sm:h-[52px] max-md:portrait:h-9 max-md:portrait:gap-2.5 max-md:portrait:text-(length:--fs-ui-md) max-md:portrait:before:absolute max-md:portrait:before:inset-x-0 max-md:portrait:before:-inset-y-1 max-md:portrait:before:content-[''] ${back ? 'pr-3 pl-[22px] max-md:portrait:pr-1.5 max-md:portrait:pl-4' : 'pr-[22px] pl-3 max-md:portrait:pr-4 max-md:portrait:pl-1.5'} ${pillClassName}`}
        style={{ '--story-sheen-cycle': `${motion.storySheen.cycleS}s` } as CSSProperties}
      >
        <span aria-hidden="true" className="story-pill-clip">
          <span className="story-pill-sheen" />
        </span>
        {back ? arrow : orb}
        <span className="relative whitespace-nowrap">{children}</span>
        {back ? orb : arrow}
      </Link>
      <span aria-hidden="true" className="story-pill-glow" />
      {back && <span aria-hidden="true" className="story-pill-ring" />}
    </span>
  );
}
