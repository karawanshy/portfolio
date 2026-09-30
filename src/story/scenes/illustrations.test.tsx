import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SceneVisual } from '../SceneVisual';
import { chapters, plainText } from '../storyContent';
import { DOOR } from './illusData';

const ILLUSTRATED = [1, 2, 7, 8, 9, 11, 13, 14, 15, 16, 17];
describe('chapter illustrations', () => {
  it('every chapter has real art; no outlined-number placeholders remain', () => {
    for (const n of ILLUSTRATED) {
      const { container, unmount } = render(<SceneVisual chapter={chapters[n]!} />);
      const art = container.querySelector('[data-scene-visual]')!;
      expect(art, `chapter ${n}`).not.toBeNull();
      expect(art).toHaveAttribute('aria-hidden', 'true');
      expect(art.querySelector('[data-illus]'), `chapter ${n}`).not.toBeNull();
      expect(container.querySelector('[data-scene-visual="numeral"]')).toBeNull();
      unmount();
    }
    expect(JSON.stringify(chapters.map((c) => c.scene.motif))).not.toContain('numeral');
  });

  it('ch 8: four kids and their teacher at a worktable with their builds (no numbers, no labels), the ch 3 board faint behind', () => {
    const { container } = render(<SceneVisual chapter={chapters[8]!} />);
    const art = container.querySelector('[data-illus="workbench"]')!;
    expect(art.querySelectorAll('[data-kid]')).toHaveLength(4);
    expect(art.querySelectorAll('[data-kid-legs]')).toHaveLength(4);
    expect(art.querySelectorAll('[data-teacher]')).toHaveLength(1);
    expect(art.querySelectorAll('[data-ch8-piece]')).toHaveLength(4);
    expect(art.querySelectorAll('path[data-ch8-wire][pathLength="1"]')).toHaveLength(2);
    ['[data-ch8-robot-eyes]', '[data-ch8-arduino]', '[data-ch8-led]', '[data-ch8-outline]', '[data-ch8-shape]', '[data-ch8-board]'].forEach((sel) =>
      expect(art.querySelector(sel), sel).not.toBeNull(),
    );
    expect(art.querySelectorAll('text')).toHaveLength(0);
    expect(Number(art.querySelector('[data-ch8-board]')!.getAttribute('opacity'))).toBeLessThan(0.6);
  });

  it('ch 9: a crowd of silhouettes, a few of them lit; no door, no dots, no numbers', () => {
    const { container } = render(<SceneVisual chapter={chapters[9]!} />);
    const art = container.querySelector('[data-illus="crowd"]')!;
    expect(art.querySelectorAll('[data-crowd-row]')).toHaveLength(4);
    expect(art.querySelectorAll('g[data-crowd-pick]')).toHaveLength(3);
    expect(art.querySelectorAll('path[data-pick-part="lit"]')).toHaveLength(3);
    // Each lit person is one of the silhouettes, in place.
    art.querySelectorAll('path[data-pick-part="lit"]').forEach((lit) => {
      const rows = [...art.querySelectorAll('[data-crowd-row]')].map((r) => r.getAttribute('d')!);
      expect(rows.some((d) => d.includes(lit.getAttribute('d')!))).toBe(true);
    });
    expect(art.querySelector('[data-door]')).toBeNull();
    expect(art.querySelectorAll('text')).toHaveLength(0);
    expect([...art.querySelectorAll('path')].some((p) => /h0/.test(p.getAttribute('d') ?? ''))).toBe(false);
  });

  it('text inside art is a real fact from the chapter (ch 11: the start date)', () => {
    const ch11 = chapters[11]!;
    expect(ch11.story.map(plainText).join(' ')).toContain(ch11.scene.figure!);
    const { container } = render(<SceneVisual chapter={ch11} />);
    expect(container.querySelector('[data-date]')!.textContent).toBe('July 2025');
  });

  it('ch 11 is an occupied building (sign on) that ch 13 loses (sign off, rooms dark)', () => {
    const scene = (n: number) => render(<SceneVisual chapter={chapters[n]!} />).container;
    const ch11 = scene(11);
    const ch13 = scene(13);
    const lit = (c: Element) => c.querySelectorAll('[data-window-state="soft"], [data-window-state="kept"]').length;
    expect(ch11.querySelector('[data-sign-state]')).toHaveAttribute('data-sign-state', 'on');
    expect(ch13.querySelector('[data-sign-state]')).toHaveAttribute('data-sign-state', 'off');
    expect(lit(ch11)).toBeGreaterThan(4);
    expect(lit(ch13)).toBe(1); // only her window
    expect(ch13.querySelectorAll('[data-window-state="kept"]')).toHaveLength(1);
  });

  it('recurring objects rhyme: the same cased door in ch 7 and 17, the same kept window in ch 11 and 13', () => {
    const frame = (n: number) => {
      const { container, unmount } = render(<SceneVisual chapter={chapters[n]!} />);
      // The first door on the page (ch 7 draws one per layout: desktop, then phone).
      const el = container.querySelector('[data-door-part="frame"]')!;
      const rect = el.querySelector('rect')!;
      const out = {
        size: [rect.getAttribute('width'), rect.getAttribute('height')],
        // Identical markup, apart from each instance's own gradient ids.
        markup: el.outerHTML.replace(/url\(#[^)]+\)/g, 'url()'),
      };
      unmount();
      return out;
    };
    // Ch 17's doorway is cased with the very same frame (the door drawn into the wall).
    expect(frame(17)).toEqual(frame(7));
    expect(frame(7).size).toEqual([String(DOOR.w + 2 * DOOR.frame), String(DOOR.h + DOOR.frame)]);
    const ch17 = render(<SceneVisual chapter={chapters[17]!} />).container;
    expect(ch17.querySelector('[data-doorway="door"] [data-door="open"] [data-door-part="panel"]')).not.toBeNull();
    const kept = (n: number) => {
      const { container, unmount } = render(<SceneVisual chapter={chapters[n]!} />);
      const id = container.querySelector('[data-window-state="kept"]')?.getAttribute('data-window');
      unmount();
      return id;
    };
    expect(kept(11)).toBe(kept(13));
  });

  it('ch 11 and 13 are the same building: the same windows in the same places', () => {
    const windows = (n: number) => {
      const { container, unmount } = render(<SceneVisual chapter={chapters[n]!} />);
      const out = [...container.querySelectorAll('[data-window]')].map((w) => ['data-window', 'x', 'y', 'width', 'height'].map((a) => w.getAttribute(a)).join(' '));
      unmount();
      return out;
    };
    expect(windows(11)).toHaveLength(18);
    expect(windows(11)).toEqual(windows(13));
  });
});
