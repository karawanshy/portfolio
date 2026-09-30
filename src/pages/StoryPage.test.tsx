import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { contact } from '@/content';
import { chapters, plainText, type Chapter } from '@/story/storyContent';
import { BOARD_PART_COUNT, BOARD_STROKE_COUNT } from '@/story/scenes/boardData';
import StoryPage from './StoryPage';

/** Footer arrows: the visible "Ch 04" leads the accessible name. */
const pad = (c: Chapter) => String(c.number).padStart(2, '0');
const prevName = (c: Chapter) => `Ch ${pad(c)}, Previous chapter: ${c.title}`;
const nextName = (c: Chapter) => `Ch ${pad(c)}, Next chapter: ${c.title}`;
const exploreButtons = () => screen.getAllByRole('button', { name: /explore the story/i });

describe('StoryPage', () => {
  it('has one h1 (the Story title) and one h2 per chapter, in order', () => {
    render(<StoryPage />);
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['How I Got Here']);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
      chapters.slice(1).map((c) => c.title),
    );
  });

  it('renders every chapter as a scene with its id and cinematic lines', () => {
    const { container } = render(<StoryPage />);
    for (const c of chapters) {
      const scene = container.querySelector(`#${c.id}`);
      expect(scene, c.id).not.toBeNull();
      expect(scene).toHaveAttribute('data-scene', c.id);
      expect(scene!.querySelectorAll('[data-line]')).toHaveLength(c.lines.length);
    }
  });

  it('offers "Explore the story" on every chapter and Dive Deeper only on 6, 10, 12, 15', () => {
    render(<StoryPage />);
    expect(exploreButtons()).toHaveLength(chapters.length);
    const dive = screen.getAllByRole('button', { name: /dive into the engineering/i });
    expect(dive.map((b) => b.closest('section')!.id)).toEqual(['chapter-6', 'chapter-10', 'chapter-12', 'chapter-15']);
  });

  it('ends on the contact links (the way back is the header’s ← Portfolio)', () => {
    render(<StoryPage />);
    const ending = document.getElementById('chapter-18')!;
    expect(within(ending).queryByRole('link', { name: /back to the portfolio/i })).toBeNull();
    expect(within(ending).getByRole('link', { name: contact.email.label })).toHaveAttribute('href', contact.email.href);
    for (const s of contact.socials) {
      expect(within(ending).getByRole('link', { name: new RegExp(s.label) })).toHaveAttribute('href', s.href);
    }
  });

  it('keeps decorative art out of the accessibility tree', () => {
    const { container } = render(<StoryPage />);
    expect(container.querySelector('[data-story-stage]')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('[data-story-progress]')).toHaveAttribute('aria-hidden', 'true');
    container.querySelectorAll('[data-scene-visual]').forEach((el) => expect(el).toHaveAttribute('aria-hidden', 'true'));
  });

  it('ch 18’s paper boat lives on the stage’s sea (decorative), hidden until ch 18', () => {
    const { container } = render(<StoryPage />);
    const boat = container.querySelector<HTMLElement>('[data-story-stage] [data-story-boat]')!;
    expect(boat).not.toBeNull();
    expect(boat.style.opacity).toBe('var(--boat-o, 0)');
    expect(container.querySelector('#chapter-18 [data-scene-visual]')).toBeNull();
  });

  it('renders the slice scene art with its motion hooks', () => {
    const { container } = render(<StoryPage />);
    const q = (sel: string) => container.querySelectorAll(sel);
    // ch 3: the real quote from the story, as text, plus the board's code lines.
    const quote = container.querySelector('#chapter-3 [data-scene-part="quote"]')!;
    expect(quote.textContent).toBe(chapters[3]!.scene.quote!.join(''));
    expect(q('#chapter-3 [data-scene-part="board"]')).toHaveLength(2); // landscape + portrait
    for (const board of q('#chapter-3 [data-scene-part="board"]')) {
      expect(board.querySelectorAll('g[data-stroke]')).toHaveLength(BOARD_STROKE_COUNT);
      expect(board.querySelectorAll('g[data-stroke] > path[data-stroke-part][pathLength="1"]')).toHaveLength(BOARD_PART_COUNT);
      expect(board.querySelectorAll('[data-board-chalk]')).toHaveLength(1);
    }
    // ch 4: both branches, the settled line and the 99 (desktop horizontal; in the flow, horizontal + vertical).
    for (const part of ['lead', 'a', 'b', 'settled']) expect(q(`#chapter-4 [data-waver="${part}"]`).length).toBe(3);
    expect(q('#chapter-4 [data-scene-part="figure"]')[0]!.textContent).toBe('99');
    // ch 5: CPU parts in assembly order.
    const order = [...q('#chapter-5 [data-cpu-part]')].map((g) => Number(g.getAttribute('data-cpu-order')));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // ch 5: structure + components with entry data; ch 6: two boards, thread, hub, pulses.
    expect(q('#chapter-5 [data-cpu-structure]')).toHaveLength(1);
    expect(q('#chapter-5 g[data-cpu-part][data-cpu-dx]')).toHaveLength(5);
    expect(q('#chapter-5 path[data-cpu-bus][pathLength="1"]').length).toBeGreaterThan(3);
    expect(q('#chapter-6 svg[data-scene-part="chess"]')).toHaveLength(3); // desktop + mirrored (portrait phones) + stacked (tablets)
    expect(q('#chapter-6 g[data-chess-board]')).toHaveLength(6);
    expect(q('#chapter-6 path[data-chess-thread][pathLength="1"]')).toHaveLength(3);
    expect(q('#chapter-6 [data-chess-pulse]')).toHaveLength(12);
    // ch 10: six days — five build layers and the test rail.
    expect(q('#chapter-10 g[data-day][data-day-dy]')).toHaveLength(6);
    // No day numbers in the art.
    expect(q('#chapter-10 [data-day-tile], #chapter-10 text')).toHaveLength(0);
    expect(q('#chapter-10 [data-day-check]')).toHaveLength(5);
    // ch 12: one path per dot state (not one node per dot) and the CI line.
    expect(q('#chapter-12 [data-dots]')).toHaveLength(3);
    expect(q('#chapter-12 circle')).toHaveLength(0);
    expect(q('#chapter-12 [data-ci-line]')).toHaveLength(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(<StoryPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('story panel dialog', () => {
  it('opens as a labelled modal, traps focus, closes on Escape and returns focus', async () => {
    const user = userEvent.setup();
    const { container } = render(<StoryPage />);
    const trigger = exploreButtons()[3]!; // chapter 3
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: chapters[3]!.title });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
    expect(within(dialog).getByText(/Why are we writing English on a board\?/i, { selector: 'span' })).toBeInTheDocument();
    // The page behind is inert.
    expect(container.querySelector('main')!.closest('[inert]')).not.toBeNull();
    expect(await axe(dialog)).toHaveNoViolations();

    // Journal page: chapter + act in the header, the title in the body, ch 3's question as the quote block.
    expect(within(dialog).getByText('Chapter 03')).toBeInTheDocument();
    expect(within(dialog).getByText('Act II · Discovering CS')).toBeInTheDocument();
    expect(dialog.querySelector('[data-panel-scroll] h2')).toHaveTextContent(chapters[3]!.title);
    expect(dialog.querySelector('[data-journal-quote]')!.textContent).toBe(chapters[3]!.scene.quote!.join(' '));

    // Tab stays inside: close, the scrollable body (a labelled region), previous, next, then back to close.
    await user.tab();
    expect(within(dialog).getByRole('button', { name: /close/i })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('region', { name: chapters[3]!.title })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: prevName(chapters[2]!) })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: nextName(chapters[4]!) })).toHaveFocus();
    expect(document.activeElement).toHaveAccessibleName('Ch 04, Next chapter: Maybe This Wasn’t for Me');
    await user.tab();
    expect(within(dialog).getByRole('button', { name: /close/i })).toHaveFocus();
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
    expect(container.querySelector('[inert]')).toBeNull();
  });

  it('has a Dive Deeper tab on chapters with engineering depth', async () => {
    const user = userEvent.setup();
    render(<StoryPage />);
    const dive = screen.getAllByRole('button', { name: /dive into the engineering/i })[0]!; // chapter 6
    await user.click(dive);
    const dialog = screen.getByRole('dialog', { name: chapters[6]!.title });
    const tabs = within(dialog).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['The story', 'Dive into the engineering']);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    const panel = within(dialog).getByRole('tabpanel');
    expect(within(panel).getByRole('heading', { level: 3, name: 'Context' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /ChessGame on GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/karawanshy/ChessGame',
    );
    expect(await axe(dialog)).toHaveNoViolations();

    tabs[1]!.focus();
    await user.keyboard('{ArrowLeft}');
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    await user.click(within(dialog).getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dive).toHaveFocus();
  });

  it('steps to the previous / next chapter from the footer, hiding the arrow at either end', async () => {
    const user = userEvent.setup();
    render(<StoryPage />);
    const trigger = exploreButtons()[1]!; // chapter 1
    await user.click(trigger);
    let dialog = screen.getByRole('dialog', { name: chapters[1]!.title });

    await user.click(within(dialog).getByRole('button', { name: prevName(chapters[0]!) }));
    dialog = screen.getByRole('dialog', { name: chapters[0]!.title });
    expect(within(dialog).getByText('Prologue', { selector: '.label' })).toBeInTheDocument();
    // First chapter: no previous arrow; the pressed one is gone, so focus moves to the next arrow.
    expect(within(dialog).queryByRole('button', { name: /previous chapter/i })).toBeNull();
    const next = within(dialog).getByRole('button', { name: nextName(chapters[1]!) });
    expect(next).toHaveFocus();
    expect(next).toHaveTextContent('Ch 01');
    expect(await axe(dialog)).toHaveNoViolations();

    // Next keeps focus on the pressed arrow.
    await user.click(next);
    await user.click(within(dialog).getByRole('button', { name: /next chapter/i }));
    expect(screen.getByRole('dialog', { name: chapters[2]!.title })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: nextName(chapters[3]!) })).toHaveFocus();

    // Closing still returns focus to the original opener.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('keeps the Dive Deeper tab across chapters that have one, and ends at the last chapter', async () => {
    const user = userEvent.setup();
    render(<StoryPage />);
    const last = chapters[chapters.length - 1]!;
    await user.click(exploreButtons()[chapters.length - 2]!);
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: nextName(last) }));
    expect(dialog).toHaveAccessibleName(last.title);
    expect(within(dialog).queryByRole('button', { name: /next chapter/i })).toBeNull();
    // Last chapter: focus moves to the remaining previous arrow.
    expect(within(dialog).getByRole('button', { name: prevName(chapters[chapters.length - 2]!) })).toHaveFocus();
    await user.keyboard('{Escape}');

    // ch 10 (dive) → ch 11 (no dive: the story).
    await user.click(screen.getAllByRole('button', { name: /dive into the engineering/i })[1]!); // chapter 10
    const d = screen.getByRole('dialog', { name: chapters[10]!.title });
    expect(within(d).getByRole('tab', { name: /dive into the engineering/i })).toHaveAttribute('aria-selected', 'true');
    await user.click(within(d).getByRole('button', { name: /next chapter/i }));
    expect(within(d).queryByRole('tab')).toBeNull();
    expect(d).toHaveAccessibleName(chapters[11]!.title);
    expect(d.querySelector('[data-panel-scroll] p')).toHaveTextContent(plainText(chapters[11]!.story[0]!));
    // Back to ch 10, which has a dive: the tab carried over is 'story'.
    await user.click(within(d).getByRole('button', { name: /previous chapter/i }));
    expect(within(d).getByRole('tab', { name: 'The story' })).toHaveAttribute('aria-selected', 'true');
  });

  it('chapter index lists all chapters as links to #chapter-N', async () => {
    const user = userEvent.setup();
    render(<StoryPage />);
    const trigger = screen.getByRole('button', { name: /chapters/i });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Chapters' });
    const links = within(dialog).getAllByRole('link').filter((a) => a.getAttribute('href')!.startsWith('#chapter-'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(chapters.map((c) => `#${c.id}`));
    expect(await axe(dialog)).toHaveNoViolations();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });
});
