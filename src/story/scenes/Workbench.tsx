import type { CSSProperties } from 'react';
import { Block, IllusDefs, IllusFrame, Shadow } from './illusParts';
import { Kid, KidLegs } from './Kid';
import { Teacher } from './Teacher';

const P = 'ch8';
/** The worktable: its front edge (x, y, width), plank thickness and depth. */
const TABLE = { x: 36, y: 222, w: 300, h: 10, d: { dx: 28, dy: -18 } } as const;
const GROUND = 272;
/** Kids lean on the table from behind: their waists on its back edge, their feet on the floor behind it. */
const KID_Y = 204.5;
const BACK_FLOOR = GROUND - 18;
/** The four kids, two boys and two girls: different ages (sizes), hair and skin; each looking (and tipping their head) at a build. */
const kids = [
  { x: 80, s: 0.95, skin: 2, hair: 'crop', hairTone: 2, shirt: 1, reach: 1, look: 1, tilt: 14, boy: true },
  { x: 164, s: 1.0, skin: 3, hair: 'curly', hairTone: 1, shirt: 2, reach: 0, look: -1, tilt: -14, glasses: true },
  { x: 246, s: 1.04, skin: 1, hair: 'crop', hairTone: 1, shirt: 4, reach: 0, look: 0.6, tilt: 10, boy: true },
  { x: 340, s: 0.92, skin: 2, hair: 'ponytail', hairTone: 1, shirt: 3, reach: -1, look: -1, tilt: -14 },
] as const;
const movable: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center bottom' };

/** The robot: its body's front face (x, y, w, h), depth, and wheels (centres, radius). */
const ROBOT = { x: 102, y: 190, w: 28, h: 17, d: { dx: 6, dy: -4 }, wheels: [107.5, 124.5], wheelY: 208.2, r: 6.2 } as const;
const R = ROBOT;

/** The house modelled on the workplane: front face, roof apex, depth. */
const HOUSE = { x: 306, y: 197, w: 18, h: 16, apex: 187, d: { dx: 7, dy: -4.5 } } as const;
const H = HOUSE;
const houseOutline = `M${H.x} ${H.y + H.h}V${H.y}L${H.x + H.w / 2} ${H.apex}L${H.x + H.w / 2 + H.d.dx} ${H.apex + H.d.dy}L${H.x + H.w + H.d.dx} ${H.y + H.d.dy}V${H.y + H.h + H.d.dy}L${H.x + H.w} ${H.y + H.h}Z`;

/**
 * Chapter 8 — while she waited for her first software role, she taught technology
 * (Roblox, programming, Arduino, Tinkercad) to around 150 students aged 9–16. A worktable
 * with four kids leaning on it (two boys, two girls, drawn like the ch 1 girl: varied ages, hair and skin), each
 * looking at what's on it: a small wheeled robot, a microcontroller board wired to an LED,
 * and a little house modelled on a 3D workplane. Beside the table stands their teacher, in a
 * hijab, looking at the kids. Behind them, faintly, a classroom board: a nod to ch 3's.
 * No numbers, no labels. The static markup is the finished state (all built, lights on).
 * Hooks: g[data-ch8-board] (the faint board), g[data-kid] (› g[data-kid-legs] under the
 * table), g[data-teacher], g[data-ch8-piece="0…3"] (the robot's wheels, body and antenna, in
 * build order; g[data-ch8-robot-shadow] its shadow), [data-ch8-robot-eyes] (its sensor eyes
 * lighting up), g[data-ch8-arduino] (the board), g[data-ch8-led-part] (the breadboard and
 * LED), path[data-ch8-wire][pathLength=1], [data-ch8-led] (its glow), [data-ch8-outline] (the
 * shape's outline on the workplane), g[data-ch8-shape] (the shape: rises from its base),
 * [data-ch8-pool="robot|arduino|shape"] (warm light on the table under each finished build).
 */
export function Workbench() {
  const T = TABLE;
  return (
    <IllusFrame name="workbench" size="lane-medium">
      <svg viewBox="-14 48 404 236" className="w-full overflow-visible">
        <IllusDefs p={P} />
        <defs>
          <linearGradient id={`${P}-slate`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="var(--board-slate-top)" />
            <stop offset="1" stopColor="var(--board-slate-bottom)" />
          </linearGradient>
          <radialGradient id={`${P}-led`}>
            <stop offset="0" stopColor="var(--illus-light-core)" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="var(--color-pink)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--color-pink)" stopOpacity="0" />
          </radialGradient>
          {/* The kids' shirts darken toward the waist, like the objects' plum → ink fronts. */}
          <linearGradient id={`${P}-shirt`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.35" stopColor="var(--illus-face-side)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--illus-face-side)" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* The classroom board behind them, faint: a nod to ch 3. */}
        <g data-ch8-board opacity={0.3}>
          <rect x="74" y="56" width="258" height="98" rx="4" fill="var(--illus-plank)" />
          <rect x="81" y="63" width="244" height="84" rx="2" fill={`url(#${P}-slate)`} />
          <path d="M104 82h26M140 82h40M104 104h34M150 104h22M104 126h48" stroke="var(--board-chalk-dim)" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="160" cy="82" rx="28" ry="10" fill="none" stroke="var(--board-chalk-pink)" strokeOpacity="0.5" strokeWidth="1.6" />
          <path d="M192 104q20 -10 40 -2l-6 -5m6 5l-7 3" fill="none" stroke="var(--board-chalk-dim)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M104 133h48" stroke="var(--board-chalk-peach)" strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="94" y="154" width="218" height="4" rx="1.5" fill="var(--illus-plank-2)" />
        </g>

        {/* The floor, the table's back legs. */}
        <Shadow p={P} cx={T.x + T.w / 2 + 14} cy={GROUND + 1} rx={190} ry={9} />
        <line x1="8" x2="392" y1={GROUND} y2={GROUND} stroke="var(--illus-ground)" strokeWidth="2" strokeLinecap="round" />
        <rect x={T.x + T.d.dx + 8} y={T.y + T.d.dy} width="6" height={GROUND - 18 - T.y - T.d.dy} fill="var(--illus-face-side)" />
        <rect x={T.x + T.w + T.d.dx - 14} y={T.y + T.d.dy} width="6" height={GROUND - 18 - T.y - T.d.dy} fill="var(--illus-face-side)" />

        {/* The kids' legs, under the table. */}
        {kids.map((k, i) => (
          <KidLegs key={i} x={k.x} y={KID_Y} s={k.s} floor={BACK_FLOOR} />
        ))}

        {/* The worktable. */}
        <Block x={T.x} y={T.y} w={T.w} h={T.h} d={T.d} front={`url(#${P}-front)`} />
        <rect x={T.x + 8} y={T.y + T.h} width="7" height={GROUND - T.y - T.h} fill={`url(#${P}-front)`} />
        <rect x={T.x + T.w - 15} y={T.y + T.h} width="7" height={GROUND - T.y - T.h} fill={`url(#${P}-front)`} />

        {/* Three kids leaning on the table from behind: different ages, hair and skin. */}
        {kids.map((k, i) => (
          <Kid key={i} kid={String(i)} y={KID_Y} shade={`url(#${P}-shirt)`} {...k} />
        ))}

        {/* Their teacher, beside the table, looking at them. */}
        <Teacher x={10} y={GROUND} s={1.12} shade={`url(#${P}-shirt)`} />

        {/* Warm light on the table under each finished build. */}
        <ellipse data-ch8-pool="robot" cx="118" cy="215" rx="30" ry="6" fill={`url(#${P}-warm)`} opacity={0.5} />
        <ellipse data-ch8-pool="arduino" cx="258" cy="212" rx="40" ry="7" fill={`url(#${P}-warm)`} opacity={0.5} />
        <ellipse data-ch8-pool="shape" cx="320" cy="212" rx="28" ry="6" fill={`url(#${P}-warm)`} opacity={0.5} />

        {/* 1 · A small wheeled robot, put together part by part; then its sensor eyes light. */}
        <g data-ch8-robot-shadow>
          <Shadow p={P} cx={118} cy={215.5} rx={17} ry={2.4} />
        </g>
        {R.wheels.map((cx, i) => (
          <g key={i} data-ch8-piece={i}>
            <circle cx={cx} cy={R.wheelY} r={R.r} fill="var(--illus-face-side)" stroke="var(--illus-line-dim)" strokeWidth="1" />
            <circle cx={cx} cy={R.wheelY} r="2" fill="var(--illus-line)" />
          </g>
        ))}
        <Block data-ch8-piece={2} x={R.x} y={R.y} w={R.w} h={R.h} d={R.d} front="var(--color-lilac)" top="var(--build-lilac-top)" side="var(--build-lilac-side)">
          {/* Its sensor: two round eyes on the front. */}
          {[R.x + 8.5, R.x + 19.5].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={R.y + 7.5} r="4" fill="var(--illus-face-side)" stroke="var(--illus-line)" strokeWidth="1" />
              <circle cx={cx} cy={R.y + 7.5} r="1.6" fill="var(--illus-glass-dark)" />
            </g>
          ))}
        </Block>
        <g data-ch8-piece={3}>
          <path d={`M${R.x + 22} ${R.y - 2}l3 -9`} stroke="var(--illus-line)" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx={R.x + 25.4} cy={R.y - 12} r="2.4" fill="var(--color-tangerine)" />
        </g>
        <g data-ch8-robot-eyes>
          {[R.x + 8.5, R.x + 19.5].map((cx) => (
            <circle key={cx} cx={cx} cy={R.y + 7.5} r="3" fill="var(--color-peach)" style={{ filter: 'var(--illus-glow-soft)' }} />
          ))}
        </g>

        {/* 2 · A microcontroller board wired to an LED on a small breadboard. */}
        <g data-ch8-arduino>
          <Shadow p={P} cx={246} cy={215.5} rx={26} ry={2.6} />
          <Block x={222} y={211} w={42} h={4} d={{ dx: 12, dy: -8 }} front="var(--build-board)" top="var(--build-board-top)" side="var(--build-board-side)" />
          <path d="M236 208.6l3.4 -2.3h13l-3.4 2.3Z" fill="var(--illus-face-side)" />
          <path d="M238 204.4h0M241.4 204.4h0M244.8 204.4h0M248.2 204.4h0M251.6 204.4h0M255 204.4h0" stroke="var(--illus-light-core)" strokeOpacity="0.8" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="218.4" y="206.6" width="6" height="4.6" rx="0.8" fill="var(--illus-line)" />
        </g>
        {/* The breadboard and its LED (the glow comes last, once the wires are in). */}
        <g data-ch8-led-part>
          <Block x={270} y={212} w={22} h={4} d={{ dx: 8, dy: -5 }} front="var(--illus-paper-shade)" top="var(--illus-paper)" side="var(--illus-paper-edge)" />
          <path d="M279.6 207v-6M282.4 207v-6" stroke="var(--illus-line)" strokeWidth="0.9" />
          <path d="M277.6 201v-5.2a3.4 3.4 0 0 1 6.8 0v5.2Z" fill="var(--color-pink)" />
          <path d="M278.8 197v-1.4a2.2 2.2 0 0 1 1.6 -2.1" fill="none" stroke="var(--illus-light-core)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
        <path data-ch8-wire="0" pathLength={1} d="M244.8 204.4C248 189 268 188 276 208" fill="none" stroke="var(--color-tangerine)" strokeWidth="1.6" strokeLinecap="round" />
        <path data-ch8-wire="1" pathLength={1} d="M251.6 204.4C256 193 276 192 286 208" fill="none" stroke="var(--color-lilac)" strokeWidth="1.6" strokeLinecap="round" />
        <circle data-ch8-led cx="281" cy="196" r="14" fill={`url(#${P}-led)`} />

        {/* 3 · A little house modelled on a 3D workplane: its outline first, then it rises. */}
        <path d="M292 216L306 207H350L336 216Z" fill="var(--build-plane)" />
        <path d="M303 216L317 207M314 216L328 207M325 216L339 207M299 211.5H343" stroke="var(--build-plane-grid)" strokeWidth="0.7" />
        <path data-ch8-outline d={houseOutline} fill="none" stroke="var(--illus-line)" strokeWidth="1" strokeDasharray="2.5 2" strokeLinejoin="round" />
        <g data-ch8-shape style={movable}>
          <path d={`M${H.x + H.w} ${H.y + H.h}L${H.x + H.w + H.d.dx} ${H.y + H.h + H.d.dy}V${H.y + H.d.dy}L${H.x + H.w} ${H.y}Z`} fill="var(--build-tangerine-side)" />
          <path d={`M${H.x + H.w / 2} ${H.apex}L${H.x + H.w / 2 + H.d.dx} ${H.apex + H.d.dy}L${H.x + H.w + H.d.dx} ${H.y + H.d.dy}L${H.x + H.w} ${H.y}Z`} fill="var(--build-tangerine-top)" />
          <path d={`M${H.x} ${H.y + H.h}V${H.y}L${H.x + H.w / 2} ${H.apex}L${H.x + H.w} ${H.y}V${H.y + H.h}Z`} fill="var(--color-tangerine)" />
          <rect x={H.x + 6.5} y={H.y + 7} width="5" height={H.h - 7} rx="0.8" fill="var(--build-tangerine-side)" />
          <circle cx={H.x + H.w / 2} cy={H.y - 1.4} r="2" fill="var(--build-tangerine-side)" />
        </g>
      </svg>
    </IllusFrame>
  );
}
