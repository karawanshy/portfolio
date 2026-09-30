/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { acts, actsWithChapters, chapters, plainText, skyKeyframes } from './storyContent';

describe('storyContent', () => {
  it('has chapters 0–18 in order with stable ids', () => {
    expect(chapters.map((c) => c.number)).toEqual(Array.from({ length: 19 }, (_, i) => i));
    for (const c of chapters) expect(c.id).toBe(`chapter-${c.number}`);
  });

  it('puts every chapter in exactly one act, acts in order', () => {
    expect(acts.map((a) => a.id)).toEqual(['prologue', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii']);
    const grouped = actsWithChapters.map(({ chapters: cs }) => cs.map((c) => c.number));
    expect(grouped).toEqual([[0], [1, 2], [3, 4, 5], [6], [7, 8, 9], [10, 11, 12], [13, 14, 15, 16], [17, 18]]);
  });

  it('has a sky keyframe for every act and scene, referenced as tokens', () => {
    for (const a of acts) expect(skyKeyframes.some((k) => k.id === a.sky)).toBe(true);
    for (const c of chapters) expect(skyKeyframes.some((k) => k.id === c.scene.sky), c.id).toBe(true);
    for (const k of skyKeyframes) expect(k.tokens.gradient).toBe(`var(--sky-${k.id})`);
  });

  it('has Dive Deeper only on chapters 6, 10, 12 and 15', () => {
    expect(chapters.filter((c) => c.dive).map((c) => c.number)).toEqual([6, 10, 12, 15]);
  });

  it('cools Act II within the act: warm → cooling → lilac', () => {
    expect([3, 4, 5].map((n) => chapters[n]!.scene.sky)).toEqual(['warm', 'cooling', 'lilac']);
    const order = skyKeyframes.map((k) => k.id);
    for (const c of chapters.slice(1)) {
      // Sky keyframes are listed in story order, so the stage can stack layers by index.
      expect(order.indexOf(c.scene.sky)).toBeGreaterThanOrEqual(order.indexOf(chapters[c.number - 1]!.scene.sky));
    }
  });

  it('marks 3, 6, 12 and 17 as the cinematic pinned candidates', () => {
    expect(chapters.filter((c) => c.scene.pinned).map((c) => c.number)).toEqual([3, 6, 12, 17]);
  });

  it('never uses the invented chapter 17 logo line', () => {
    expect(JSON.stringify(chapters)).not.toMatch(/line in the logo/i);
  });

  it('keeps chapter 3’s question in its story and as the board’s two-line quote', () => {
    const ch3 = chapters[3]!;
    expect(ch3.scene.quote).toHaveLength(2);
    expect(ch3.story.map(plainText)).toContain(ch3.scene.quote!.join(' '));
  });

  it('has no empty copy', () => {
    for (const c of chapters) {
      for (const t of [...c.lines, ...c.story]) expect(plainText(t).trim(), c.id).not.toBe('');
      for (const d of c.dive?.sections ?? []) expect(d.body.trim(), `${c.id} ${d.heading}`).not.toBe('');
    }
  });
});
