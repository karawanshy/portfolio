import { useId, type CSSProperties } from 'react';

/**
 * The setting-sun mark ◒ — the site's signature. Always decorative (aria-hidden).
 *
 * - `variant="mark"` (default): 40×40 viewBox, tangerine→pink vertical gradient
 *   half-sun with two short pink lines beneath. Size it in `em` to sit inline
 *   after text (logo 0.5em, hero name 0.3em, closing headline 0.4em, footer 0.6em).
 * - `variant="node"`: 44×31 viewBox, a solid half-sun + one line in `color`.
 *   Used for timeline nodes (32×22 desktop, 30×21 mobile) and skill bullets (22×15).
 */
export interface SunMarkProps {
  variant?: 'mark' | 'node';
  /** CSS width; height follows the viewBox ratio. Default: 0.3em (mark) / 32px (node). */
  size?: string | number;
  /** Fill color for `node` (defaults to pink). Ignored for `mark` unless `fill="solid"`. */
  color?: string;
  /** `mark` only: gradient (default) or a solid `color`. */
  fill?: 'gradient' | 'solid';
  /** Adds a soft drop-shadow glow in the mark's color. */
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function SunMark({
  variant = 'mark',
  size,
  color = 'var(--color-pink)',
  fill = 'gradient',
  glow = false,
  className,
  style,
}: SunMarkProps) {
  const id = useId();
  const gradientId = `sun-${id}`;
  const isNode = variant === 'node';
  const width = size ?? (isNode ? 32 : '0.3em');
  const glowFilter = glow ? `drop-shadow(0 0 10px ${color})` : undefined;

  const svgStyle: CSSProperties = {
    width,
    height: 'auto',
    aspectRatio: isNode ? '44 / 31' : '1 / 1',
    display: 'inline-block',
    verticalAlign: 'baseline',
    overflow: 'visible',
    filter: glowFilter,
    ...style,
  };

  if (isNode) {
    return (
      <svg viewBox="0 0 44 31" aria-hidden="true" focusable="false" className={className} style={svgStyle}>
        <path d="M4 26 A18 18 0 0 1 40 26 Z" fill={color} />
        <rect x="0" y="27.5" width="44" height="3" rx="1.5" fill={color} opacity="0.5" />
      </svg>
    );
  }

  const bodyFill = fill === 'solid' ? color : `url(#${gradientId})`;
  const lineColor = fill === 'solid' ? color : 'var(--color-pink)';
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ marginLeft: '0.06em', ...svgStyle }}
    >
      {fill === 'gradient' && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-tangerine)" />
            <stop offset="1" stopColor="var(--color-pink)" />
          </linearGradient>
        </defs>
      )}
      <path d="M2 26 A18 18 0 0 1 38 26 Z" fill={bodyFill} />
      <rect x="2" y="30" width="36" height="3" rx="1.5" fill={lineColor} opacity="0.7" />
      <rect x="8" y="35" width="24" height="3" rx="1.5" fill={lineColor} opacity="0.4" />
    </svg>
  );
}
