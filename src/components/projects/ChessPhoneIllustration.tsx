import { projects } from '@/content';

const { chessPhone } = projects;
const FILES = 'abcdefgh';

/** Opponent (top) / you (bottom) bar: avatar dot and name left, clock right. */
function PlayerBar({ name, clock, side }: { name: string; clock: string; side: 'opponent' | 'you' }) {
  const theme =
    side === 'opponent'
      ? 'bg-(--phone-opponent-bar) [--dot:var(--phone-opponent)] [--clock:var(--phone-opponent-clock)]'
      : 'bg-(--phone-you-bar) [--dot:var(--phone-you)] [--clock:var(--phone-you-clock)]';
  return (
    <div className={`flex items-center justify-between rounded-[8px] px-[7px] py-[5px] ${theme}`}>
      <span className="flex items-center gap-[5px] text-(length:--fs-ui-3xs) leading-none font-bold">
        <span className="size-3 shrink-0 rounded-full bg-(--dot)" />
        {name}
      </span>
      <span className="font-(family-name:--font-clock) text-(length:--fs-ui-3xs) leading-none font-bold text-(--clock)">{clock}</span>
    </div>
  );
}

/** 8×8 board, a8 top-left (light), last move highlighted, Unicode pieces. */
function Board() {
  const { from, to } = chessPhone.lastMove;
  const squares = [];
  for (let rank = 8; rank >= 1; rank--) {
    for (let f = 0; f < 8; f++) {
      const square = `${FILES[f]}${rank}`;
      const light = (8 - rank + f) % 2 === 0;
      const fill =
        square === from
          ? 'var(--board-move-from)'
          : square === to
            ? 'var(--board-move-to)'
            : light
              ? 'var(--board-light)'
              : 'var(--board-dark)';
      squares.push(
        <span key={square} className="flex items-center justify-center" style={{ background: fill }}>
          {chessPhone.pieces[square]}
        </span>,
      );
    }
  }
  return (
    <div className="grid size-32 shrink-0 grid-cols-8 grid-rows-8 overflow-hidden rounded-[6px] font-(family-name:--font-chess-glyphs) text-(length:--fs-ui-xs) leading-none text-(--board-piece)">
      {squares}
    </div>
  );
}

/**
 * Multiplayer Chess card illustration: an Android phone showing a live game (content:
 * projects.chessPhone). Decorative: the "buttons" are spans, not controls.
 */
export function ChessPhoneIllustration({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex justify-center ${className}`}>
      <div className="relative flex h-[296px] w-[158px] shrink-0 flex-col gap-2 rounded-[30px] border-[6px] border-(--phone-bezel) bg-(--phone-screen) px-[9px] pt-[26px] pb-3 text-cream shadow-(--phone-shadow)">
        <span className="absolute top-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-pill bg-(--phone-bezel)" />
        <PlayerBar side="opponent" {...chessPhone.opponent} />
        <Board />
        <PlayerBar side="you" {...chessPhone.you} />
        <div className="mt-auto flex gap-[5px] text-(length:--fs-ui-4xs) leading-none">
          <span className="flex-1 rounded-pill bg-(--phone-action-fill) py-[7px] text-center font-extrabold text-(--phone-action-ink)">
            {chessPhone.actions.primary}
          </span>
          <span className="flex-1 rounded-pill border border-(--phone-action-outline) py-[6px] text-center font-bold">
            {chessPhone.actions.secondary}
          </span>
        </div>
      </div>
    </div>
  );
}
