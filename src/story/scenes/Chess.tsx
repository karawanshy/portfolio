import type { CSSProperties } from 'react';
import { HalfSun } from './illusParts';
import {
  BOARD,
  SQ,
  desktop,
  isDark,
  mirrored,
  moves,
  phone,
  pieces,
  sideColor,
  squareAfter,
  squareXY,
  type ChessLayout,
  type PieceColor,
  type PieceKind,
  type Side,
} from './chessData';

/**
 * Chapter 6: a real-time multiplayer chess game. Two boards on two machines, one per
 * player (a: lilac, plays White; b: tangerine, plays Black and sees the board turned
 * round), joined by one luminous thread through a small ◒ hub (the server). Moves
 * travel along the thread as pulses and appear, mirrored, on the other board.
 * Desktop and landscape phones: boards left and right (the `desktop` layout); portrait phones:
 * the same pair mirrored (`mirrored`: board a upper right, beside the controls); tablets:
 * stacked, with a vertical thread (the `phone` layout).
 * The static markup is the final, synced position after 1. e4 e5 2. Nf3 Nc6.
 *
 * Hooks (per SVG; data in chessData.ts):
 *   svg[data-scene-part="chess"][data-layout="h|m|v"]
 *   g[data-chess-board="a|b"]         a board (placement + tilt on the group); pieces inside
 *                                     are board-local (origin = board centre)
 *   g[data-chess-piece="<id>"][data-square]
 *                                     a piece drawn around (0, 0) = its square's centre, placed
 *                                     with style transform translate(x px, y px); transform-box
 *                                     view-box, origin 0 0 — so `translate(…) scale(…)` lifts
 *                                     it about its own centre. Position: squareXY(square, side)
 *   rect[data-chess-highlight="from|to"][data-side]
 *                                     last-move squares (static: Nc6), drawn around (0, 0) and
 *                                     placed like pieces; fill var(--chess-highlight-a|b)
 *   path[data-chess-thread][pathLength="1"]  the thread, board a → board b (viewBox units)
 *   path[data-chess-thread-glow] · path[data-chess-thread-sheen]  its glow and sheen (same d)
 *   g[data-chess-hub]                 the ◒ hub (transform-box fill-box, origin centre)
 *   circle[data-chess-port="a|b"]     the thread's ends at each machine
 *   circle[data-chess-pulse="N"][data-side]
 *                                     move N's pulse (the sender's colour), drawn around (0, 0);
 *                                     static: at its arrival port, opacity 0. Position it with
 *                                     the thread's getPointAtLength(t · length), t along
 *                                     moves[N].pulse
 *   rect[data-chess-pulse-tail="N"][data-side]
 *                                     its tail, from (0, 0) back along −x (fades out behind);
 *                                     place with translate(x, y) rotate(heading) — heading =
 *                                     the direction of travel; static: opacity 0
 * Decorative.
 */

/** Pieces, drawn around (0, 0) inside one square (SQ = 20): base at y = 8. */
const shapes: Record<PieceKind, string> = {
  pawn: 'M-5.5 8H5.5V6.6H3.6C3.2 4 2.3 1.6 1.7 0A3.4 3.4 0 1 0 -1.7 0C-2.3 1.6 -3.2 4 -3.6 6.6H-5.5Z',
  knight:
    'M-6 8H6V6.4H4.6C4.8 2 4.6 -2.5 3.2 -5.2C2 -7.4 0 -8.6 -1.4 -8.6L-1 -7.2C-3 -6.6 -5.6 -4.4 -6.4 -2.2C-6.8 -1.2 -6.2 -0.2 -5.2 -0.4L-2.4 -1.4C-2 0.4 -3.6 3 -4.4 6.4H-6Z',
  // A crown: flared top over a narrow waist, a cross on top.
  king: 'M-5.8 8H5.8V6.6H3.8C2.9 4.2 2 2 1.8 0.2C3.4 -0.8 5.2 -2.6 5.8 -4.8C3.8 -6.1 -3.8 -6.1 -5.8 -4.8C-5.2 -2.6 -3.4 -0.8 -1.8 0.2C-2 2 -2.9 4.2 -3.8 6.6H-5.8ZM-0.9 -10.8H0.9V-9H2.6V-7.4H0.9V-5.6H-0.9V-7.4H-2.6V-9H-0.9Z',
  // A tower: crenellated top, straight body.
  rook: 'M-5.5 8H5.5V6.4H4.1L3.5 -2.2H4.8V-7.4H2.8V-5.4H1V-7.4H-1V-5.4H-2.8V-7.4H-4.8V-2.2H-3.5L-4.1 6.4H-5.5Z',
};

const pieceFill: Record<PieceColor, { fill: string; stroke: string }> = {
  w: { fill: 'var(--chess-piece-white)', stroke: 'var(--chess-piece-white-edge)' },
  b: { fill: 'var(--chess-piece-black)', stroke: 'var(--chess-piece-black-edge)' },
};

const accent: Record<Side, string> = { a: 'var(--chess-accent-a)', b: 'var(--chess-accent-b)' };

/** Placed around (0, 0): translate moves it, scale/rotate pivot on the piece itself. */
const placed = (x: number, y: number): CSSProperties => ({
  transform: `translate(${x}px, ${y}px)`,
  transformBox: 'view-box',
  transformOrigin: '0 0',
});

/** All dark squares as one path (board-local). */
const darkSquares = (() => {
  let d = '';
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++)
      if (isDark(col, row)) d += `M${(col - 4) * SQ} ${(row - 4) * SQ}h${SQ}v${SQ}h${-SQ}Z`;
  return d;
})();

const PANEL = BOARD + 24;
/** Pulse tail length (viewBox units), drawn from the pulse's centre back along −x. */
const TAIL = 26;
const last = moves[moves.length - 1]!;

function Board({ side, layout }: { side: Side; layout: ChessLayout }) {
  const { x, y, tilt } = layout.boards[side];
  // The mirror: board b shows the same squares turned round, and its own colour at the bottom.
  const hl = (sq: string) => squareXY(sq, side);
  return (
    <g data-chess-board={side} data-color={sideColor[side]} transform={`translate(${x} ${y}) rotate(${tilt})`}>
      {/* The machine: a panel in the player's accent, with a bar on the player's own edge. */}
      <rect x={-PANEL / 2} y={-PANEL / 2} width={PANEL} height={PANEL} rx="20" fill="var(--illus-fill)" stroke={accent[side]} strokeOpacity="0.55" strokeWidth="2" />
      <rect x={-22} y={PANEL / 2 - 7} width="44" height="3" rx="1.5" fill={accent[side]} opacity="0.8" />

      <rect x={-BOARD / 2} y={-BOARD / 2} width={BOARD} height={BOARD} rx="3" fill="var(--chess-sq-light)" />
      <path d={darkSquares} fill="var(--chess-sq-dark)" />

      {(['from', 'to'] as const).map((k) => {
        const [hx, hy] = hl(k === 'from' ? last.from : last.to);
        return (
          <rect
            key={k}
            data-chess-highlight={k}
            data-side={last.side}
            x={-SQ / 2}
            y={-SQ / 2}
            width={SQ}
            height={SQ}
            fill={`var(--chess-highlight-${last.side})`}
            style={placed(hx, hy)}
          />
        );
      })}

      {pieces.map((p) => {
        const sq = squareAfter(p.id);
        const [px, py] = squareXY(sq, side);
        const c = pieceFill[p.color];
        return (
          <g key={p.id} data-chess-piece={p.id} data-square={sq} style={placed(px, py)}>
            <path d={shapes[p.kind]} fill={c.fill} stroke={c.stroke} strokeWidth="0.9" strokeLinejoin="round" />
            {p.kind === 'knight' && <circle cx={-1.8} cy={-4.4} r="0.9" fill={c.stroke} />}
          </g>
        );
      })}
    </g>
  );
}

function ChessSvg({ layout, className }: { layout: ChessLayout; className: string }) {
  const { id, width, height, hub, thread, ports } = layout;
  const h = id !== 'v';
  const gradId = `chess-thread-${id}`;
  const blurId = `chess-glow-${id}`;
  return (
    <svg data-scene-part="chess" data-layout={id} viewBox={`0 0 ${width} ${height}`} className={`overflow-visible ${className}`}>
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          {...(h ? { x1: ports.a[0], x2: ports.b[0], y1: 0, y2: 0 } : { x1: 0, x2: 0, y1: ports.a[1], y2: ports.b[1] })}
        >
          <stop offset="0" stopColor="var(--chess-accent-a)" />
          <stop offset="0.5" stopColor="var(--color-pink)" />
          <stop offset="1" stopColor="var(--chess-accent-b)" />
        </linearGradient>
        {(['a', 'b'] as const).map((sd) => (
          <linearGradient key={sd} id={`chess-tail-${sd}-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={accent[sd]} stopOpacity="0" />
            <stop offset="1" stopColor={accent[sd]} stopOpacity="0.85" />
          </linearGradient>
        ))}
        <filter id={blurId} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* The connection: a satin thread (glow, body, sheen) through the hub. */}
      <path data-chess-thread-glow d={thread} fill="none" stroke={`url(#${gradId})`} strokeWidth="12" strokeLinecap="round" opacity="0.35" filter={`url(#${blurId})`} />
      <path data-chess-thread pathLength={1} d={thread} fill="none" stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" />
      <path data-chess-thread-sheen d={thread} fill="none" stroke="var(--color-cream)" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
      {(['a', 'b'] as const).map((s) => (
        <circle key={s} data-chess-port={s} cx={ports[s][0]} cy={ports[s][1]} r="4.5" fill={accent[s]} />
      ))}

      <Board side="a" layout={layout} />
      <Board side="b" layout={layout} />

      <g data-chess-hub style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle cx={hub[0]} cy={hub[1]} r="30" fill="none" stroke="var(--color-pink)" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="3 6" />
        <circle cx={hub[0]} cy={hub[1]} r="21" fill="var(--color-ink)" stroke="var(--color-pink)" strokeOpacity="0.65" strokeWidth="1.8" />
        <HalfSun cx={hub[0]} cy={hub[1] + 5} r={11} fill="var(--color-tangerine)" />
      </g>

      {/* Moves in flight: a pulse in the sender's colour, with a short tail behind it. */}
      {moves.map((m) => {
        const [px, py] = ports[m.side === 'a' ? 'b' : 'a'];
        return (
          <g key={m.index}>
            <rect
              data-chess-pulse-tail={m.index}
              data-side={m.side}
              x={-TAIL}
              y={-2.5}
              width={TAIL}
              height={5}
              rx={2.5}
              fill={`url(#chess-tail-${m.side}-${id})`}
              opacity={0}
              style={placed(px, py)}
            />
            <circle
              data-chess-pulse={m.index}
              data-side={m.side}
              r="6"
              fill={accent[m.side]}
              stroke="var(--color-cream)"
              strokeOpacity="0.8"
              strokeWidth="1.5"
              opacity={0}
              style={{ ...placed(px, py), filter: `drop-shadow(0 0 7px ${accent[m.side]})` }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function Chess() {
  return (
    // The diagonal pair on desktop and landscape phones, mirrored on portrait phones (short enough to pin with the
    // heading at a readable size); the stacked pair on tablets, which have the height for it.
    <div
      aria-hidden="true"
      data-illus="chess"
      className="relative mx-auto w-full max-w-[290px] md:max-lg:max-w-[270px] lg:mx-0 lg:w-[min(560px,max(calc(39vw-60px),calc(72vw-492px)))] lg:max-w-none"
    >
      <ChessSvg layout={desktop} className="w-full md:max-lg:hidden max-md:portrait:hidden" />
      <ChessSvg layout={mirrored} className="hidden w-full max-md:portrait:block" />
      <ChessSvg layout={phone} className="hidden w-full md:max-lg:block" />
    </div>
  );
}
