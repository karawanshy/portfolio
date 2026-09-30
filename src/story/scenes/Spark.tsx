import { IllusDefs, IllusFrame, Shadow } from './illusParts';

/** Where the warm glows hang round her (viewBox 320 × 240), and how large each is. */
const glows = [
  [46, 124, 0.85],
  [88, 62, 1],
  [160, 36, 1.1],
  [232, 62, 1],
  [274, 124, 0.85],
] as const;
const PED = { x: 160, top: 188, h: 20, rx: 34, ry: 8.5 } as const;
/** The girl is drawn at 1:1 round her feet (x 160, y 188), then scaled up from there. */
const GIRL_SCALE = 1.45;
/** Where every spotlight is aimed: the girl's middle (38 units above her feet, before scaling). */
const AIM = { x: 160, y: PED.top - 38 * GIRL_SCALE } as const;
/** Each beam's half-width where it reaches her. */
const BEAM_W = 24;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A cone from a glow to the girl: apex at the light, widening to BEAM_W past her middle. */
function beam(x: number, y: number) {
  const dx = AIM.x - x;
  const dy = AIM.y - y;
  const len = Math.hypot(dx, dy);
  // Carry the cone a little past her middle so its wide end falls on her and the pedestal.
  const ex = AIM.x + (dx / len) * 18;
  const ey = AIM.y + (dy / len) * 18;
  const nx = (-dy / len) * BEAM_W;
  const ny = (dx / len) * BEAM_W;
  return `M${r1(x)} ${r1(y)}L${r1(ex + nx)} ${r1(ey + ny)}L${r1(ex - nx)} ${r1(ey - ny)}Z`;
}

/** The girl: a young kid in a dress, pigtails, looking up. Her shaded base, then her lit side (an overlay). */
function Girl({ p }: { p: string }) {
  const skin = { fill: 'var(--illus-skin)' };
  return (
    <g data-girl transform={`translate(${PED.x} ${PED.top}) scale(${GIRL_SCALE}) translate(${-PED.x} ${-PED.top})`}>
      <Shadow p={p} cx={161} cy={187.5} rx={15} ry={2.6} />
      {/* Legs and shoes. */}
      <rect x="154" y="167" width="4.6" height="19" rx="2.2" fill="var(--illus-skin-shade)" />
      <rect x="161.4" y="167" width="4.6" height="19" rx="2.2" fill="var(--illus-skin-shade)" />
      <path d="M152.2 187.4c0-2.8 1.6-4 4.2-4s3.6 1.4 3.6 4Z" fill="var(--illus-hair)" />
      <path d="M160.2 187.4c0-2.8 1.4-4 3.8-4s4 1.4 4 4Z" fill="var(--illus-hair)" />
      {/* The dress, her arms, the puffed sleeves and the collar. */}
      <path d="M152 141.5h16c2.2 0 3.6 1.4 4.2 3.6l7.6 24.4c-12.8 4-26.8 4-39.6 0l7.6-24.4c.6-2.2 2-3.6 4.2-3.6Z" fill={`url(#${p}-dress)`} />
      <path d="M140.6 169.4c12.8 4 26 4 38.8 0" fill="none" stroke="var(--illus-dress-trim)" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M149 146.5l-5 16.5M171 146.5l5 16.5" stroke="var(--illus-skin)" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="143.6" cy="164" r="2.4" {...skin} />
      <circle cx="176.4" cy="164" r="2.4" fill="var(--illus-skin-shade)" />
      <ellipse cx="149.6" cy="145.4" rx="4.6" ry="4" fill="var(--illus-dress)" />
      <ellipse cx="170.4" cy="145.4" rx="4.6" ry="4" fill="var(--illus-dress-shade)" />
      <path d="M154.6 141.6l5.4 4.2l5.4-4.2" fill="none" stroke="var(--illus-dress-trim)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Neck and head, tipped up toward the lights. */}
      <rect x="157.6" y="136" width="4.8" height="7" rx="2" fill="var(--illus-skin-shade)" />
      <circle cx="160" cy="128" r="10.4" {...skin} />
      {/* Pigtails with their ties, then the hair over the top and the fringe. */}
      <path d="M149.6 124.6c-5.2-.6-8.6 2.6-8.4 7.4c.2 4 2.6 6.6 5 8.2c-.6-3.6.8-6.8 3.8-8.8Z" fill="var(--illus-hair)" />
      <path d="M170.4 124.6c5.2-.6 8.6 2.6 8.4 7.4c-.2 4-2.6 6.6-5 8.2c.6-3.6-.8-6.8-3.8-8.8Z" fill="var(--illus-hair)" />
      <circle cx="149.4" cy="125.6" r="1.9" fill="var(--color-pink)" />
      <circle cx="170.6" cy="125.6" r="1.9" fill="var(--color-pink)" />
      <path d="M149.2 129.4c-1.4-8.6 4-13.4 10.8-13.4s12.2 4.8 10.8 13.4c-1.2-3.4-3.2-5.8-6-6.8c-3 2.4-7.8 3.4-12 3.2c-1.6.8-2.8 2-3.6 3.6Z" fill="var(--illus-hair)" />
      {/* Face: eyes up, rosy cheeks, a small smile. */}
      <circle cx="156.2" cy="128.6" r="1.1" fill="var(--illus-hair)" />
      <circle cx="163.8" cy="128.6" r="1.1" fill="var(--illus-hair)" />
      <circle cx="154" cy="132.4" r="1.8" fill="var(--color-pink)" opacity={0.4} />
      <circle cx="166" cy="132.4" r="1.8" fill="var(--color-pink)" opacity={0.4} />
      <path d="M157.8 133.2q2.2 1.8 4.4 0" fill="none" stroke="var(--illus-skin-shade)" strokeWidth="1" strokeLinecap="round" />

      {/* Her lit side: the light from above catches her hair, face and shoulders. */}
      <g data-girl-lit>
        <path d="M152 121.6c2-3.2 4.6-4.4 8-4.4s6 1.2 8 4.4c-2.4-2-5-2.8-8-2.8s-5.6.8-8 2.8Z" fill="var(--illus-light-core)" opacity={0.35} />
        <circle cx="160" cy="130" r="8.6" fill="var(--color-peach)" opacity={0.28} />
        <path d="M152 141.5h16c2.2 0 3.6 1.4 4.2 3.6l2 6.4c-7.2-2-19.2-2-26.4 0l2-6.4c.6-2.2 2-3.6 4.2-3.6Z" fill="var(--color-peach)" opacity={0.4} />
      </g>
    </g>
  );
}

/**
 * Chapter 1 — people saw something in her before she did. A young girl stands on a
 * low stone pedestal; five warm lights hang round her, each casting a spotlight on her,
 * so where their beams meet she is lit from every side, a bright pool at her feet.
 * QUIET (the small frame).
 * Hooks: g[data-glow="i"] (each light), g[data-beam="i"] (its spotlight), g[data-girl]
 * (› [data-girl-lit], her lit side), [data-spark-pool] (where their light meets), [data-pedestal].
 */
export function Spark() {
  const p = 'ch1';
  return (
    <IllusFrame name="spark" size="small">
      <svg viewBox="0 0 320 240" className="w-full overflow-visible">
        <IllusDefs p={p} />
        <defs>
          <linearGradient id={`${p}-stone`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--illus-face-front)" />
            <stop offset="0.45" stopColor="var(--illus-face-top)" />
            <stop offset="1" stopColor="var(--illus-face-side)" />
          </linearGradient>
          <linearGradient id={`${p}-dress`} x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0" stopColor="var(--illus-dress)" />
            <stop offset="1" stopColor="var(--illus-dress-shade)" />
          </linearGradient>
          {glows.map(([x, y], i) => (
            <linearGradient key={i} id={`${p}-beam-${i}`} gradientUnits="userSpaceOnUse" x1={x} y1={y} x2={AIM.x} y2={AIM.y + 20}>
              <stop offset="0" stopColor="var(--illus-spot-beam)" stopOpacity="0.5" />
              <stop offset="0.7" stopColor="var(--illus-spot-beam)" stopOpacity="0.2" />
              <stop offset="1" stopColor="var(--illus-spot-beam)" stopOpacity="0.06" />
            </linearGradient>
          ))}
        </defs>

        {/* The ground and the pedestal's shadow. */}
        <ellipse cx={PED.x} cy={PED.top + PED.h + 2} rx="128" ry="14" fill={`url(#${p}-halo)`} opacity={0.35} />
        <Shadow p={p} cx={PED.x + 6} cy={PED.top + PED.h + 1} rx={PED.rx + 22} ry={7} />

        {/* Where their light meets: a bright pool round her. */}
        <ellipse data-spark-pool cx={AIM.x} cy={AIM.y + 6} rx="58" ry="62" fill={`url(#${p}-warm)`} opacity={0.5} />

        {/* The spotlights, each from its light to her (behind her). */}
        {glows.map(([x, y], i) => (
          <g key={i} data-beam={i}>
            <path d={beam(x, y)} fill={`url(#${p}-beam-${i})`} />
          </g>
        ))}

        {/* The lights round her. */}
        {glows.map(([x, y, s], i) => (
          <g key={i} data-glow={i}>
            <circle cx={x} cy={y} r={r1(26 * s)} fill={`url(#${p}-halo)`} />
            <circle cx={x} cy={y} r={r1(13 * s)} fill={`url(#${p}-warm)`} />
            <circle cx={x} cy={y} r={r1(4 * s)} fill="var(--illus-light-core)" style={{ filter: 'var(--illus-glow-soft)' }} />
          </g>
        ))}

        {/* The pedestal: a short stone drum, lit from above, a pool of light on its top. */}
        <g data-pedestal>
          <path
            d={`M${PED.x - PED.rx} ${PED.top}V${PED.top + PED.h}A${PED.rx} ${PED.ry} 0 0 0 ${PED.x + PED.rx} ${PED.top + PED.h}V${PED.top}Z`}
            fill={`url(#${p}-stone)`}
          />
          <ellipse cx={PED.x} cy={PED.top} rx={PED.rx} ry={PED.ry} fill="var(--illus-face-top)" />
          <path d={`M${PED.x - PED.rx + 1} ${PED.top}A${PED.rx - 1} ${PED.ry - 1} 0 0 1 ${PED.x + PED.rx - 1} ${PED.top}`} fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1" />
          <path d={`M${PED.x - PED.rx} ${PED.top + 5}A${PED.rx} ${PED.ry} 0 0 0 ${PED.x + PED.rx} ${PED.top + 5}`} fill="none" stroke="var(--illus-edge-lo)" strokeWidth="1" />
          <ellipse data-spark-pool cx={PED.x} cy={PED.top} rx={PED.rx - 4} ry={PED.ry - 2} fill={`url(#${p}-warm)`} opacity={0.5} />
        </g>

        <Girl p={p} />
      </svg>
    </IllusFrame>
  );
}
