import { readStyles } from '@/test/readStyles';
import { motion } from './config';

/**
 * The pinned Skills sequence reserves their pin in CSS before hydration
 * (src/styles, "Reveal sequences"), so it mirrors motion.sequence values. Keep them in sync.
 */
describe('reveal-sequence CSS mirrors motion.sequence', () => {
  const css = readStyles();
  const block = css.slice(css.indexOf('[data-seq] {'));

  it('uses the same per-box scroll', () => {
    expect(Number(block.match(/--seq-per-box:\s*([\d.]+)px;/)?.[1])).toBe(motion.sequence.perBox);
  });

  it('uses the same end hold', () => {
    expect(Number(block.match(/--seq-end-hold:\s*([\d.]+)px;/)?.[1])).toBe(motion.sequence.endHold);
  });

  it('uses the same fit margin', () => {
    expect(Number(block.match(/--seq-fit-margin:\s*([\d.]+)px;/)?.[1])).toBe(motion.sequence.fitMargin);
  });

  it('pre-pins from the same minimum width', () => {
    expect(block).toContain(`@media (min-width: ${motion.sequence.pinMinWidth}px) and (prefers-reduced-motion: no-preference)`);
  });
});
