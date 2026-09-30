import type { RichText } from '@/content';
import { TONE_CLASS } from './toneClass';

/** Default emphasis: bold + cream (the About paragraph's treatment). */
export const RICH_EM = 'font-semibold text-cream';

/**
 * Renders RichText: plain strings as text, `{ em }` runs in <b>, `{ em, tone }` runs in
 * <strong> with their tone's color, `{ stat }` runs as a highlighted figure (.stat-figure).
 * `emClassName` overrides the untoned emphasis look where cream can't read (e.g. on the pink sunset card).
 */
export function Rich({ text, emClassName = RICH_EM }: { text: RichText; emClassName?: string }) {
  return text.map((part, i) =>
    typeof part === 'string' ? (
      part
    ) : 'stat' in part ? (
      <strong key={i} className="stat-figure">
        {part.stat}
      </strong>
    ) : part.tone ? (
      <strong key={i} className={TONE_CLASS[part.tone]}>
        {part.em}
      </strong>
    ) : (
      <b key={i} className={emClassName}>
        {part.em}
      </b>
    ),
  );
}
