import type { ReactNode } from 'react';

/**
 * Small pill tag (Onest 600, 13px, 7×13px padding). Variants match their surface.
 * Single-line: a chip that doesn't fit moves to its own row instead of breaking inside the pill.
 */
export type ChipVariant = 'default' | 'bright' | 'onPink' | 'onLilac';

const variantStyle: Record<ChipVariant, { background: string; color: string }> = {
  default: { background: 'var(--chip-fill)', color: 'var(--color-text-2)' },
  bright: { background: 'var(--chip-fill-bright)', color: 'var(--color-cream)' },
  onPink: { background: 'var(--chip-fill-on-pink)', color: 'var(--color-deep)' },
  onLilac: { background: 'var(--chip-fill-on-lilac)', color: 'var(--color-cream)' },
};

export function Chip({ children, variant = 'default' }: { children: ReactNode; variant?: ChipVariant }) {
  return (
    <span
      className="inline-flex rounded-pill px-[13px] py-[7px] font-body text-chip font-semibold leading-tight whitespace-nowrap shadow-chip"
      style={variantStyle[variant]}
    >
      {children}
    </span>
  );
}

/** A wrapped row of chips, rendered as a list for assistive tech. */
export function ChipList({
  items,
  variant,
  className = '',
  label,
}: {
  items: readonly string[];
  variant?: ChipVariant;
  className?: string;
  label?: string;
}) {
  return (
    <ul className={`m-0 flex list-none flex-wrap gap-2 p-0 ${className}`} aria-label={label}>
      {items.map((item) => (
        <li key={item} className="flex">
          <Chip variant={variant}>{item}</Chip>
        </li>
      ))}
    </ul>
  );
}
