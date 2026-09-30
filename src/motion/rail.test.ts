import { readStyles } from '@/test/readStyles';
import { motion } from './config';

/**
 * The pinned rail's height is reserved in CSS before hydration (src/styles, "Pinned
 * project rail"), so it mirrors two motion.rail values. Keep them in sync.
 */
describe('pinned rail CSS mirrors motion.rail', () => {
  const css = readStyles();
  const defaults = css.slice(css.indexOf('[data-rail-mode] {'));

  it('uses the same scroll-per-px for the slide', () => {
    const m = defaults.match(/--rail-slide:\s*calc\(.*\*\s*([\d.]+)\);/);
    expect(Number(m?.[1])).toBe(motion.rail.scrollPerPx);
  });

  it('uses the same end hold', () => {
    const m = defaults.match(/--rail-end-hold:\s*([\d.]+)px;/);
    expect(Number(m?.[1])).toBe(motion.rail.endHold);
  });
});

/** The Skills rail pin is reserved in CSS the same way (src/styles, "Skills rail pin"). */
describe('Skills rail pin CSS mirrors motion.skillsRail', () => {
  const css = readStyles();
  const block = css.slice(css.indexOf('[data-skills-mode] {'));
  const r = motion.skillsRail;

  it('uses the same scroll-per-px for the slide', () => {
    const m = block.match(/--rail-slide:\s*calc\(.*\*\s*([\d.]+)\);/);
    expect(Number(m?.[1])).toBe(r.scrollPerPx);
  });

  it('uses the same end hold', () => {
    expect(Number(block.match(/--rail-end-hold:\s*([\d.]+)px;/)?.[1])).toBe(r.endHold);
  });

  it('pre-pins exactly between the rail pin width and the sequence pin width, with the same fit margin', () => {
    const max = motion.sequence.pinMinWidth - 0.02;
    expect(block).toContain(
      `@media (min-width: ${r.pinMinWidth}px) and (max-width: ${max}px) and (prefers-reduced-motion: no-preference)`,
    );
    expect(block).toMatch(new RegExp(`100vh - var\\(--pin-top-inset\\) - ${r.fitMargin}px - var\\(--rail-stage-h`));
  });
});
