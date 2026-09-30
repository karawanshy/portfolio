/**
 * Chapter 6: a real-time chess game between two players on two machines.
 * Shared by Chess.tsx, the motion and tests. Pure data (prerender-safe).
 *
 * Two boards, one per player: board "a" (lilac) plays White and sees White at the bottom;
 * board "b" (tangerine) plays Black and sees the same position turned round. Moves travel
 * between them along one thread, through a ◒ hub (the server), as pulses.
 *
 * Coordinates: each board's pieces live in BOARD-LOCAL units, origin at the board's centre,
 * one square = SQ (the board group carries the placement + tilt). The thread, hub and
 * pulses are in the SVG's own viewBox units.
 */

export type Side = 'a' | 'b';
export type PieceColor = 'w' | 'b';
export type PieceKind = 'pawn' | 'knight' | 'rook' | 'king';

/** Square size (board-local units); a board is 8 × SQ wide. */
export const SQ = 20;
export const BOARD = SQ * 8;

/** Which colour each board's player has (and so sees at the bottom). */
export const sideColor: Record<Side, PieceColor> = { a: 'w', b: 'b' };

const FILES = 'abcdefgh';

/** A square's centre on a board, board-local (a: White's view, b: Black's view, turned round). */
export function squareXY(square: string, side: Side): readonly [number, number] {
  const f = FILES.indexOf(square[0]!);
  const r = Number(square[1]);
  if (f < 0 || !(r >= 1 && r <= 8)) throw new Error(`chess: bad square "${square}"`);
  const col = side === 'a' ? f : 7 - f;
  const row = side === 'a' ? 8 - r : r - 1;
  return [(col - 3.5) * SQ, (row - 3.5) * SQ];
}

/** Is this a dark square? (a1 is dark.) */
export const isDark = (col: number, row: number) => (col + row) % 2 === 1;

export interface Piece {
  id: string;
  kind: PieceKind;
  color: PieceColor;
  /** Where it stands before the first move. */
  start: string;
}

/**
 * The pieces shown: pawns, the knights, the rooks anchoring the corners and the kings —
 * enough to read as chess at a glance without a full set's clutter (bishops and queens
 * are left off).
 */
export const pieces: readonly Piece[] = [
  ...[...FILES].map((f): Piece => ({ id: `w-p-${f}`, kind: 'pawn', color: 'w', start: `${f}2` })),
  { id: 'w-r-a', kind: 'rook', color: 'w', start: 'a1' },
  { id: 'w-n-b', kind: 'knight', color: 'w', start: 'b1' },
  { id: 'w-n-g', kind: 'knight', color: 'w', start: 'g1' },
  { id: 'w-k', kind: 'king', color: 'w', start: 'e1' },
  { id: 'w-r-h', kind: 'rook', color: 'w', start: 'h1' },
  ...[...FILES].map((f): Piece => ({ id: `b-p-${f}`, kind: 'pawn', color: 'b', start: `${f}7` })),
  { id: 'b-r-a', kind: 'rook', color: 'b', start: 'a8' },
  { id: 'b-n-b', kind: 'knight', color: 'b', start: 'b8' },
  { id: 'b-n-g', kind: 'knight', color: 'b', start: 'g8' },
  { id: 'b-k', kind: 'king', color: 'b', start: 'e8' },
  { id: 'b-r-h', kind: 'rook', color: 'b', start: 'h8' },
];

export interface Move {
  /** Order (0-based) = `data-chess-pulse` index. */
  index: number;
  /** Standard notation, for reference. */
  san: string;
  /** The board where it's played (the mover's machine); it then appears on the other board. */
  side: Side;
  piece: string;
  from: string;
  to: string;
  /**
   * The pulse's run along the thread (as fractions of its length): the thread is drawn
   * from board a to board b, so a's moves run 0 → 1 and b's run 1 → 0.
   */
  pulse: readonly [number, number];
}

/** A plausible opening: 1. e4 e5 2. Nf3 Nc6. White (board a) moves first. */
export const FIRST_SIDE: Side = 'a';
export const moves: readonly Move[] = [
  { index: 0, san: 'e4', side: 'a', piece: 'w-p-e', from: 'e2', to: 'e4', pulse: [0, 1] },
  { index: 1, san: 'e5', side: 'b', piece: 'b-p-e', from: 'e7', to: 'e5', pulse: [1, 0] },
  { index: 2, san: 'Nf3', side: 'a', piece: 'w-n-g', from: 'g1', to: 'f3', pulse: [0, 1] },
  { index: 3, san: 'Nc6', side: 'b', piece: 'b-n-b', from: 'b8', to: 'c6', pulse: [1, 0] },
];

/** Where a piece stands after the first `n` moves (default: all of them — the synced final state). */
export function squareAfter(id: string, n = moves.length): string {
  let sq = pieces.find((p) => p.id === id)!.start;
  for (const m of moves.slice(0, n)) if (m.piece === id) sq = m.to;
  return sq;
}

// ---------------------------------------------------------------------------
// Layouts (viewBox units): `desktop` boards left and right (desktop, landscape phones), `mirrored`
// the same pair mirrored left↔right (portrait phones), `phone` stacked (tablets)
// ---------------------------------------------------------------------------

export interface ChessLayout {
  id: 'h' | 'm' | 'v';
  width: number;
  height: number;
  /** Board centres and tilts (deg). */
  boards: Record<Side, { x: number; y: number; tilt: number }>;
  hub: readonly [number, number];
  /** The thread, from board a's port through the hub to board b's port. */
  thread: string;
  ports: Record<Side, readonly [number, number]>;
}

/**
 * Desktop: the boards staggered on a diagonal (a high-left, b low-right), so a move
 * visibly crosses a distance; the thread falls from a's bottom edge, through the hub
 * in the open lower-left, and runs into b's left edge. viewBox units: one panel is
 * BOARD + 24 = 184 across.
 */
export const desktop: ChessLayout = {
  id: 'h',
  width: 410,
  height: 332,
  boards: { a: { x: 94, y: 94, tilt: -4 }, b: { x: 316, y: 238, tilt: 4 } },
  hub: [162, 262],
  thread: 'M124 188C124 236 132 262 162 262C188 262 202 262 222 261',
  ports: { a: [124, 188], b: [222, 261] },
};

export const phone: ChessLayout = {
  id: 'v',
  width: 300,
  height: 500,
  boards: { a: { x: 150, y: 94, tilt: -4 }, b: { x: 150, y: 406, tilt: 4 } },
  hub: [150, 250],
  thread: 'M150 192C150 222 128 228 150 250C172 272 150 278 150 308',
  ports: { a: [150, 192], b: [150, 308] },
};

/**
 * Portrait phones: the `desktop` pair mirrored left↔right — board a (upper) on the right, beside
 * the controls, board b (lower) on the left. Only the placement is mirrored (x, tilt, the thread,
 * the hub and the ports): the boards themselves are drawn as on every other layout.
 */
export const mirrored: ChessLayout = (() => {
  const mx = (x: number) => desktop.width - x;
  const board = (s: Side) => ({ ...desktop.boards[s], x: mx(desktop.boards[s].x), tilt: -desktop.boards[s].tilt });
  return {
    ...desktop,
    id: 'm',
    boards: { a: board('a'), b: board('b') },
    hub: [mx(desktop.hub[0]), desktop.hub[1]],
    thread: desktop.thread.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${mx(Number(x))} ${y}`),
    ports: { a: [mx(desktop.ports.a[0]), desktop.ports.a[1]], b: [mx(desktop.ports.b[0]), desktop.ports.b[1]] },
  };
})();
