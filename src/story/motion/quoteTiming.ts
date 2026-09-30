// Relative (not @/): the e2e specs import this too.
import { motion } from '../../motion/config';

export interface QuoteTiming {
  /** Pin progress by which the chapter's own timeline has finished (1: it keeps its pacing). */
  artEnd: number;
  /** The single 0→1 art timeline's window in the pin (`pin.play`, ending by `artEnd`). */
  play: readonly [number, number];
  /** The quote's lines land one after another across this window of the pin. */
  lines: readonly [number, number];
}

/**
 * Where a chapter's typographic beat lands in its pin (motion.story.quote), and where its art
 * must be finished by. Chapters without a quote (or a pin) play as before: art over `pin.play`.
 */
export function quoteTiming(sceneId: string, hasQuote: boolean): QuoteTiming {
  const P = motion.story.pin;
  const Q = motion.story.quote;
  const L = P.length[sceneId];
  if (!hasQuote || !L) return { artEnd: 1, play: P.play, lines: [1, 1] };
  const fixed = Q.windows[sceneId];
  if (fixed) return { artEnd: 1, play: P.play, lines: fixed };
  const lines = [1 - (Q.linesVh + Q.holdVh) / L, 1 - Q.holdVh / L] as const;
  const artEnd = lines[0] - Q.gapVh / L;
  return { artEnd, play: [P.play[0], Math.min(P.play[1], artEnd)], lines };
}

/**
 * Where in its pin (progress 0→1) a chapter is finished: its art drawn and its quote landed;
 * what's left is the hold before the pin releases. ch 3 (board) and ch 12 (field) run their
 * own timelines; a chapter the sun rises in (motion.story.sun.anchors, ch 17) waits for it.
 */
export function finishedAt(sceneId: string, motif: string, hasQuote: boolean): number {
  const S = motion.story;
  let t = hasQuote ? quoteTiming(sceneId, true).lines[1] : S.pin.play[1];
  if (motif === 'board') t = S.board.quote1[1];
  if (motif === 'field') t = Math.max(t, S.field.pulse[1]);
  return Math.max(t, S.sun.anchors[sceneId] ?? 0);
}
