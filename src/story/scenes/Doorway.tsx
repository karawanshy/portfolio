import { Block, Door, IllusDefs, IllusFrame } from './illusParts';
import { DOOR } from './illusData';
import { seeded } from './rng';

const P = 'ch17';
const W = 380;
const H = 380;
const GROUND = 306;
/** The doorway (the same opening as the doors of ch 7 and ch 9). */
const X = 142;
const Y = GROUND - DOOR.h;
/** The wall's front face, and its depth (coping on top, the end in shade). */
const WALL = { x: 36, y: 62, w: 298, depth: { dx: 14, dy: -9 } } as const;
/** Bricks: course height, brick length, mortar joint. */
const BRICK = { h: 12.2, l: 28, gap: 2 } as const;
/** Around the opening the bricks aren't laid yet: they're only drawn (outlines). */
const DRAWN = { x0: X - 18, x1: X + DOOR.w + 18, y0: Y - 22 } as const;

/** Brick courses in three tones (one path each), their lit top edges, and the outlined (still-drawn) bricks. */
const bricks = (() => {
  const rand = seeded(17);
  const tones = ['', '', ''];
  let tops = '';
  let drawn = '';
  const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
  for (let r = 0, y = WALL.y + 1; y + BRICK.h <= GROUND + 0.5; r++, y += BRICK.h) {
    const y0 = Math.round(y * 10) / 10;
    const bh = BRICK.h - BRICK.gap;
    for (let x = WALL.x + 1 - (r % 2 ? BRICK.l / 2 : 0); x < WALL.x + WALL.w - 1; x += BRICK.l) {
      const x0 = Math.max(WALL.x + 1, x);
      const x1 = Math.min(WALL.x + WALL.w - 1, x + BRICK.l - BRICK.gap);
      if (x1 - x0 < 4) continue;
      const inOpening = x1 > X && x0 < X + DOOR.w && y0 + bh > Y;
      const inDrawn = x1 > DRAWN.x0 && x0 < DRAWN.x1 && y0 + bh > DRAWN.y0;
      if (inOpening) continue;
      if (inDrawn) {
        drawn += rect(x0, y0, x1 - x0, bh);
        continue;
      }
      tones[Math.floor(rand() * 3)] += rect(x0, y0, x1 - x0, bh);
      tops += `M${x0 + 0.5} ${y0 + 0.5}H${x1 - 0.5}`;
    }
  }
  return { tones, tops, drawn };
})();

/**
 * Chapter 17 — a new full-stack team was being created inside the backend
 * organization, and they wanted her on it: the role that didn't exist. A blank brick
 * wall with real depth (coping, a shaded end, three-tone brickwork lit along its top
 * edges); a doorway is drawing itself into it — the bricks around the opening are only
 * outlined, construction lines and a dimension line still show — and in it stands the
 * same cased door as ch 7 and ch 9, its leaf swung all the way open, warm light
 * filling the doorway and spilling onto the ground.
 * The opening has the proportions of the doors of ch 7 and ch 9.
 * RICH, supporting: its right edge stays where it was (headroom for the sunrise).
 * Hooks: [data-wall] (› [data-wall-bricks], [data-wall-drawn] the outlined bricks),
 * [data-doorway="outline|construction|spill|bloom"] (dash-draw the outline and the drawn
 * bricks, then the light), g[data-doorway="door"] › g[data-door="open"] (see Door: its
 * [data-door-part="light"] replaces the old [data-doorway="light"], and its lit jamb the
 * old [data-doorway="reveal"]).
 */
export function Doorway() {
  /** The threshold's centre (the floor light and the bloom are centred on it). */
  const mid = X + DOOR.w / 2;
  return (
    <IllusFrame name="doorway" size="lane-compact">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        <IllusDefs p={P} />
        <defs>
          <linearGradient id={`${P}-light`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="var(--illus-light-core)" />
            <stop offset="0.5" stopColor="var(--color-peach)" />
            <stop offset="1" stopColor="var(--color-tangerine)" />
          </linearGradient>
          <linearGradient id={`${P}-spill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-peach)" stopOpacity="0.6" />
            <stop offset="1" stopColor="var(--color-peach)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${P}-floor`} cx="0.5" cy="0" r="0.6">
            <stop offset="0" stopColor="var(--illus-face-top)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--illus-face-top)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${P}-bloom`}>
            <stop offset="0" stopColor="var(--color-peach)" stopOpacity="0.4" />
            <stop offset="0.6" stopColor="var(--color-tangerine)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--color-tangerine)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The ground in front of the wall. */}
        <path d={`M${mid - 176} ${GROUND}A176 60 0 0 0 ${mid + 176} ${GROUND}Z`} fill={`url(#${P}-floor)`} />

        <g data-wall>
          <Block x={WALL.x} y={WALL.y} w={WALL.w} h={GROUND - WALL.y} d={WALL.depth} front="var(--illus-mortar)" />
          <g data-wall-bricks>
            <path d={bricks.tones[0]} fill="var(--illus-brick)" />
            <path d={bricks.tones[1]} fill="var(--illus-brick-2)" />
            <path d={bricks.tones[2]} fill="var(--illus-brick-3)" />
            <path d={bricks.tops} stroke="var(--illus-edge-hi)" strokeOpacity="0.35" strokeWidth="0.8" />
          </g>
          {/* The wall's light falls off toward the ground. */}
          <rect x={WALL.x} y={WALL.y} width={WALL.w} height={GROUND - WALL.y} fill={`url(#${P}-front)`} opacity={0.35} />
          <path data-wall-drawn d={bricks.drawn} fill="none" stroke="var(--color-cream)" strokeOpacity="0.32" strokeWidth="0.8" strokeDasharray="3 2" />
        </g>
        <line x1="12" x2={W - 12} y1={GROUND} y2={GROUND} stroke="var(--illus-ground)" strokeWidth="2" strokeLinecap="round" />

        {/* The warm light round the opening, the spill on the ground. */}
        <ellipse data-doorway="bloom" cx={mid} cy={Y + DOOR.h * 0.55} rx={DOOR.w * 1.2} ry={DOOR.h * 0.72} fill={`url(#${P}-bloom)`} />
        <path data-doorway="spill" d={`M${X} ${GROUND}H${X + DOOR.w}L${X + DOOR.w + 46} ${H - 6}H${X - 46}Z`} fill={`url(#${P}-spill)`} />
        {/* The door itself: the same cased door as ch 7 and ch 9, its leaf swung all the way open. */}
        <g data-doorway="door">
          <Door x={X} y={Y} state="open" id={P} />
        </g>

        {/* Construction lines: the doorway is still being drawn into the wall. */}
        <g data-doorway="construction" fill="none" stroke="var(--color-cream)" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round">
          <path d={`M${X - 40} ${Y - DOOR.frame}H${X + DOOR.w + 40}M${X - DOOR.frame} ${Y - 40}V${Y + 24}M${X + DOOR.w + DOOR.frame} ${Y - 40}V${Y + 24}`} strokeDasharray="3 5" />
          {/* A dimension line over the doorway (end ticks, no text). */}
          <path d={`M${X - DOOR.frame} ${Y - 26}H${X + DOOR.w + DOOR.frame}M${X - DOOR.frame} ${Y - 30}v8M${X + DOOR.w + DOOR.frame} ${Y - 30}v8`} strokeOpacity="0.6" />
          {/* A compass arc swung from the threshold, and corner marks. */}
          <path d={`M${X - 22} ${Y + 36}A${DOOR.w / 2 + 22} ${DOOR.w / 2 + 22} 0 0 1 ${X + DOOR.w + 22} ${Y + 36}`} strokeDasharray="2 5" strokeOpacity="0.3" />
          <path d={`M${X - 18} ${GROUND - 1}h-8M${X + DOOR.w + 18} ${GROUND - 1}h8`} />
        </g>
        {/* The line that draws the doorway: round the casing's outer edge. */}
        <rect
          data-doorway="outline"
          x={X - DOOR.frame}
          y={Y - DOOR.frame}
          width={DOOR.w + 2 * DOOR.frame}
          height={DOOR.h + DOOR.frame}
          rx="2.5"
          fill="none"
          stroke="var(--color-cream)"
          strokeOpacity="0.8"
          strokeWidth="1.4"
          style={{ filter: 'var(--illus-glow-soft)' }}
        />

      </svg>
    </IllusFrame>
  );
}
