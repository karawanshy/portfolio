import { readStyles } from '@/test/readStyles';
import { motion } from './config';

/** The Story pill's sheen keyframes (global.css) mirror motion.storySheen. Keep them in sync. */
describe('story-sheen keyframes mirror motion.storySheen', () => {
  const css = readStyles();
  const block = css.slice(css.indexOf('@keyframes story-sheen'), css.indexOf('}\n}', css.indexOf('@keyframes story-sheen')));
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  it('holds off-pill until holdUntil', () => {
    expect(block).toMatch(new RegExp(`0%,\\s*${pct(motion.storySheen.holdUntil)}\\s*{\\s*transform: translateX\\(-120%\\)`));
  });

  it('has swept across by sweepEnd, then holds', () => {
    expect(block).toMatch(new RegExp(`${pct(motion.storySheen.sweepEnd)},\\s*100%\\s*{\\s*transform: translateX\\(260%\\)`));
  });
});
