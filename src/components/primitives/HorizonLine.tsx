import type { HTMLAttributes } from 'react';

/**
 * Thin 2px gradient line that fades at both ends; closes each major section (md+; the phone
 * artboard omits them). `data-horizon` lets the pinned Skills sequence find the line
 * above it (useRevealSequence); extra data-* props pass through.
 */
export type HorizonVariant = 'tangerine-pink' | 'pink-lilac' | 'lilac-tangerine';

export function HorizonLine({
  variant = 'tangerine-pink',
  className = '',
  ...rest
}: { variant?: HorizonVariant; className?: string } & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'>) {
  return (
    <div
      aria-hidden="true"
      data-horizon
      {...rest}
      className={`h-0.5 w-full rounded-[2px] max-md:hidden ${className}`}
      style={{ background: `var(--horizon-${variant})` }}
    />
  );
}
