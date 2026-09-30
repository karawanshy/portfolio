import type { ReactNode } from 'react';
import { BUILDING, DOOR, DOOR_SWING, doorLeaf, ISO, type WindowState } from './illusData';

/**
 * Shared pieces of the chapter illustrations, so recurring objects rhyme exactly:
 * the door (ch 7 → 9 → 17) and the building with its windows (ch 11 → 13).
 *
 * One solid-object language, the ch 10 stack's: opaque objects with a lit top face,
 * a shaded side face and a plum → ink front, top-lit edges, soft contact shadows and
 * warm light as the brightest thing. Glows are radial gradients (cheap), with a CSS
 * drop-shadow only on a few small key lights. Everything is decorative; colours come
 * from tokens (src/styles/tokens.css → --illus-*).
 */

export type IllusSize = 'lane' | 'lane-compact' | 'lane-days' | 'lane-medium' | 'small' | 'tower' | 'tower-medium' | 'rich';

const sizeClass: Record<IllusSize, string> = {
  /** Standard/major scenes: the same footprint as the CPU (lane on desktop). */
  lane: 'w-full max-w-[340px] lg:w-[min(360px,27vw)] lg:max-w-none',
  /**
   * Ch 17: the lane on desktop; a step smaller on phones, where its long heading and lines
   * share the pinned frame with it (sized so the pin needn't shrink it much further).
   */
  'lane-compact': 'w-full max-w-[270px] md:max-w-[340px] lg:w-[min(360px,27vw)] lg:max-w-none',
  /**
   * Ch 10: the lane, but never under 300px on desktop — at 1024–1110 the lane (27vw) would
   * shrink the stack's small parts (the day-4 modules, the day-3 routes) below legibility.
   */
  'lane-days': 'w-full max-w-[340px] lg:w-[max(300px,min(360px,27vw))] lg:max-w-none',
  /**
   * Medium scenes (ch 7, 8, 9, 14): 30.5vw up to 425px — ≈ 1.13× the lane's width at 1024–1280
   * (where the text column and the header bound it) and 1.18× at 1440 (≈ 1.3–1.4× its area).
   */
  'lane-medium': 'w-full max-w-[380px] lg:w-[min(425px,30.5vw)] lg:max-w-none',
  /** Compact, quiet scenes. */
  small: 'w-full max-w-[260px] lg:w-[min(290px,22vw)] lg:max-w-none',
  /** Ch 11: the quiet building (tall art, so narrower). */
  tower: 'w-full max-w-[200px] lg:w-[min(210px,15vw)] lg:max-w-none',
  /**
   * Ch 13: the same building, medium — ≈ 1.18× its former width on desktop (ch 11 stays quiet).
   * Phones keep 230px: the pin fits heading + art into the safe area, so a taller box would
   * only be scaled back down.
   */
  'tower-medium': 'w-full max-w-[230px] lg:w-[21.2vw] lg:max-w-none xl:w-[min(295px,21.2vw)]',
  /** Ch 15: the rich panel. */
  rich: 'w-full max-w-[360px] lg:w-[min(430px,28vw)] lg:max-w-none',
};

/** Root of every illustration: aria-hidden, the art. */
export function IllusFrame({
  name,
  size = 'lane',
  children,
}: {
  /** `data-illus` hook value (the scene's motif). */
  name: string;
  size?: IllusSize;
  children: ReactNode;
}) {
  return (
    <div aria-hidden="true" data-illus={name} className={`relative ${sizeClass[size]}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared paint: every <svg> declares its own copy (ids are prefixed), because a
// gradient inside a display:none SVG (the other breakpoint's layout) doesn't paint.
// ---------------------------------------------------------------------------

/**
 * `url(#<p>-front)` object fronts · `-shadow` contact shadows · `-warm` warm glow ·
 * `-halo` a soft peach halo · `-paper` paper, lit from above · `-brass` a handle / cap.
 */
export function IllusDefs({ p }: { p: string }) {
  return (
    <defs>
      <linearGradient id={`${p}-front`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="var(--illus-face-front)" />
        <stop offset="1" stopColor="var(--illus-face-front-2)" />
      </linearGradient>
      <radialGradient id={`${p}-shadow`}>
        <stop offset="0" stopColor="var(--illus-shadow)" stopOpacity="0.75" />
        <stop offset="1" stopColor="var(--illus-shadow)" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${p}-warm`}>
        <stop offset="0" stopColor="var(--illus-light-core)" stopOpacity="0.95" />
        <stop offset="0.3" stopColor="var(--color-peach)" stopOpacity="0.5" />
        <stop offset="1" stopColor="var(--color-tangerine)" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${p}-halo`}>
        <stop offset="0" stopColor="var(--color-peach)" stopOpacity="0.4" />
        <stop offset="1" stopColor="var(--color-peach)" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${p}-paper`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor="var(--illus-paper)" />
        <stop offset="1" stopColor="var(--illus-paper-shade)" />
      </linearGradient>
      <radialGradient id={`${p}-brass`} cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="var(--illus-light-core)" />
        <stop offset="0.4" stopColor="var(--illus-brass)" />
        <stop offset="1" stopColor="var(--illus-brass-shade)" />
      </radialGradient>
    </defs>
  );
}

/** A soft contact shadow on the ground (uses `IllusDefs`' `-shadow`). */
export function Shadow({ p, cx, cy, rx, ry, opacity = 1 }: { p: string; cx: number; cy: number; rx: number; ry: number; opacity?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${p}-shadow)`} opacity={opacity} />;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A solid block (the ch 10 slab): front face, a receding top face (lit) and right
 * side face (in shade), with the top-lit front edge. `x, y` is the front face's top-left.
 */
export function Block({
  x,
  y,
  w,
  h,
  d = ISO,
  front,
  top = 'var(--illus-face-top)',
  side = 'var(--illus-face-side)',
  edge = true,
  children,
  ...rest
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  d?: { dx: number; dy: number };
  front: string;
  top?: string;
  side?: string;
  edge?: boolean;
  children?: ReactNode;
} & Record<`data-${string}`, string | number>) {
  const [X, Y, W, H, dx, dy] = [x, y, w, h, d.dx, d.dy].map(r1) as [number, number, number, number, number, number];
  return (
    <g {...rest}>
      <path d={`M${X} ${Y}L${r1(X + dx)} ${r1(Y + dy)}H${r1(X + W + dx)}L${r1(X + W)} ${Y}Z`} fill={top} />
      <path d={`M${r1(X + W)} ${Y}L${r1(X + W + dx)} ${r1(Y + dy)}V${r1(Y + H + dy)}L${r1(X + W)} ${r1(Y + H)}Z`} fill={side} />
      <rect x={X} y={Y} width={W} height={H} fill={front} />
      {edge && (
        <path
          d={`M${X} ${r1(Y + 0.5)}H${r1(X + W)}L${r1(X + W + dx)} ${r1(Y + dy + 0.5)}`}
          fill="none"
          stroke="var(--illus-edge-hi)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}
      {children}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Door (ch 7 closed; ch 17 draws a doorway with the same proportions)
// ---------------------------------------------------------------------------

const { w: DW, h: DH, frame: T } = DOOR;

/**
 * The architrave, its reveal and the sill: IDENTICAL markup in every state (only the
 * gradient ids differ), drawn in the door's local coordinates (opening at 0,0 → w,h).
 */
function DoorFrame({ p }: { p: string }) {
  return (
    <g data-door-part="frame">
      <rect x={-T} y={-T} width={DW + 2 * T} height={DH + T} rx="2.5" fill={`url(#${p}-frame)`} />
      {/* The moulding: a groove, a top-lit outer edge and a shaded right edge. */}
      <rect x={-T + 3.5} y={-T + 3.5} width={DW + 2 * T - 7} height={DH + T - 3.5} rx="1.5" fill="none" stroke="var(--illus-edge-lo)" strokeWidth="1" />
      <path d={`M${-T + 0.6} ${DH}V${-T + 0.6}H${DW + T - 0.6}`} fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={`M${DW + T - 0.6} ${-T + 2}V${DH}`} stroke="var(--illus-edge-lo)" strokeWidth="1.2" />
      {/* The reveal: the frame's depth inside the opening — the head and the right jamb. */}
      <rect x="0" y="0" width={DW} height={DH} fill="var(--illus-face-side)" />
      <path d={`M0 0H${DW}L${DW - 6} 6H0Z`} fill="var(--illus-face-inset)" />
      <path d={`M${DW} 0V${DH}H${DW - 6}V6Z`} fill="var(--illus-face-inset)" />
      {/* The sill. */}
      <rect x={-T - 4} y={DH - 2} width={DW + 2 * T + 8} height="4.5" rx="1.5" fill="var(--illus-face-top)" />
      <path d={`M${-T - 3} ${DH - 1.4}H${DW + T + 3}`} stroke="var(--illus-edge-hi)" strokeWidth="1" />
    </g>
  );
}

/** Frame + leaf gradients for one door instance. */
function DoorDefs({ p }: { p: string }) {
  return (
    <defs>
      <linearGradient id={`${p}-frame`} x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor="var(--illus-face-top)" />
        <stop offset="0.35" stopColor="var(--illus-face-front)" />
        <stop offset="1" stopColor="var(--illus-face-front-2)" />
      </linearGradient>
      <linearGradient id={`${p}-leaf`} x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0" stopColor="var(--illus-face-front)" />
        <stop offset="1" stopColor="var(--illus-face-front-2)" />
      </linearGradient>
      <linearGradient id={`${p}-spill`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--color-peach)" stopOpacity="0.55" />
        <stop offset="1" stopColor="var(--color-peach)" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${p}-inside`} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="var(--illus-light-core)" />
        <stop offset="0.45" stopColor="var(--color-peach)" />
        <stop offset="1" stopColor="var(--color-tangerine)" />
      </linearGradient>
      <radialGradient id={`${p}-glow`}>
        <stop offset="0" stopColor="var(--color-peach)" stopOpacity="0.42" />
        <stop offset="0.55" stopColor="var(--color-tangerine)" stopOpacity="0.12" />
        <stop offset="1" stopColor="var(--color-tangerine)" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${p}-brass`} cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="var(--illus-light-core)" />
        <stop offset="0.4" stopColor="var(--illus-brass)" />
        <stop offset="1" stopColor="var(--illus-brass-shade)" />
      </radialGradient>
    </defs>
  );
}

/** A recessed panel lit from above: the top/left inner edge in shade, the bottom/right edge catching light. */
function Recess({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="2.5" fill="none" stroke="var(--illus-edge-hi)" strokeOpacity="0.45" strokeWidth="0.8" />
      <rect x={x} y={y} width={w} height={h} rx="2" fill="var(--illus-face-inset)" />
      <path d={`M${x + 0.8} ${y + h}V${y + 0.8}H${x + w}`} fill="none" stroke="var(--illus-edge-lo)" strokeWidth="2" />
      <path d={`M${x + w - 0.5} ${y + 2}V${y + h - 0.5}H${x + 2}`} fill="none" stroke="var(--illus-edge-hi)" strokeWidth="0.9" />
    </>
  );
}

/**
 * A crafted door in a moulded frame. `x, y` is the OPENING's top-left (the frame's
 * architrave reaches `DOOR.frame` beyond it); the door stands on the ground at y + h.
 * Everything is drawn in local coordinates (one translate), so the frame is the same
 * object in every chapter.
 * States: closed (ch 7), open (ch 17: the leaf swung almost fully back
 * against its hinge; the chapter draws its own glow and spill).
 * Hooks: g[data-door="closed|open"], [data-door-part="frame|panel|knob|light"],
 * [data-door-part="spill"] (closed), [data-door-part="edge"] (open: the leaf's lit edge),
 * path[data-door-leaf="leaf|recess"] (open: the swung leaf; motion rewrites them with doorLeaf to swing it).
 */
export function Door({ x, y, state, id }: { x: number; y: number; state: 'closed' | 'open'; id: string }) {
  const p = `door-${id}`;
  if (state === 'closed') {
    const panels: [number, number][] = [
      [14, DH * 0.36],
      [DH * 0.5, DH * 0.4],
    ];
    const ky = DH * 0.53;
    return (
      <g data-door="closed" transform={`translate(${x} ${y})`}>
        <DoorDefs p={p} />
        <ellipse cx={DW / 2} cy={DH + 2} rx={DW * 0.85} ry="7" fill={`url(#${p}-glow)`} />
        <DoorFrame p={p} />
        <g data-door-part="panel">
          <rect x="1.5" y="1.5" width={DW - 3} height={DH - 6} rx="1.5" fill={`url(#${p}-leaf)`} />
          <path d={`M2 2.2H${DW - 2}M2.2 2V${DH - 5}`} stroke="var(--illus-edge-hi)" strokeOpacity="0.6" strokeWidth="1" />
          {panels.map(([py, ph], i) => (
            <Recess key={i} x={14} y={py} w={DW - 28} h={ph} />
          ))}
        </g>
        <g data-door-part="knob">
          <rect x={DW - 19} y={ky - 14} width="8" height="28" rx="4" fill="var(--illus-brass-shade)" />
          <circle cx={DW - 15} cy={ky - 4} r="4.6" fill={`url(#${p}-brass)`} />
          <path d={`M${DW - 15} ${ky + 5}v4`} stroke="var(--illus-face-side)" strokeWidth="2" strokeLinecap="round" />
        </g>
        {/* The thin line of light under the door, and where it falls on the floor. */}
        <path data-door-part="spill" d={`M2 ${DH + 1}H${DW - 2}L${DW + 34} ${DH + 30}H-34Z`} fill={`url(#${p}-spill)`} />
        <path
          data-door-part="light"
          d={`M4 ${DH - 3.2}H${DW - 4}`}
          stroke="var(--illus-light-core)"
          strokeWidth="2.4"
          strokeLinecap="round"
          style={{ filter: 'var(--illus-glow-warm)' }}
        />
      </g>
    );
  }

  // Open: warm light fills the opening; the leaf swings inward from the left hinge.
  const s = DOOR_SWING[state];
  const leaf = doorLeaf(DW * s.open, s.drop, s.rise);
  return (
    <g data-door={state} transform={`translate(${x} ${y})`}>
      <DoorDefs p={p} />
      <DoorFrame p={p} />
      <g data-door-part="light">
        <rect x="0" y="0" width={DW} height={DH} fill={`url(#${p}-inside)`} />
        {/* The room's floor receding, and the right jamb lit by it. */}
        <path d={`M0 ${DH}H${DW}L${DW - 7} ${DH - 24}H10Z`} fill="var(--illus-light-core)" opacity={0.45} />
        <path d={`M${DW} 0V${DH}H${DW - 6}V6Z`} fill="var(--color-tangerine)" opacity={0.55} />
      </g>
      <g data-door-part="panel">
        <path data-door-leaf="leaf" d={leaf.leaf} fill={`url(#${p}-leaf)`} />
        <path data-door-leaf="recess" d={leaf.recess} fill="var(--illus-face-inset)" stroke="var(--illus-edge-lo)" strokeWidth="1.2" />
      </g>
      {/* The leaf's free edge, lit from inside. */}
      <path data-door-part="edge" d={leaf.edge} fill="var(--color-peach)" style={{ filter: 'var(--illus-glow-soft)' }} />
      <circle data-door-part="knob" cx={leaf.knob[0]} cy={leaf.knob[1]} r="3.4" fill={`url(#${p}-brass)`} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Building (ch 11 occupied; ch 13 the windows go dark, one stays lit)
// ---------------------------------------------------------------------------

const B = BUILDING;
/** Window seats in the facade (col, row → top-left). */
const WIN = { w: 30, h: 24, x0: 16, pitchX: 44, y0: 20, pitchY: 34 } as const;
const winX = (c: number) => B.x + WIN.x0 + c * WIN.pitchX;
const winY = (r: number) => B.y + WIN.y0 + r * WIN.pitchY;

/**
 * A mid-rise building at dusk, with depth (a lit roof, a side in shade), a rooftop
 * housing and the product's sign on struts, recessed window frames with sills and
 * mullions, floor bands and a lit (or dark) entrance. `windowState(row, col)` sets
 * each window.
 * Hooks: [data-building], rect[data-window="r-c"][data-window-state] (the glass),
 * g[data-product-sign][data-sign-state="on|off"], [data-entrance="lit|dark"],
 * [data-window-halo] (the glow round her window).
 */
export function Building({
  id,
  windowState,
  sign,
  children,
}: {
  /** Gradient id prefix (unique per chapter). */
  id: string;
  windowState: (row: number, col: number) => WindowState;
  /** The product's sign: on in ch 11 (the product is alive), off in ch 13 (shut down). */
  sign: 'on' | 'off';
  children?: ReactNode;
}) {
  const p = `bld-${id}`;
  const ground = B.y + B.h;
  const { dx, dy } = B.depth;
  const on = sign === 'on';
  const fill: Record<WindowState, string> = {
    dark: 'var(--illus-glass-dark)',
    fading: `url(#${p}-fading)`,
    soft: `url(#${p}-soft)`,
    kept: `url(#${p}-kept)`,
  };
  const cells = Array.from({ length: B.rows * B.cols }, (_, i) => {
    const r = Math.floor(i / B.cols);
    const c = i % B.cols;
    return { r, c, x: winX(c), y: winY(r), state: windowState(r, c) };
  });
  const kept = cells.find((w) => w.state === 'kept');
  // Mullions (a centre bar and a transom) and sills: one path each for every window.
  const mullions = cells.map(({ x, y }) => `M${x + WIN.w / 2} ${y}v${WIN.h}M${x} ${y + 9}h${WIN.w}`).join('');
  const sills = cells.map(({ x, y }) => `M${x - 3} ${y + WIN.h + 2.5}h${WIN.w + 6}`).join('');
  const bands = Array.from({ length: B.rows - 1 }, (_, r) => `M${B.x} ${winY(r + 1) - 5.5}h${B.w}`).join('');
  const door = { x: B.x + B.w / 2 - 14, y: ground - 30, w: 28, h: 30 };
  return (
    <svg viewBox={`0 0 ${B.width} ${B.height}`} className="w-full overflow-visible" data-building>
      <IllusDefs p={p} />
      <defs>
        <linearGradient id={`${p}-soft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-peach)" stopOpacity="0.78" />
          <stop offset="1" stopColor="var(--color-tangerine)" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={`${p}-fading`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-peach)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--color-peach)" stopOpacity="0.07" />
        </linearGradient>
        <linearGradient id={`${p}-kept`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--illus-light-core)" />
          <stop offset="1" stopColor="var(--color-peach)" />
        </linearGradient>
        <linearGradient id={`${p}-sign`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-lilac)" stopOpacity={on ? 0.42 : 0.05} />
          <stop offset="1" stopColor="var(--color-lilac)" stopOpacity={on ? 0.14 : 0.02} />
        </linearGradient>
      </defs>

      <Shadow p={p} cx={B.x + B.w / 2 + dx / 2} cy={ground} rx={B.w * 0.78} ry={9} />
      <line x1="8" x2={B.width - 8} y1={ground} y2={ground} stroke="var(--illus-ground)" strokeWidth="2" strokeLinecap="round" />

      {/* The block: a lit roof, the side in shade, the facade. */}
      <Block x={B.x} y={B.y} w={B.w} h={B.h} d={B.depth} front={`url(#${p}-front)`} />
      {/* The parapet's inner rim on the roof. */}
      <path
        d={`M${B.x + 5} ${B.y - 1.5}L${B.x + dx - 1} ${B.y + dy + 1.5}H${B.x + B.w + dx - 5}L${B.x + B.w - 1} ${B.y - 1.5}Z`}
        fill="var(--illus-face-front)"
        stroke="var(--illus-edge-hi)"
        strokeOpacity="0.4"
        strokeWidth="0.8"
      />
      {/* Rooftop housing (back left). */}
      <Block x={B.x + 18} y={B.y - 18} w={30} h={14} d={{ dx: 10, dy: -6 }} front="var(--illus-face-front)" />

      {/* The product's sign, on struts at the roof's front. */}
      <g data-product-sign data-sign-state={sign}>
        <path d={`M${B.x + 86} ${B.y - 14}V${B.y - 3}M${B.x + 126} ${B.y - 14}V${B.y - 3}`} stroke="var(--illus-face-top)" strokeWidth="2.5" />
        <Block x={B.x + 74} y={B.y - 40} w={64} h={26} d={{ dx: 6, dy: -4 }} front="var(--illus-face-front-2)" />
        <rect x={B.x + 78} y={B.y - 36} width="56" height="18" rx="2" fill={`url(#${p}-sign)`} stroke={on ? 'var(--color-lilac)' : 'var(--illus-line-dim)'} strokeOpacity={on ? 0.7 : 1} strokeWidth="1" />
        <path
          d={`M${B.x + 88} ${B.y - 27}H${B.x + 124}`}
          stroke={on ? 'var(--color-lilac)' : 'var(--illus-window-dark)'}
          strokeWidth="3.2"
          strokeLinecap="round"
          style={on ? { filter: 'var(--illus-glow-lilac)' } : undefined}
        />
      </g>

      {/* Floor bands across the facade. */}
      <path d={bands} stroke="var(--illus-edge-hi)" strokeOpacity="0.35" strokeWidth="1" />
      {kept && <circle data-window-halo cx={kept.x + WIN.w / 2} cy={kept.y + WIN.h / 2} r="40" fill={`url(#${p}-warm)`} opacity={0.55} />}

      {/* Windows: a dark reveal, then the glass (the hook). */}
      <path d={cells.map(({ x, y }) => `M${x - 2} ${y - 2}h${WIN.w + 4}v${WIN.h + 4}h${-WIN.w - 4}Z`).join('')} fill="var(--illus-edge-lo)" />
      {cells.map(({ r, c, x, y, state }) => (
        <rect
          key={`${r}-${c}`}
          data-window={`${r}-${c}`}
          data-window-state={state}
          x={x}
          y={y}
          width={WIN.w}
          height={WIN.h}
          rx="1.5"
          fill={fill[state]}
          style={state === 'kept' ? { filter: 'var(--illus-glow-warm)' } : undefined}
        />
      ))}
      <path d={mullions} stroke="var(--illus-face-side)" strokeOpacity="0.7" strokeWidth="1.4" />
      <path d={sills} stroke="var(--illus-edge-hi)" strokeWidth="1.6" strokeLinecap="round" />

      {/* The entrance: a canopy and glass doors. */}
      <g data-entrance={on ? 'lit' : 'dark'}>
        <rect x={door.x - 2} y={door.y - 2} width={door.w + 4} height={door.h + 2} fill="var(--illus-edge-lo)" />
        <rect x={door.x} y={door.y} width={door.w} height={door.h} fill={on ? `url(#${p}-soft)` : 'var(--illus-glass-dark)'} />
        <path d={`M${door.x + door.w / 2} ${door.y}V${ground}`} stroke="var(--illus-face-side)" strokeWidth="1.4" />
        <Block x={door.x - 8} y={door.y - 7} w={door.w + 16} h={4} d={{ dx: 5, dy: -3 }} front="var(--illus-face-top)" />
      </g>
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Small half-sun ◒ (the SunMark node shape), for marks inside illustrations.
// ---------------------------------------------------------------------------

export function HalfSun({ cx, cy, r, fill, opacity = 1, ...rest }: { cx: number; cy: number; r: number; fill: string; opacity?: number } & Record<`data-${string}`, string | number>) {
  return (
    <g opacity={opacity} {...rest}>
      <path d={`M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}Z`} fill={fill} />
      <rect x={cx - r - 2} y={cy + 3} width={r * 2 + 4} height="2.5" rx="1.25" fill={fill} opacity={0.55} />
    </g>
  );
}
