/** Section heading: outlined pink number (decorative) + the section's h2. */
export interface SectionTitleProps {
  number: string;
  title: string;
  id?: string;
  className?: string;
}

export function SectionTitle({ number, title, id, className = '' }: SectionTitleProps) {
  return (
    <div className={`flex items-baseline gap-3 lg:gap-3.5 ${className}`}>
      <span
        aria-hidden="true"
        className="font-display font-extrabold lg:font-bold"
        style={{
          fontSize: 'var(--fs-section-number)',
          color: 'transparent',
          WebkitTextStroke: '1px var(--color-pink)',
        }}
      >
        {number}
      </span>
      <h2 id={id} className="text-h2 font-bold leading-[1.05]" style={{ letterSpacing: 'var(--ls-h2)' }}>
        {title}
      </h2>
    </div>
  );
}
