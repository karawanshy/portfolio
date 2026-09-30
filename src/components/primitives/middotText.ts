const NBSP = ' ';

/**
 * Presentation-only wrapping for "A · B · C" copy: words inside a segment stay together,
 * and a line may only break after a middot, never before one.
 */
export function middotText(text: string): string {
  return text
    .replaceAll(NBSP, ' ')
    .split(' · ')
    .map((segment) => segment.replaceAll(' ', NBSP))
    .join(`${NBSP}· `);
}
