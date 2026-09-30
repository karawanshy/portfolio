import { IllusDefs, IllusFrame } from './illusParts';
import { DETOUR_BEND } from './illusData';

const P = 'ch14';
const HORIZON = 96;
const NEAR = 340;
const ROAD = { nearL: 112, nearR: 248, farL: 176, farR: 184, far: HORIZON + 2 } as const;
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Road half-width at a given depth (y): wide in the foreground, a point on the horizon. */
const halfWidth = (y: number) => 0.6 + (16.4 * (y - ROAD.far)) / (NEAR - ROAD.far);

/**
 * The wanted lane's centre dashes, in perspective: each dash is a quad that shrinks
 * (in length and width) toward the horizon. One path.
 */
const laneDashes = (() => {
  let d = '';
  let y = 296;
  while (y - HORIZON > 10) {
    const k = (y - HORIZON) / (NEAR - HORIZON); // 1 near → 0 at the horizon
    const len = 26 * k;
    const w = 0.4 + 2.4 * k;
    const y2 = y - len;
    const k2 = (y2 - HORIZON) / (NEAR - HORIZON);
    const w2 = 0.4 + 2.4 * k2;
    d += `M${r1(180 - w)} ${r1(y)}H${r1(180 + w)}L${r1(180 + w2)} ${r1(y2)}H${r1(180 - w2)}Z`;
    y = y2 - 22 * k;
  }
  return d;
})();

/**
 * The side road as a ground surface: the bend's centre line (DETOUR_BEND, sampled and
 * carried on to its vanishing point on the horizon) offset to both sides by the road's
 * perspective width, so it branches off at a junction and tapers toward the horizon.
 * Returns the surface and its two edges.
 */
const branch = (() => {
  type P2 = [number, number];
  const cubic = (a: P2, b: P2, c: P2, d: P2, t: number): P2 => {
    const u = 1 - t;
    return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
  };
  const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  // DETOUR_BEND.d: M180 340 L180 314 C 180 290, 150 278, 136 250 L 64 98 (= `vanish`).
  const pts: P2[] = [];
  for (let i = 0; i < 3; i++) pts.push(lerp([180, 340], [180, 314], i / 3));
  for (let i = 0; i < 12; i++) pts.push(cubic([180, 314], [180, 290], [150, 278], [136, 250], i / 12));
  for (let i = 0; i <= 14; i++) pts.push(lerp([136, 250], [...DETOUR_BEND.vanish], i / 14));
  const left: P2[] = [];
  const right: P2[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const [tx, ty] = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(tx, ty);
    const [nx, ny] = [-ty / len, tx / len];
    const w = halfWidth(p[1]);
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  });
  const line = (ps: P2[]) => ps.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('');
  return { surface: `${line(left)}${line([...right].reverse()).replace('M', 'L')}Z`, edges: `${line(left)}${line(right)}` };
})();

const mainRoad = `M${ROAD.nearL} ${NEAR}L${ROAD.farL} ${ROAD.far}H${ROAD.farR}L${ROAD.nearR} ${NEAR}Z`;

/**
 * Chapter 14 — she wanted backend and was moved into frontend infrastructure; it
 * felt like the wrong direction. A small landscape vignette: a toned ground plane under
 * a low line of hills, a road in perspective whose straight lane (the one she wanted)
 * runs on to the horizon and fades out; at a junction a side road branches off and
 * tapers to its own vanishing point, and the lit way (a peach illustration line) is its
 * centre line. A blank signpost stands at the fork. MEDIUM: restrained, its right side clear.
 * Hooks: [data-fork="ground|hills"], [data-fork="surface"] (the main road),
 * [data-fork="road"] (its edges), [data-fork="straight"] (the wanted lane's dashes),
 * [data-fork="branch"] (the side road: surface + edges), [data-fork="bend"] (the lit
 * way; dash-draw it), [data-fork="sign"].
 */
export function Fork() {
  return (
    <IllusFrame name="fork" size="lane-medium">
      <svg viewBox="0 0 360 340" className="w-full overflow-visible">
        <IllusDefs p={P} />
        <defs>
          {/* userSpaceOnUse: zero-width edges would otherwise lose a bounding-box gradient. */}
          <linearGradient id={`${P}-fade`} gradientUnits="userSpaceOnUse" x1="0" y1={NEAR} x2="0" y2={HORIZON}>
            <stop offset="0" stopColor="var(--color-lilac)" stopOpacity="0.7" />
            <stop offset="1" stopColor="var(--color-lilac)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id={`${P}-surface`} gradientUnits="userSpaceOnUse" x1="0" y1={NEAR} x2="0" y2={HORIZON}>
            <stop offset="0" stopColor="var(--illus-road)" />
            <stop offset="1" stopColor="var(--illus-road-far)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id={`${P}-hills`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--illus-hills)" />
            <stop offset="1" stopColor="var(--illus-hills)" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id={`${P}-ground`} gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON} x2="0" y2={NEAR}>
            <stop offset="0" stopColor="var(--illus-road-far)" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="var(--illus-hills)" stopOpacity="0.4" />
            <stop offset="1" stopColor="var(--illus-hills)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${P}-sides`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--color-cream)" stopOpacity="0" />
            <stop offset="0.18" stopColor="var(--color-cream)" />
            <stop offset="0.82" stopColor="var(--color-cream)" />
            <stop offset="1" stopColor="var(--color-cream)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${P}-horizon`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--color-peach)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--color-peach)" stopOpacity="0.45" />
            <stop offset="1" stopColor="var(--color-peach)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${P}-lit`} gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2={DETOUR_BEND.vanish[1]}>
            <stop offset="0" stopColor="var(--color-peach)" />
            {/* Still visible at the vanishing point: the lit way reaches the end of the road. */}
            <stop offset="1" stopColor="var(--color-peach)" stopOpacity="0.45" />
          </linearGradient>
          <mask id={`${P}-sides-mask`} maskContentUnits="userSpaceOnUse">
            <rect x="0" y="60" width="360" height="290" fill={`url(#${P}-sides)`} />
          </mask>
          {/* Everything outside the main road (the branch's edges stop at the junction). */}
          <clipPath id={`${P}-off-road`}>
            <path d={`M0 0H360V${NEAR}H0Z${mainRoad}`} clipRule="evenodd" />
          </clipPath>
        </defs>

        {/* The land: a toned ground plane under low hills, fading at its sides. */}
        <g mask={`url(#${P}-sides-mask)`}>
          <path data-fork="ground" d={`M10 ${HORIZON}H350L360 ${NEAR}H0Z`} fill={`url(#${P}-ground)`} />
          <path
            data-fork="hills"
            d={`M10 ${HORIZON}C50 ${HORIZON - 12} 84 ${HORIZON - 18} 124 ${HORIZON - 8}C150 ${HORIZON - 2} 170 ${HORIZON - 12} 204 ${HORIZON - 15}C244 ${HORIZON - 18} 296 ${HORIZON - 6} 350 ${HORIZON}Z`}
            fill={`url(#${P}-hills)`}
          />
          <rect x="10" y={HORIZON - 1} width="340" height="2" fill={`url(#${P}-horizon)`} />
        </g>

        {/* The main road: its surface, its edges, and the wanted lane fading to the horizon. */}
        <path data-fork="surface" d={mainRoad} fill={`url(#${P}-surface)`} />
        <path data-fork="road" d={`M${ROAD.nearL} ${NEAR}L${ROAD.farL} ${ROAD.far}M${ROAD.nearR} ${NEAR}L${ROAD.farR} ${ROAD.far}`} fill="none" stroke={`url(#${P}-fade)`} strokeWidth="2" strokeLinecap="round" />
        <path data-fork="straight" d={laneDashes} fill={`url(#${P}-fade)`} />

        {/* The side road: a surface that opens the main road's edge at the junction and tapers away. */}
        <g data-fork="branch">
          <path d={branch.surface} fill={`url(#${P}-surface)`} />
          <path d={branch.edges} fill="none" stroke={`url(#${P}-fade)`} strokeWidth="1.8" strokeLinecap="round" clipPath={`url(#${P}-off-road)`} />
        </g>

        {/* A blank signpost at the fork: one board toward the horizon, one (lit) toward the side road. */}
        <g data-fork="sign">
          <ellipse cx="104" cy="301" rx="12" ry="3" fill={`url(#${P}-shadow)`} />
          <rect x="102.3" y="246" width="3.4" height="55" rx="1" fill="var(--illus-face-top)" />
          <path d="M102.8 246.5V300" stroke="var(--illus-edge-hi)" strokeWidth="0.8" />
          <path d="M106 250H124L130 255L124 260H106Z" fill="var(--illus-face-front)" stroke="var(--illus-edge-hi)" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M102 264H84L78 269L84 274H102Z" fill="var(--illus-face-front)" stroke="var(--color-peach)" strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
        </g>

        {/* The lit way: the side road's centre line — an illustration stroke (peach). */}
        <path
          data-fork="bend"
          d={DETOUR_BEND.d}
          fill="none"
          stroke={`url(#${P}-lit)`}
          strokeWidth="2.6"
          strokeLinecap="round"
          style={{ filter: 'var(--illus-glow-soft)' }}
        />
      </svg>
    </IllusFrame>
  );
}
