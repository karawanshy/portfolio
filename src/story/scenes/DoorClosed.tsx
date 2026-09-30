import { Door, IllusDefs, IllusFrame, Shadow } from './illusParts';
import { DOOR } from './illusData';

type Pt = readonly [number, number];

/**
 * An application in the pile: a real tri-folded sheet laid flat — paper lit from above, the
 * middle panel of the fold in shade, two creases, a couple of written lines, a shadow under it.
 */
function Sheet({ at, rot, i, p }: { at: Pt; rot: number; i: number; p: string }) {
  const s = 1.25;
  return (
    <g data-envelope={i} transform={`translate(${at[0]} ${at[1]}) rotate(${rot}) scale(${s} ${s * 0.5})`}>
      <rect x="-11.5" y="-7" width="26" height="18" rx="1.5" fill="var(--illus-shadow)" opacity={0.55} />
      <rect x="-13" y="-9" width="26" height="18" rx="1.2" fill={`url(#${p}-paper)`} />
      <path d="M-13 -3H13V3H-13Z" fill="var(--illus-paper-shade)" />
      <path d="M-13 -3H13M-13 3H13" stroke="var(--illus-paper-edge)" strokeOpacity="0.6" strokeWidth="0.6" />
      <path d="M-9 -6.2H6M-9 6H2" stroke="var(--illus-ink-line)" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );
}

/** The certificate: a card with a tangerine band and border, and a rosette seal with ribbon tails. */
function Certificate({ at, rot, p }: { at: Pt; rot: number; p: string }) {
  return (
    <g data-cert transform={`translate(${at[0]} ${at[1]}) rotate(${rot})`}>
      <rect x="-14" y="-9" width="32" height="23" rx="1.5" fill="var(--illus-shadow)" opacity={0.4} />
      <rect x="-16" y="-11" width="32" height="23" rx="1.5" fill={`url(#${p}-paper)`} />
      <rect x="-13.5" y="-8.5" width="27" height="18" rx="1" fill="none" stroke="var(--color-tangerine)" strokeOpacity="0.55" strokeWidth="0.8" />
      <path d="M-13.5 -8.5H13.5V-5H-13.5Z" fill="var(--color-tangerine)" opacity={0.8} />
      <path d="M-9 -0.5H4M-9 3.5H0" stroke="var(--illus-ink-line)" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M7 6l-2.6 7l2.6 -1.6l1.6 2.2ZM10 6l2.6 7l-2.6 -1.6l-1.6 2.2Z" fill="var(--color-pink)" opacity={0.85} />
      <circle cx="8.5" cy="5" r="4.6" fill="var(--color-tangerine)" style={{ filter: 'var(--illus-glow-soft)' }} />
      <circle cx="8.5" cy="5" r="2.6" fill="none" stroke="var(--illus-light-core)" strokeOpacity="0.7" strokeWidth="0.8" />
    </g>
  );
}

interface Layout {
  vb: [number, number];
  /** The opening's left x (the architrave reaches DOOR.frame beyond it). */
  door: number;
  ground: number;
  /** The pile's centre x, at the door's foot. */
  pile: number;
  /**
   * The flight every application takes, from the upper left down to the pile (quadratic:
   * start, control, end). Never drawn: the motion reads it from svg[data-trail].
   */
  trail: [Pt, Pt, Pt];
  cert: Pt;
  className: string;
}

const layouts: Layout[] = [
  // Desktop: the pile heaps up at the closed door.
  { vb: [360, 340], door: 236, ground: 286, pile: 166, trail: [[-40, -10], [40, 300], [190, 270]], cert: [216, 273], className: 'hidden w-full overflow-visible lg:block' },
  // Phones: a narrower frame.
  { vb: [300, 300], door: 180, ground: 280, pile: 112, trail: [[-14, 4], [20, 250], [134, 264]], cert: [160, 267], className: 'w-full overflow-visible lg:hidden' },
];

/**
 * The pile, bottom course first (the order they land in): each course's x offsets from the
 * pile's centre; every course sits PILE_RISE higher than the one below it.
 */
const PILE = [
  [-64, -44, -24, -4, 16, 34],
  [-54, -34, -14, 6, 25],
  [-44, -24, -4, 15],
  [-34, -14, 6],
  [-24, -4],
  [-14],
] as const;
const PILE_RISE = 6.5;
const turns = [-6, 7, -3, 5, -8, 4, -5, 8, -2, 6, -7, 3, -4, 6, -3, 9, -6, 2, -8, 5, -4];
const nudge = [0.4, -0.6, 0.8, -0.3, 0.5, -0.8, 0.2, 0.6, -0.5, 0.3, -0.4, 0.7, -0.2, 0.5, -0.6, 0.3, -0.7, 0.5, -0.2, 0.6, -0.4];
const r1 = (n: number) => Math.round(n * 10) / 10;
const sheets = PILE.flatMap((row, course) => row.map((dx) => ({ dx, course })));

/**
 * Chapter 7 — almost three years of trying to get into the industry; an AWS
 * bootcamp and certification; still, the door wouldn't open. The crafted door (the
 * same object as ch 9 and ch 17's doorway), closed, a line of light under it falling
 * on the floor; a big pile of applications — real folded sheets — heaped at its foot
 * (one by one they fly in from the upper left and land on it; their path is never drawn),
 * and the certificate card propped against the frame.
 * MEDIUM. Hooks: see Door (g[data-door="closed"], [data-door-part]);
 * g[data-envelope="0…20"] (landing order, bottom course
 * first); g[data-pile-shadow] (it darkens as the pile grows); g[data-cert]; svg[data-trail] (the flight's path: 6 numbers, never drawn).
 */
export function DoorClosed() {
  return (
    <IllusFrame name="door" size="lane-medium">
      {layouts.map((L, li) => {
        const p = `ch7-${li}`;
        return (
          <svg key={li} viewBox={`0 0 ${L.vb[0]} ${L.vb[1]}`} className={L.className} data-trail={L.trail.flat().join(' ')}>
            <IllusDefs p={p} />
            <line x1="8" x2={L.vb[0] - 8} y1={L.ground} y2={L.ground} stroke="var(--illus-ground)" strokeWidth="2" strokeLinecap="round" />
            <Shadow p={p} cx={L.door + DOOR.w / 2} cy={L.ground + 1} rx={DOOR.w * 0.9} ry={6} />
            <Door x={L.door} y={L.ground - DOOR.h} state="closed" id={p} />
            <g data-pile-shadow>
              <Shadow p={p} cx={L.pile} cy={L.ground + 1} rx={84} ry={6} opacity={0.85} />
            </g>
            {sheets.map(({ dx, course }, i) => (
              <Sheet key={i} i={i} p={p} at={[r1(L.pile + dx + nudge[i]! * 3), r1(L.ground - 2.5 - course * PILE_RISE + nudge[i]!)]} rot={turns[i]!} />
            ))}
            <Certificate at={L.cert} rot={12} p={p} />
          </svg>
        );
      })}
    </IllusFrame>
  );
}
