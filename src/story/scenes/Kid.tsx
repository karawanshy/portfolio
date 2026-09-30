/**
 * A child from the waist up, drawn like the ch 1 girl (the same head, face and proportions),
 * leaning on a table (ch 8's worktable): drawn over the table with the waist on its back
 * edge, forearms resting on the top (or one reaching across it).
 * Local origin (0, 0) = the middle of the waist; the drawing reaches about 58 units up.
 * Decorative (inside an aria-hidden illustration).
 */

type Skin = 1 | 2 | 3;
type Hair = 'short' | 'ponytail' | 'curly' | 'crop';

const skins: Record<Skin, [string, string]> = {
  1: ['var(--illus-skin)', 'var(--illus-skin-shade)'],
  2: ['var(--illus-skin-2)', 'var(--illus-skin-2-shade)'],
  3: ['var(--illus-skin-3)', 'var(--illus-skin-3-shade)'],
};

/** A short crop, cut close above the ears, with a spiky fringe. */
const CROP = 'M-10.4 -46C-11 -55 -5 -59.6 0 -59.6S11 -55 10.4 -46C9.2 -49.8 7 -52.2 4.2 -52.8L2.6 -50.8L.6 -53.2L-1.6 -50.8L-3.6 -53C-6.8 -52.4 -9 -50 -10.4 -46Z';
/** The top of the head: a cap of hair with a side-swept fringe. */
const CAP = 'M-10.2 -44.6c-1.2-9.4 4.2-13.8 10.2-13.8s11.4 4.4 10.2 13.8c-1.4-3.6-3.8-6-7.4-6.6c-3.6 2.8-8.6 3.6-13 6.6Z';

function HairShape({ hair, fill }: { hair: Hair; fill: string }) {
  switch (hair) {
    case 'ponytail':
      return (
        <g fill={fill}>
          <path d="M7.6 -54c7.4 .6 10.6 7.6 8.6 15.4c-.8 3.2-2.6 5.6-4.6 6.8c1.4-6.2.6-11.8-4-16.2Z" />
          <path d={CAP} />
        </g>
      );
    case 'curly':
      return (
        <g fill={fill}>
          {(
            [
              [-9.6, -49, 4.4],
              [-5.4, -55, 4.6],
              [0.6, -57.4, 4.6],
              [6.4, -55, 4.6],
              [10, -49, 4.4],
              [-11, -43, 3.6],
              [11.2, -43, 3.6],
            ] as const
          ).map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case 'crop':
      // A boy's short crop: close to the head, a spiky fringe, the ears showing.
      return <path d={CROP} fill={fill} />;
    default:
      return <path d={CAP} fill={fill} />;
  }
}

export function Kid({
  x,
  y,
  s = 1,
  skin = 1,
  hair = 'short',
  hairTone = 1,
  shirt = 1,
  reach = 0,
  look = 0,
  tilt = 0,
  glasses = false,
  boy = false,
  shade: shirtShade,
  kid,
}: {
  x: number;
  y: number;
  s?: number;
  skin?: Skin;
  hair?: Hair;
  hairTone?: 1 | 2;
  shirt?: 1 | 2 | 3 | 4;
  /** One arm reaching over the table toward a build (-1 left, 1 right), or both resting (0). */
  reach?: -1 | 0 | 1;
  /** Where the eyes look (-1 left … 1 right); they always look down, at the table in front. */
  look?: number;
  /** The head tipped toward what they're looking at (deg; + = toward their right). */
  tilt?: number;
  glasses?: boolean;
  /** A boy: ears showing under a short crop, a crew-neck striped tee, no blush (girls: V-neck, rosy cheeks). */
  boy?: boolean;
  /** A fill darkening the shirt toward the waist (the scene's plum → ink front light), e.g. a gradient url. */
  shade?: string;
  /** `data-kid` hook value. */
  kid: string;
}) {
  const [tone, shade] = skins[skin];
  const hairFill = hairTone === 2 ? 'var(--illus-hair-2)' : 'var(--illus-hair)';
  const shirtFill = `var(--illus-shirt-${shirt})`;
  const eye = 3.8;
  const ex = look * 2.4;
  /** Eyes lowered: on the table, not on the viewer. */
  const ey = -41.8;
  const arm = (side: -1 | 1) => {
    const out = reach === side;
    const d = out ? `M${side * 11} -24Q${side * 20} -14 ${side * 27} 5` : `M${side * 11} -24L${side * 14} -6L${side * 10} 5`;
    const hand = out ? [side * 27.5, 6] : [side * 9, 6];
    return (
      <g key={side}>
        <path d={d} fill="none" stroke={shirtFill} strokeWidth="5" strokeLinecap="round" />
        {/* The bare arm below the short sleeve. */}
        <path
          d={d}
          fill="none"
          stroke={side === 1 ? shade : tone}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeDasharray="40 100"
          strokeDashoffset={out ? -9 : -8}
        />
        <circle cx={hand[0]} cy={hand[1]} r="2.6" fill={tone} />
      </g>
    );
  };
  return (
    <g data-kid={kid} transform={`translate(${x} ${y}) scale(${s})`}>
      {/* The shirt (its right side in shade), the arms, the neck. */}
      <path d="M-13 0V-21Q-13 -29.5 -5 -30H5Q13 -29.5 13 -21V0Z" fill={shirtFill} />
      <path d="M3 -30H5Q13 -29.5 13 -21V0H6Z" fill="var(--illus-edge-lo)" opacity={0.35} />
      {shirtShade && <path d="M-13 0V-21Q-13 -29.5 -5 -30H5Q13 -29.5 13 -21V0Z" fill={shirtShade} />}
      {boy ? (
        <>
          {/* A crew-neck tee with stripes across the chest. */}
          <path d="M-4.4 -30q4.4 3 8.8 0" fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M-13 -23H13M-13 -16H13M-13 -9H13" stroke="var(--illus-edge-hi)" strokeOpacity="0.35" strokeWidth="1.8" />
        </>
      ) : (
        <path d="M-4.6 -30l4.6 3.6l4.6-3.6" fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {arm(-1)}
      {arm(1)}
      <rect x="-2.4" y="-36.5" width="4.8" height="7" rx="2" fill={shade} />
      {/* Head, face, hair — tipped toward the table. */}
      <g transform={`rotate(${tilt} 0 -36)`}>
        <circle cx="0" cy="-46" r="10.2" fill={tone} />
        {boy && [-1, 1].map((side) => <ellipse key={side} cx={side * 10.3} cy="-45" rx="1.8" ry="2.6" fill={side === 1 ? shade : tone} />)}
        <HairShape hair={hair} fill={hairFill} />
        {/* Lowered eyes: each pupil half under a closed-down lid, looking at the table. */}
        {[-eye + ex, eye + ex].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={ey} r="1.2" fill="var(--illus-hair)" />
            <path d={`M${cx - 1.5} ${ey}a1.5 1.5 0 0 1 3 0Z`} fill={tone} />
            <path d={`M${cx - 1.6} ${ey}h3.2`} stroke={shade} strokeWidth="0.7" strokeLinecap="round" />
          </g>
        ))}
        {glasses && (
          <path
            d={`M${-eye + ex - 3} ${ey}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M${eye + ex - 3} ${ey}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M${-eye + ex + 3} ${ey - 0.4}h${2 * eye - 6}`}
            fill="none"
            stroke="var(--illus-hair)"
            strokeWidth="0.8"
          />
        )}
        {/* The face turned toward the build: cheeks and mouth move with the eyes, a little lower. */}
        {!boy && (
          <>
            <circle cx={-6 + ex} cy="-39.4" r="1.7" fill="var(--color-pink)" opacity={0.35} />
            <circle cx={6 + ex} cy="-39.4" r="1.7" fill="var(--color-pink)" opacity={0.35} />
          </>
        )}
        <path d={`M${-2.2 + ex} -38.4q2.2 1.6 4.4 0`} fill="none" stroke={shade} strokeWidth="1" strokeLinecap="round" />
        {/* The light from above on the hair and shoulders. */}
        <path d="M-6.4 -55.4c1.8-1.6 4-2.4 6.4-2.4s4.6.8 6.4 2.4c-2-.8-4.2-1.2-6.4-1.2s-4.4.4-6.4 1.2Z" fill="var(--illus-light-core)" opacity={0.3} />
      </g>
      <path d="M-12.6 -21Q-12.6 -29 -5 -29.6" fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

/**
 * The same child's legs, below the table (drawn before it, so the table's top and plank cover
 * the hips): trousers in shade from the waist (x, y) down to the floor at `floor`, and shoes.
 */
export function KidLegs({ x, y, s = 1, floor }: { x: number; y: number; s?: number; floor: number }) {
  const h = floor - y;
  return (
    <g data-kid-legs>
      {[-1, 1].map((side) => (
        <g key={side}>
          <rect x={x + side * 4.6 * s - 2.8 * s} y={y} width={5.6 * s} height={h - 2 * s} rx={2 * s} fill="var(--illus-face-inset)" />
          <ellipse cx={x + side * 5.4 * s} cy={floor - 1.6 * s} rx={3.8 * s} ry={2 * s} fill="var(--illus-face-side)" />
        </g>
      ))}
    </g>
  );
}
