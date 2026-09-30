import { describe, expect, it } from 'vitest';
import { BOARD, FIRST_SIDE, SQ, desktop, mirrored, moves, phone, pieces, sideColor, squareAfter, squareXY } from './chessData';

describe('ch 6 chess data', () => {
  it('plays a legal-looking opening, alternating sides, White (board a) first', () => {
    expect(moves.map((m) => m.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(moves[0]!.side).toBe(FIRST_SIDE);
    expect(sideColor[FIRST_SIDE]).toBe('w');
    moves.forEach((m, i) => {
      expect(m.index).toBe(i);
      if (i > 0) expect(m.side).not.toBe(moves[i - 1]!.side);
      const p = pieces.find((x) => x.id === m.piece)!;
      expect(p.color).toBe(sideColor[m.side]); // each player moves their own pieces
      expect(squareAfter(m.piece, i)).toBe(m.from); // it starts where the previous moves left it
    });
  });

  it('anchors the back-rank corners with rooks, on the right squares from each side', () => {
    const rooks = pieces.filter((p) => p.kind === 'rook');
    expect(rooks.map((r) => `${r.color}${r.start}`).sort()).toEqual(['ba8', 'bh8', 'wa1', 'wh1']);
    for (const r of rooks) expect(moves.some((m) => m.piece === r.id || m.to === r.start)).toBe(false);
    // a1 is bottom-left for White (board a) and top-right for Black (board b).
    expect(squareXY('a1', 'a')).toEqual([-3.5 * SQ, 3.5 * SQ]);
    expect(squareXY('a1', 'b')).toEqual([3.5 * SQ, -3.5 * SQ]);
    expect(squareXY('h8', 'b')).toEqual([-3.5 * SQ, 3.5 * SQ]);
  });

  it('never puts two pieces on one square, before or after', () => {
    for (const n of [0, moves.length]) {
      const squares = pieces.map((p) => squareAfter(p.id, n));
      expect(new Set(squares).size).toBe(pieces.length);
    }
  });

  it('shows each board from its own player’s side (mirrored)', () => {
    // White's first rank is at the bottom of board a and at the top of board b.
    expect(squareXY('e1', 'a')[1]).toBe(3.5 * SQ);
    expect(squareXY('e1', 'b')[1]).toBe(-3.5 * SQ);
    // a-file on a's left, on b's right.
    expect(squareXY('a4', 'a')[0]).toBe(-3.5 * SQ);
    expect(squareXY('a4', 'b')[0]).toBe(3.5 * SQ);
    // The mirror is a half turn: every square maps to its opposite.
    const [x, y] = squareXY('f3', 'a');
    expect(squareXY('f3', 'b')).toEqual([-x, -y]);
  });

  it('sends each move from its mover toward the other board along the thread', () => {
    for (const m of moves) expect(m.pulse).toEqual(m.side === 'a' ? [0, 1] : [1, 0]);
    for (const l of [desktop, mirrored, phone]) {
      expect(l.thread.startsWith(`M${l.ports.a[0]} ${l.ports.a[1]}`)).toBe(true);
      expect(l.thread.endsWith(`${l.ports.b[0]} ${l.ports.b[1]}`)).toBe(true);
    }
  });

  it('mirrors the desktop pair left↔right for portrait phones (placement only)', () => {
    expect(mirrored.boards.a).toEqual({ x: desktop.width - desktop.boards.a.x, y: desktop.boards.a.y, tilt: -desktop.boards.a.tilt });
    expect(mirrored.boards.b).toEqual({ x: desktop.width - desktop.boards.b.x, y: desktop.boards.b.y, tilt: -desktop.boards.b.tilt });
    expect(mirrored.hub).toEqual([desktop.width - desktop.hub[0], desktop.hub[1]]);
  });

  it('keeps board b’s top 0.356 of the pair’s width down (global.css: ch 6 margin-top on portrait phones)', () => {
    const panel = BOARD + 24;
    expect((mirrored.boards.b.y - panel / 2) / mirrored.width).toBeCloseTo(0.356, 3);
  });
});
