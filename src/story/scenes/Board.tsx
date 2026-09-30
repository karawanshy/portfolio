import { boardChalkRest, boardStrokes, chalkColor, landscape, portrait, type BoardLayout } from './boardData';

/**
 * Chapter 3: a classroom chalkboard with a teacher's handwriting on it: a few
 * code words that read as English (`if x == 5` circled, an arrow to `print(x)`,
 * `while` underlined), drawn as single-line chalk strokes.
 * Two layouts from the same stroke data (boardData.ts): a landscape board (desktop, phones)
 * and a portrait board (tablets). The static state is the finished board.
 *
 * Hooks (per board):
 *   svg[data-scene-part="board"]           each board (only one is displayed); data-board-layout = its layout id
 *   g[data-board-fragment="N"]             one fragment of writing, in writing order
 *   g[data-stroke="N"]                     one chalk stroke (a word, a mark, a box), global
 *                                          writing order 0…count−1; carries its colour and width;
 *                                          data-stroke-weight = its share of the board's length
 *   path[data-stroke-part="k"][pathLength="1"]
 *                                          its pen movements in order (k = 0…), one continuous
 *                                          line each; data-part-weight = share of the stroke.
 *                                          No transforms anywhere, so getPointAtLength() is in
 *                                          viewBox units
 *   g[data-board-chalk]                    the chalk stick; its tip is the local origin (0, 0),
 *                                          statically translated to the end of the last stroke
 *   [data-board-chalk-glow]                the warm glow at the tip
 * Decorative.
 */

/** Old, half-erased chalk on the surface (static; blurred once). */
const dust = (l: BoardLayout) => {
  const { width: w, height: h } = l;
  return `M${w * 0.1} ${h * 0.3}C${w * 0.3} ${h * 0.22} ${w * 0.5} ${h * 0.36} ${w * 0.72} ${h * 0.26}M${w * 0.2} ${h * 0.72}C${w * 0.42} ${h * 0.64} ${w * 0.6} ${h * 0.78} ${w * 0.9} ${h * 0.66}`;
};

/** The chalk stick, tip at (0, 0), held from the lower right. */
function Chalk({ layout }: { layout: BoardLayout }) {
  const [x, y] = boardChalkRest(layout.id);
  return (
    <g data-board-chalk transform={`translate(${x} ${y})`}>
      <circle data-board-chalk-glow r="11" fill={`url(#board-glow-${layout.id})`} />
      <g transform="rotate(38)">
        <rect x="1.5" y="-4.6" width="34" height="9.2" rx="3.4" fill="var(--board-chalk-stick)" />
        <path d="M6 2.6H34" stroke="var(--board-chalk-stick-shade)" strokeWidth="2" strokeLinecap="round" />
        {/* The worn writing end. */}
        <path d="M1.5 -3.6Q-0.6 0 1.5 3.6" fill="var(--board-chalk-stick)" />
      </g>
    </g>
  );
}

function BoardSvg({ layout, className }: { layout: BoardLayout; className: string }) {
  const { id, width, height } = layout;
  const strokes = boardStrokes[id];
  const total = strokes.reduce((n, s) => n + s.length, 0);
  const byFragment = new Map<number, typeof strokes>();
  for (const s of strokes) byFragment.set(s.fragment, [...(byFragment.get(s.fragment) ?? []), s]);

  return (
    <svg
      data-scene-part="board"
      data-board-layout={id}
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full rounded-[26px] lg:rounded-[30px] ${className}`}
      style={{ background: 'var(--board-fill)', boxShadow: 'var(--board-shadow)' }}
    >
      <defs>
        {/* Chalk dropout: board-coloured specks laid over the writing (static, rasterised once). */}
        <filter id={`board-grain-${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -4.6" />
          <feComposite in="SourceGraphic" operator="in" />
        </filter>
        <filter id={`board-dust-${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <radialGradient id={`board-glow-${id}`}>
          <stop offset="0" stopColor="var(--board-chalk-glow)" />
          <stop offset="1" stopColor="var(--board-chalk-glow)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <path d={dust(layout)} fill="none" stroke="var(--board-dust)" strokeWidth="26" strokeLinecap="round" filter={`url(#board-dust-${id})`} />

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[...byFragment].map(([f, list]) => (
          <g key={f} data-board-fragment={f}>
            {list.map((s) => (
              <g
                key={s.index}
                data-stroke={s.index}
                data-stroke-weight={(s.length / total).toFixed(4)}
                stroke={chalkColor[s.tone]}
                strokeWidth={s.width}
              >
                {s.parts.map((part, k) => (
                  <path
                    key={k}
                    data-stroke-part={k}
                    data-part-weight={(part.length / s.length).toFixed(4)}
                    pathLength={1}
                    d={part.d}
                  />
                ))}
              </g>
            ))}
          </g>
        ))}
      </g>

      <rect width={width} height={height} fill="var(--board-grain)" filter={`url(#board-grain-${id})`} />

      {/* Chalk ledge. */}
      <rect x={layout.ledgeX} y={height - 18} width={width - layout.ledgeX * 2} height={5} rx={2.5} fill="var(--board-chalk-dim)" />

      <Chalk layout={layout} />
    </svg>
  );
}

export function Board() {
  return (
    <div aria-hidden="true" className="relative">
      {/* Desktop (tilted) and phones: the landscape board — on phones it is short enough for the
          heading, the board and the quote to share one pinned frame. Tablets: the portrait one. */}
      <div className="lg:-rotate-2">
        <BoardSvg layout={landscape} className="md:max-lg:hidden" />
      </div>
      <BoardSvg layout={portrait} className="hidden md:max-lg:block" />
    </div>
  );
}
