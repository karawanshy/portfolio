import { Fragment } from 'react';
import { IllusDefs, IllusFrame } from './illusParts';
import { r1, seeded } from './rng';

const P = 'ch9';
const W = 400;
const GROUND = 292;

/**
 * A head: a circle as two arcs, drawn clockwise like every other part of a silhouette (so where
 * the parts overlap they add up; opposite windings would cut holes).
 */
const circle = (cx: number, cy: number, r: number) => `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 1 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 1 ${r1(-2 * r)} 0`;

/** Hair outlines that make each silhouette read as a person: none, a bun, a ponytail, long hair. */
type Hair = 0 | 1 | 2 | 3;

/** One person's silhouette (shoulders, neck, head, hair) standing at (x, y), scale s. */
function person(x: number, y: number, s: number, hair: Hair, broad: number): string {
  const q = (dx: number, dy: number) => `${r1(x + dx * s)} ${r1(y + dy * s)}`;
  const w = 14 * broad;
  let d =
    `M${q(-w, 0)}V${r1(y - 20 * s)}Q${q(-w, -29)} ${q(-5, -30)}H${r1(x + 5 * s)}Q${q(w, -29)} ${q(w, -20)}V${r1(y)}Z` +
    `M${q(-3, -29)}V${r1(y - 35 * s)}H${r1(x + 3 * s)}V${r1(y - 29 * s)}Z` +
    circle(x, y - 42 * s, 8.6 * s);
  if (hair === 1) d += circle(x, y - 52.4 * s, 3.8 * s);
  if (hair === 2) d += circle(x + 8.6 * s, y - 41 * s, 3.4 * s) + circle(x + 10 * s, y - 36 * s, 2.8 * s);
  if (hair === 3) d += `M${q(8.8, -42)}L${q(10.4, -29)}H${r1(x - 10.4 * s)}L${q(-8.8, -42)}Z`;
  return d;
}

interface Row {
  /** Where the row stands, its scale, and the spacing between people. */
  y: number;
  s: number;
  step: number;
  fill: string;
}
/** Far to near: the crowd gets larger, darker and sparser as it comes forward. */
const ROWS: Row[] = [
  { y: 184, s: 0.5, step: 15, fill: 'var(--crowd-far)' },
  { y: 212, s: 0.68, step: 20, fill: 'var(--crowd-mid)' },
  { y: 246, s: 0.86, step: 27, fill: 'var(--crowd-near)' },
  { y: GROUND, s: 1.08, step: 36, fill: 'var(--crowd-front)' },
];
/** The people who light up (row, index in the row), in the order they do. */
const PICKS: ReadonlyArray<readonly [number, number]> = [
  [2, 4],
  [1, 14],
  [3, 6],
];

const crowd = (() => {
  const rand = seeded(9);
  const rows = ROWS.map((row, ri) => {
    const people: { d: string; x: number; s: number }[] = [];
    for (let x = -8 + (ri % 2 ? row.step / 2 : 0); x < W + 8; x += row.step) {
      const px = x + (rand() - 0.5) * row.step * 0.35;
      const s = row.s * (0.9 + rand() * 0.18);
      const hair = Math.floor(rand() * 4) as Hair;
      people.push({ d: person(px, row.y + (rand() - 0.5) * 3, s, hair, 0.9 + rand() * 0.2), x: px, s });
    }
    return people;
  });
  // Beyond the rows: many more, as a band of tiny heads fading into the dark.
  let far = '';
  for (let x = 4; x < W; x += 6.5) far += circle(x + (rand() - 0.5) * 3, 156 + (rand() - 0.5) * 5, 2.8 + rand() * 0.8);
  // …on a soft base that fades in from nothing at the top.
  far += `M0 150H${W}V184H0Z`;
  return { rows, far };
})();

/**
 * Chapter 9 — Place-IL: more than 2,000 people applied and around 50 were selected. A crowd
 * of people as dark silhouettes, row upon row into the distance (and beyond the rows, a band
 * of many more), and as the chapter plays a few of them, at different depths, light up: warm
 * from above, a glow round them, light at their feet. No numbers in the art.
 * MEDIUM. One composition on every size.
 * Hooks: g[data-crowd-row="0…3"] (far → near; each ONE path of silhouettes), [data-crowd-far],
 * g[data-crowd-pick="0…2"] (the light round each chosen person, in lighting order) ›
 * [data-pick-part="beam|halo|pool"]; path[data-pick-part="lit"][data-pick="0…2"] (the person, lit).
 */
export function Crowd() {
  return (
    <IllusFrame name="crowd" size="lane-medium">
      <svg viewBox={`0 0 ${W} 310`} className="w-full overflow-visible">
        <IllusDefs p={P} />
        <defs>
          <linearGradient id={`${P}-lit`} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0" stopColor="var(--color-peach)" />
            <stop offset="0.5" stopColor="var(--color-peach)" />
            <stop offset="1" stopColor="var(--color-tangerine)" />
          </linearGradient>
          <linearGradient id={`${P}-beam`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--illus-spot-beam)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--illus-spot-beam)" stopOpacity="0.28" />
          </linearGradient>
          {/* The crowd fades out at the sides rather than being cut by the frame. */}
          <linearGradient id={`${P}-sides`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.12" stopColor="white" />
            <stop offset="0.88" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${P}-mask`} maskUnits="userSpaceOnUse" x="0" y="-40" width={W} height="360">
            <rect x="0" y="-40" width={W} height="360" fill={`url(#${P}-sides)`} />
          </mask>
          <linearGradient id={`${P}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--crowd-far)" stopOpacity="0" />
            <stop offset="0.3" stopColor="var(--crowd-far)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--crowd-far)" stopOpacity="0.8" />
          </linearGradient>
          {/* …and the front row's shoulders fade out at the bottom rather than ending in a hard line. */}
          <linearGradient id={`${P}-foot`} gradientUnits="userSpaceOnUse" x1="0" y1="262" x2="0" y2="294">
            <stop offset="0" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${P}-foot-mask`} maskUnits="userSpaceOnUse" x="0" y="-40" width={W} height="360">
            <rect x="0" y="-40" width={W} height="360" fill={`url(#${P}-foot)`} />
          </mask>
        </defs>

        <g mask={`url(#${P}-mask)`}>
        <g mask={`url(#${P}-foot-mask)`}>
        <path data-crowd-far d={crowd.far} fill={`url(#${P}-fade)`} />
        {ROWS.map((row, ri) => (
          <Fragment key={ri}>
            {/* The light behind a chosen person in this row (behind the row itself). */}
            {PICKS.map(([pr, pi], k) => {
              if (pr !== ri) return null;
              const who = crowd.rows[ri]![pi]!;
              return (
                <g key={k} data-crowd-pick={k}>
                  <path data-pick-part="beam" d={`M${r1(who.x - 12 * who.s)} -30H${r1(who.x + 12 * who.s)}L${r1(who.x + 24 * who.s)} ${row.y}H${r1(who.x - 24 * who.s)}Z`} fill={`url(#${P}-beam)`} />
                  <ellipse data-pick-part="halo" cx={r1(who.x)} cy={r1(row.y - 30 * who.s)} rx={r1(34 * who.s)} ry={r1(40 * who.s)} fill={`url(#${P}-halo)`} />
                  <ellipse data-pick-part="pool" cx={r1(who.x)} cy={r1(row.y)} rx={r1(28 * who.s)} ry={r1(5 * who.s)} fill={`url(#${P}-warm)`} />
                </g>
              );
            })}
            <path data-crowd-row={ri} d={crowd.rows[ri]!.map((p) => p.d).join('')} fill={row.fill} />
            {PICKS.map(([pr, pi], k) =>
              pr === ri ? (
                <path
                  key={k}
                  data-pick-part="lit"
                  data-pick={k}
                  d={crowd.rows[ri]![pi]!.d}
                  fill={`url(#${P}-lit)`}
                  style={{ filter: 'var(--illus-glow-warm)' }}
                />
              ) : null,
            )}
          </Fragment>
        ))}
        </g>
        </g>
      </svg>
    </IllusFrame>
  );
}
