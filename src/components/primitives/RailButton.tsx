/**
 * Round prev/next control for a card rail in its `row` mode (Projects, Skills), in the
 * secondary button style: a real <button>, 44px, `aria-controls` the rail it scrolls.
 * `aria-disabled` (not `disabled`) at the rail's ends: a natively disabled button
 * drops keyboard focus the moment it's reached; this one keeps it and ignores clicks.
 */
export function RailButton({
  label,
  glyph,
  controls,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  /** id of the rail (<ul>) the button scrolls. */
  controls: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={controls}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className="inline-flex size-11 items-center justify-center rounded-pill text-(length:--fs-ui-xl) text-cream shadow-outline-cream transition-[filter,box-shadow,background-color,opacity] duration-200 hover:bg-cream/5 hover:brightness-110 aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-transparent aria-disabled:hover:brightness-100"
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
