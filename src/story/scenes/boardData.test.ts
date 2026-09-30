import { describe, expect, it } from 'vitest';
import { BOARD_FRAGMENT_COUNT, BOARD_PART_COUNT, BOARD_STROKE_COUNT, boardChalkRest, boardStrokeWeights, boardStrokes, landscape, portrait } from './boardData';

describe('ch 3 board handwriting', () => {
  it('splits every stroke into continuous pen movements (one M per part)', () => {
    for (const id of ['landscape', 'portrait'] as const) {
      const parts = boardStrokes[id].flatMap((s) => s.parts);
      expect(parts).toHaveLength(BOARD_PART_COUNT);
      for (const p of parts) expect(p.d.match(/M/g)).toHaveLength(1);
      for (const s of boardStrokes[id]) {
        expect(s.length).toBeCloseTo(s.parts.reduce((n, p) => n + p.length, 0), 6);
        expect(s.start).toEqual(s.parts[0]!.start);
        expect(s.end).toEqual(s.parts.at(-1)!.end);
      }
    }
  });

  it('stays within the stroke budget, in one global writing order', () => {
    expect(BOARD_STROKE_COUNT).toBeGreaterThanOrEqual(6);
    expect(BOARD_STROKE_COUNT).toBeLessThanOrEqual(16); // few marks, written slowly
    for (const id of ['landscape', 'portrait'] as const) {
      const s = boardStrokes[id];
      expect(s.map((x) => x.index)).toEqual([...Array(BOARD_STROKE_COUNT).keys()]);
      // Fragments run in order, never interleaved.
      expect(s.map((x) => x.fragment)).toEqual([...s.map((x) => x.fragment)].sort((a, b) => a - b));
      expect(new Set(s.map((x) => x.fragment)).size).toBe(BOARD_FRAGMENT_COUNT);
    }
  });

  it('shares the same strokes on both boards', () => {
    const shape = (id: 'landscape' | 'portrait') => boardStrokes[id].map((s) => [s.fragment, s.tone, s.width, s.parts.length]);
    expect(shape('portrait')).toEqual(shape('landscape'));
    expect(boardStrokeWeights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('keeps every stroke on its board, and the chalk rests just past the writing', () => {
    for (const l of [landscape, portrait]) {
      for (const part of boardStrokes[l.id].flatMap((s) => s.parts)) {
        const nums = [...part.d.matchAll(/-?[\d.]+/g)].map((m) => Number(m[0]));
        const xs = nums.filter((_, i) => i % 2 === 0);
        const ys = nums.filter((_, i) => i % 2 === 1);
        expect(Math.min(...xs, ...ys)).toBeGreaterThan(12);
        expect(Math.max(...xs)).toBeLessThan(l.width - 12);
        expect(Math.max(...ys)).toBeLessThan(l.height - 20); // above the ledge
      }
      const ink = boardStrokes[l.id].flatMap((s) => s.parts);
      const [cx, cy] = boardChalkRest(l.id);
      expect(cx).toBeGreaterThan(Math.max(...ink.map((p) => p.end[0]))); // past the writing, not on it
      expect(cx).toBeLessThan(l.width - 40); // room for the stick
      expect(cy).toBeLessThan(l.height - 20);
    }
  });
});
