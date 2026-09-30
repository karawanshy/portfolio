import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { Link } from '@/router/Link';

/**
 * Pill buttons/links. All variants are ≥44px tall.
 * - primary: pink→tangerine fill, deep text, pink glow
 * - secondary: transparent, cream text, cream hairline
 * - story: lilac outline + tint + glowing dot (dot hidden on phones, per the mobile artboard) — reserved for Story links
 * - lilacOutline: lilac hairline, cream text (on the lilac project card)
 * - deepOutline: deep hairline, deep text, card shows through (on the sunset project card)
 * - cream: cream fill, deep text, tangerine glow (contact email)
 */
export type ButtonVariant = 'primary' | 'secondary' | 'story' | 'lilacOutline' | 'deepOutline' | 'cream';

const base =
  'inline-flex min-h-11 items-center justify-center gap-2.5 rounded-pill font-body leading-tight no-underline transition-[filter,box-shadow,background-color] duration-200 hover:brightness-110';

const variants: Record<ButtonVariant, { className: string; style: CSSProperties }> = {
  primary: {
    className: 'px-6 py-[15px] text-(length:--fs-ui-base) font-bold text-deep shadow-glow-pink',
    style: { background: 'var(--gradient-main)' },
  },
  secondary: {
    className: 'px-[22px] py-[14px] text-(length:--fs-ui-base) font-semibold text-cream shadow-outline-cream hover:bg-cream/5',
    style: {},
  },
  story: {
    className: 'px-4 py-3 text-(length:--fs-ui-md) font-bold text-cream shadow-outline-lilac sm:px-[18px]',
    style: { background: 'var(--story-fill)' },
  },
  lilacOutline: {
    className: 'px-[22px] py-[13px] text-(length:--fs-ui-base) font-bold text-cream shadow-outline-lilac hover:bg-lilac/10',
    style: {},
  },
  deepOutline: {
    className: 'px-[22px] py-[13px] text-(length:--fs-ui-base) font-bold text-deep shadow-outline-deep hover:bg-deep/10 focus-visible:outline-deep',
    style: {},
  },
  cream: {
    className: 'px-6 py-[15px] text-(length:--fs-ui-base) font-bold text-deep bg-cream shadow-glow-tangerine',
    style: {},
  },
};

export interface ButtonProps {
  variant?: ButtonVariant;
  children: ReactNode;
  /** Renders a link when set; otherwise a <button>. */
  href?: string;
  /** Opens in a new tab with rel="noopener noreferrer" and an sr-only hint. */
  external?: boolean;
  download?: boolean;
  /** Trailing glyph, decorative. */
  trailing?: '→' | '↗';
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
  'aria-label'?: string;
  /** <button> only: for a control that opens a dialog / disclosure. */
  'aria-haspopup'?: 'dialog';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}

export function Button({
  variant = 'primary',
  children,
  href,
  external = false,
  download = false,
  trailing,
  onClick,
  className = '',
  'aria-label': ariaLabel,
  'aria-haspopup': ariaHasPopup,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
}: ButtonProps) {
  const v = variants[variant];
  const cls = `${base} ${v.className} ${className}`;
  const content = (
    <>
      {variant === 'story' && (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-lilac max-sm:hidden"
          style={{ boxShadow: '0 0 12px var(--color-lilac)' }}
        />
      )}
      {/* One text run, so sr-only hints and the inline ↗ add no flex gaps. */}
      <span>
        {children}
        {trailing === '↗' && <span aria-hidden="true"> ↗</span>}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </span>
      {trailing === '→' && <span aria-hidden="true">→</span>}
    </>
  );

  if (!href) {
    return (
      <button
        type="button"
        className={cls}
        style={v.style}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-haspopup={ariaHasPopup}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
      >
        {content}
      </button>
    );
  }

  const isInternalRoute = href.startsWith('/') && !download && !/\.[a-z0-9]+$/i.test(href);
  if (isInternalRoute && !external) {
    return (
      <Link href={href} className={cls} style={v.style} onClick={onClick} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={cls}
      style={v.style}
      onClick={onClick}
      aria-label={ariaLabel}
      download={download || undefined}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {content}
    </a>
  );
}
