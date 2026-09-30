import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { chapters, plainText } from './storyContent';
import { JournalParagraphs } from './StoryText';

const renderJournal = (n: number) => {
  const c = chapters[n]!;
  return render(<JournalParagraphs story={c.story} quote={c.scene.quote} />).container;
};

describe('JournalParagraphs', () => {
  it('sets a paragraph that is one bold run as a centred beat (ch 13)', () => {
    const beats = renderJournal(13).querySelectorAll('[data-journal-beat]');
    expect(beats).toHaveLength(1);
    expect(beats[0]!.textContent).toBe('I was the only intern retained.');
  });

  it('sets the paragraph that repeats the scene quote like the scene quote, line by line (ch 3, 4, 5)', () => {
    for (const n of [3, 4, 5]) {
      const c = chapters[n]!;
      const quote = renderJournal(n).querySelector('[data-journal-quote]');
      expect(quote, `ch ${n}`).not.toBeNull();
      const lines = [...quote!.querySelectorAll('span')];
      expect(lines.map((s) => s.textContent)).toEqual(c.scene.quote);
      // No box; the last line in the accent gradient, like the scene's.
      expect(lines.at(-1)!.className).toContain('journal-quote-accent');
    }
  });

  it('keeps every paragraph, in order, with its words (a quote keeps its quotation marks)', () => {
    const words = (s: string) => s.replace(/[“”"]/g, '');
    for (const c of chapters) {
      const ps = [...render(<JournalParagraphs story={c.story} quote={c.scene.quote} />).container.querySelectorAll('p, blockquote')];
      expect(ps.map((p) => words(p.textContent!)), c.id).toEqual(c.story.map((p) => words(plainText(p))));
    }
  });
});
