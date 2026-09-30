/**
 * Chapter 4: the path wavers between two directions, crosses back and forth,
 * and settles into one bright line that ends at a glowing figure (the Bagrut
 * score, from the chapter's story). Horizontal on desktop and portrait phones, vertical on
 * tablets and landscape phones — both built from the same (along, across) segments.
 *
 * Hooks: [data-scene-part="waver"] (each SVG), path[data-waver="lead"|"a"|"b"|"settled"]
 * (dash-draw them in that order),
 * [data-waver-reveal] (the dotted "a" is masked by this rect; translate it along the
 * route — data-axis, data-scale, data-end — to reveal "a" up to the drawing head),
 * [data-scene-part="figure"] (the glowing number). Decorative.
 * Without JS (and with reduced motion) everything is shown: the reveal rect covers the route.
 */
import { motion } from '@/motion/config';
import { waverRoute } from './waverRoute';

type Pt = readonly [along: number, across: number];
/** A path: a start point then cubic segments [c1, c2, end]. */
type Curve = { start: Pt; segs: ReadonlyArray<readonly [Pt, Pt, Pt]> };

const lead: Curve = { start: [0, 0], segs: [[[40, 0], [80, 0], [110, 0]]] };
const branchA: Curve = {
  start: [110, 0],
  segs: [
    [[160, 0], [175, -52], [235, -48]],
    [[290, -44], [290, 42], [345, 36]],
    [[385, 32], [392, 0], [425, 0]],
  ],
};
const branchB: Curve = {
  start: [110, 0],
  segs: [
    [[160, 0], [175, 50], [235, 46]],
    [[290, 42], [290, -40], [345, -34]],
    [[385, -30], [392, 0], [425, 0]],
  ],
};
const settled: Curve = { start: [425, 0], segs: [[[440, 0], [455, 0], [470, 0]]] };
const ROUTE_END = waverRoute.settled[1];

/**
 * Colour: the whole route is ONE continuous flow, lead → the alternatives → settled → 99.
 * Every piece (the dotted alternative too) is painted with the same gradient laid along
 * the route axis, so at each join both sides are the same colour by construction, and
 * the palette progresses gradually along the whole route, not per segment. Nothing dims
 * when the drawing completes: the finished state is the fully drawn state.
 * Stops are [along (route units, 0 → ${ROUTE_END}), colour token, opacity].
 */
type Stop = readonly [along: number, color: string, opacity: number];
const routeStops: readonly Stop[] = [
  [0, '--color-peach', 0.35], // rises out of the page
  [30, '--color-peach', 1],
  [150, '--color-peach', 1],
  [320, '--color-tangerine', 1],
  [470, '--color-pink', 1], // into the 99 (pink)
];
/** The dotted alternative: same colours, a lighter hand. */
const DOTTED_OPACITY = 0.7;

type Map2 = (p: Pt) => readonly [number, number];
const toPath = (c: Curve, m: Map2) =>
  `M${m(c.start).join(' ')}` + c.segs.map(([a, b, e]) => `C${m(a).join(' ')} ${m(b).join(' ')} ${m(e).join(' ')}`).join('');

function WaverSvg({ figure, orientation, idSuffix }: { figure: string; orientation: 'h' | 'v'; idSuffix: string }) {
  const h = orientation === 'h';
  // Desktop: along → x, across → y. Phones: along → y (a little compressed), across → x.
  const m: Map2 = h ? ([a, c]) => [a, 70 + c] : ([a, c]) => [90 + c * 0.9, Math.round(a * 0.62)];
  const vb = h ? '0 0 600 140' : '0 0 180 370';
  const figurePos = h ? { x: 480, y: 70, anchor: 'start' as const } : { x: 90, y: 336, anchor: 'middle' as const };
  // Unique per copy: a gradient in a hidden (display: none) twin doesn't paint.
  const gradientId = `waver-${orientation}${idSuffix}`;
  const revealId = `waver-reveal-${orientation}${idSuffix}`;
  const revealGradId = `waver-reveal-grad-${orientation}${idSuffix}`;
  // The reveal rect along the route: from before the start to past the end (+ its soft edge).
  const along = h ? 1 : 0.62;
  const soft = motion.story.waver.revealSoft;
  const r0 = -soft * along;
  const r1 = (ROUTE_END + soft) * along;
  /** A gradient along the route axis (user space), with stops in route units. */
  const routeGradient = (id: string, stops: readonly Stop[]) => {
    const [a0, a1] = [stops[0]![0], stops[stops.length - 1]![0]];
    const ends = h ? { x1: a0, x2: a1, y1: 0, y2: 0 } : { x1: 0, x2: 0, y1: a0 * along, y2: a1 * along };
    return (
      <linearGradient id={id} gradientUnits="userSpaceOnUse" {...ends}>
        {stops.map(([at, color, opacity]) => (
          <stop key={at} offset={(at - a0) / (a1 - a0)} stopColor={`var(${color})`} stopOpacity={opacity} />
        ))}
      </linearGradient>
    );
  };
  const rect = h ? { x: r0, width: r1 - r0, y: -40, height: 220 } : { y: r0, height: r1 - r0, x: -40, width: 260 };
  return (
    <svg
      data-scene-part="waver"
      viewBox={vb}
      className={
        h
          ? 'hidden w-full max-w-[600px] overflow-visible max-md:portrait:block lg:block'
          : 'w-[160px] overflow-visible max-md:portrait:hidden lg:hidden'
      }
    >
      <defs>
        {routeGradient(gradientId, routeStops)}
        <linearGradient id={revealGradId} {...(h ? { x1: 0, x2: 1, y1: 0, y2: 0 } : { x1: 0, x2: 0, y1: 0, y2: 1 })}>
          <stop offset={1 - (soft * along) / (r1 - r0)} stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity={0} />
        </linearGradient>
        <mask id={revealId} maskUnits="userSpaceOnUse" x={-100} y={-100} width={800} height={600}>
          <rect data-waver-reveal data-axis={h ? 'x' : 'y'} data-scale={along} data-end={r1} {...rect} fill={`url(#${revealGradId})`} />
        </mask>
      </defs>
      <g fill="none" strokeLinecap="round">
        {/* Butt caps on the lead: no doubled round cap where it meets the fork. */}
        <path data-waver="lead" d={toPath(lead, m)} stroke={`url(#${gradientId})`} strokeWidth={4} strokeLinecap="butt" />
        <path data-waver="a" d={toPath(branchA, m)} stroke={`url(#${gradientId})`} strokeWidth={3} opacity={DOTTED_OPACITY} strokeDasharray="1 9" mask={`url(#${revealId})`} />
        <path data-waver="b" d={toPath(branchB, m)} stroke={`url(#${gradientId})`} strokeWidth={4} />
        <path data-waver="settled" d={toPath(settled, m)} stroke={`url(#${gradientId})`} strokeWidth={4} />
      </g>
      <text
        data-scene-part="figure"
        x={figurePos.x}
        y={figurePos.y}
        textAnchor={figurePos.anchor}
        dominantBaseline="central"
        className="font-display"
        fontSize={h ? 76 : 64}
        fontWeight={800}
        letterSpacing={-3}
        fill="var(--color-pink)"
        style={{ filter: 'drop-shadow(0 0 16px var(--color-pink))' }}
      >
        {figure}
      </text>
    </svg>
  );
}

/**
 * Both orientations by default (CSS shows the horizontal one from lg and on portrait phones,
 * the vertical one on tablets and landscape phones). `only` renders one: ch 4 places the
 * horizontal route beside its line on desktop, and both in the flow below lg (`idSuffix`
 * keeps that copy's paint ids apart from the desktop one's).
 */
export function Waver({ figure, only, idSuffix = '' }: { figure: string; only?: 'h' | 'v'; idSuffix?: string }) {
  return (
    <div aria-hidden="true" className="relative">
      {only !== 'v' && <WaverSvg figure={figure} orientation="h" idSuffix={idSuffix} />}
      {only !== 'h' && <WaverSvg figure={figure} orientation="v" idSuffix={idSuffix} />}
    </div>
  );
}
