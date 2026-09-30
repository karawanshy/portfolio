import { IllusDefs, IllusFrame, Shadow } from './illusParts';

const P = 'ch2';
const r1 = (n: number) => Math.round(n * 10) / 10;
const star = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}L${r1(cx + r * 0.22)} ${r1(cy - r * 0.22)}L${cx + r} ${cy}L${r1(cx + r * 0.22)} ${r1(cy + r * 0.22)}L${cx} ${cy + r}L${r1(cx - r * 0.22)} ${r1(cy + r * 0.22)}L${cx - r} ${cy}L${r1(cx - r * 0.22)} ${r1(cy - r * 0.22)}Z`;

/** The stage's opening (inside the proscenium) and its floor in perspective. */
const O = { x0: 40, x1: 320, top: 50, floorBack: 204, floorFront: 248 } as const;
const BACK = { x0: 78, x1: 282 } as const;
const PLANKS = 9;

/** Floor planks: seams converging toward the back, plus a few staggered butt joints. */
const planks = (() => {
  let d = '';
  for (let i = 1; i < PLANKS; i++) {
    const fx = O.x0 + ((O.x1 - O.x0) * i) / PLANKS;
    const bx = BACK.x0 + ((BACK.x1 - BACK.x0) * i) / PLANKS;
    d += `M${r1(fx)} ${O.floorFront}L${r1(bx)} ${O.floorBack}`;
  }
  for (let i = 0; i < PLANKS; i++) {
    const t = [0.3, 0.65, 0.45][i % 3]!;
    const y = O.floorBack + (O.floorFront - O.floorBack) * t;
    const at = (k: number) => {
      const f = O.x0 + ((O.x1 - O.x0) * k) / PLANKS;
      const b = BACK.x0 + ((BACK.x1 - BACK.x0) * k) / PLANKS;
      return b + (f - b) * t;
    };
    d += `M${r1(at(i))} ${r1(y)}H${r1(at(i + 1))}`;
  }
  return d;
})();

/** A curtain, gathered at a tie-back and pooling on the floor (left side; the right is mirrored). */
const curtain = `M${O.x0 - 4} ${O.top}H122C114 96 84 138 70 160C80 190 88 226 94 ${O.floorFront}H${O.x0 - 4}Z`;
const curtainFolds = 'M56 60C60 110 58 140 56 160M76 58C80 100 74 130 64 158M98 56C96 92 84 124 68 156M64 168C70 200 74 224 76 246M80 172C84 204 86 228 88 246';

/** Music, abstracted: a scrap of staff with two note heads, or two sound arcs. */
function Mark({ x, y, i, kind }: { x: number; y: number; i: number; kind: 'staff' | 'arcs' }) {
  const stroke = { fill: 'none', stroke: 'var(--color-peach)', strokeLinecap: 'round' as const };
  return (
    <g data-stage="mark" data-mark={i} transform={`translate(${x} ${y})`} style={{ filter: 'var(--illus-glow-soft)' }}>
      {kind === 'staff' ? (
        <>
          <path d="M-15 -6H15M-15 0H15M-15 6H15" {...stroke} strokeOpacity="0.4" strokeWidth="1" />
          <path d="M-1 -3V-15M9 3V-9" {...stroke} strokeOpacity="0.85" strokeWidth="1.2" />
          <ellipse cx="-4" cy="-3" rx="3.4" ry="2.6" transform="rotate(-20 -4 -3)" fill="var(--color-peach)" />
          <ellipse cx="6" cy="3" rx="3.4" ry="2.6" transform="rotate(-20 6 3)" fill="var(--color-peach)" />
        </>
      ) : (
        <>
          <path d="M0 -6A6 6 0 0 1 0 6" {...stroke} strokeOpacity="0.9" strokeWidth="1.8" />
          <path d="M5 -11A11 11 0 0 1 5 11" {...stroke} strokeOpacity="0.55" strokeWidth="1.6" />
          <path d="M10 -16A16 16 0 0 1 10 16" {...stroke} strokeOpacity="0.25" strokeWidth="1.4" />
        </>
      )}
    </g>
  );
}

/** A script page lying on the boards (foreshortened), with its written lines and a soft shadow. */
function Page({ x, y, rot, i }: { x: number; y: number; rot: number; i: number }) {
  return (
    <g data-stage="page" data-page={i} transform={`translate(${x} ${y}) scale(1 0.46) rotate(${rot})`}>
      <rect x="-13" y="-15" width="28" height="34" rx="1.5" fill="var(--illus-shadow)" opacity={0.45} />
      <rect x="-14" y="-17" width="28" height="34" rx="1.5" fill={`url(#${P}-paper)`} />
      <path d="M-9 -11H7M-9 -6H9M-9 -1H4M-9 4H8M-9 9H3" stroke="var(--illus-ink-line)" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

/**
 * Chapter 2 — at school she wanted to be part of everything, and when something
 * didn't exist she created it: scripts, songs, casting, the whole thing. A crafted
 * miniature stage: a proscenium with depth, a swagged valance, pink curtains in folds
 * gathered at tie-backs, a plank floor in perspective with an apron and footlights,
 * a hanging spotlight throwing its cone onto the boards — and in its pool, the idea
 * (a lit spark) made real. Script pages lie on the boards; sound marks drift in the air.
 * MEDIUM. Hooks: g[data-stage="curtain-left|curtain-right|valance|spot|floor|spark|lamp|footlights"],
 * g[data-stage="page"][data-page], g[data-stage="mark"][data-mark].
 */
export function Stage() {
  const footlights = Array.from({ length: 7 }, (_, i) => 70 + i * 36.7);
  return (
    <IllusFrame name="stage">
      <svg viewBox="0 0 360 320" className="w-full overflow-visible">
        <IllusDefs p={P} />
        <defs>
          <linearGradient id={`${P}-folds`} x1="0" y1="0" x2="0.26" y2="0" spreadMethod="repeat">
            <stop offset="0" stopColor="var(--illus-curtain-deep)" />
            <stop offset="0.35" stopColor="var(--illus-curtain)" />
            <stop offset="0.62" stopColor="var(--illus-curtain-light)" stopOpacity="0.8" />
            <stop offset="0.82" stopColor="var(--illus-curtain)" />
            <stop offset="1" stopColor="var(--illus-curtain-deep)" />
          </linearGradient>
          <linearGradient id={`${P}-drape-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--illus-curtain-deep)" stopOpacity="0.7" />
            <stop offset="0.3" stopColor="var(--illus-curtain-deep)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--illus-curtain-deep)" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id={`${P}-valance`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--illus-curtain-deep)" />
            <stop offset="0.6" stopColor="var(--illus-curtain)" />
            <stop offset="1" stopColor="var(--illus-curtain-light)" />
          </linearGradient>
          <linearGradient id={`${P}-floor`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--illus-plank-2)" />
            <stop offset="1" stopColor="var(--illus-plank)" />
          </linearGradient>
          <linearGradient id={`${P}-back`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--illus-face-side)" />
            <stop offset="1" stopColor="var(--illus-curtain-deep)" />
          </linearGradient>
          <linearGradient id={`${P}-spot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--illus-light-core)" stopOpacity="0.4" />
            <stop offset="1" stopColor="var(--color-peach)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <Shadow p={P} cx={180} cy={272} rx={190} ry={12} />

        {/* The proscenium: a frame with depth around the opening. */}
        <path d="M18 24L30 14H330L342 24Z" fill="var(--illus-face-top)" />
        <path d={`M18 24H342V${O.floorFront}H18Z M${O.x0} ${O.top}V${O.floorFront}H${O.x1}V${O.top}Z`} fill={`url(#${P}-front)`} fillRule="evenodd" />
        <path d="M18 24.5H342" stroke="var(--illus-edge-hi)" strokeWidth="1" />
        <path d={`M${O.x0 - 6} ${O.floorFront}V${O.top - 6}H${O.x1 + 6}V${O.floorFront}`} fill="none" stroke="var(--illus-edge-hi)" strokeOpacity="0.5" strokeWidth="0.8" />

        {/* Inside: the back wall (a dark back curtain) and the floor. */}
        <rect x={O.x0} y={O.top} width={O.x1 - O.x0} height={O.floorBack - O.top} fill={`url(#${P}-back)`} />
        <path d="M100 60V204M130 60V204M160 60V204M200 60V204M230 60V204M260 60V204" stroke="var(--illus-edge-lo)" strokeWidth="6" opacity={0.5} />
        <g data-stage="floor">
          <path d={`M${BACK.x0} ${O.floorBack}H${BACK.x1}L${O.x1} ${O.floorFront}H${O.x0}Z`} fill={`url(#${P}-floor)`} />
          <path d={planks} stroke="var(--illus-face-side)" strokeOpacity="0.55" strokeWidth="1" />
          {/* The apron: the stage's front edge, lit on its lip. */}
          <rect x="30" y={O.floorFront} width="300" height="18" fill={`url(#${P}-front)`} />
          <path d={`M30 ${O.floorFront + 0.5}H330`} stroke="var(--illus-edge-hi)" strokeWidth="1.2" />
        </g>
        <g data-stage="footlights">
          {footlights.map((x) => (
            <g key={x}>
              <ellipse cx={r1(x)} cy={O.floorFront + 1} rx="9" ry="4" fill={`url(#${P}-warm)`} opacity={0.6} />
              <path d={`M${r1(x - 3.5)} ${O.floorFront + 3}a3.5 3 0 0 1 7 0Z`} fill="var(--color-peach)" />
            </g>
          ))}
        </g>

        {/* The spotlight: a lamp hung under the valance, its cone, and the pool on the boards. */}
        <g data-stage="spot">
          <path d="M172 82H188L240 238H120Z" fill={`url(#${P}-spot)`} />
          <ellipse cx="180" cy="234" rx="62" ry="10" fill={`url(#${P}-warm)`} opacity={0.75} />
        </g>
        <g data-stage="lamp">
          <path d="M180 58V70" stroke="var(--illus-face-top)" strokeWidth="2" />
          <path d="M171 70H189L191 82H169Z" fill="var(--illus-face-top)" />
          <path d="M171.5 70.5H188.5" stroke="var(--illus-edge-hi)" strokeWidth="1" />
          <ellipse cx="180" cy="82" rx="10" ry="2.2" fill="var(--illus-light-core)" style={{ filter: 'var(--illus-glow-soft)' }} />
        </g>

        {/* Script pages on the boards. */}
        <Page x={108} y={238} rot={-18} i={0} />
        <Page x={124} y={241} rot={10} i={1} />
        <Page x={254} y={236} rot={22} i={2} />

        {/* The idea, set in the light. */}
        <g data-stage="spark">
          <circle cx="180" cy="214" r="30" fill={`url(#${P}-warm)`} opacity={0.8} />
          <ellipse cx="180" cy="236" rx="16" ry="3" fill="var(--illus-light-core)" opacity={0.5} />
          <path d={star(180, 214, 15)} fill="var(--illus-light-core)" style={{ filter: 'var(--illus-glow-warm)' }} />
          <path d={star(180, 214, 7)} fill="var(--color-peach)" />
        </g>

        {/* Curtains: folds, gathered at tie-backs, pooling on the boards. */}
        <g data-stage="curtain-left">
          <path d={curtain} fill={`url(#${P}-folds)`} />
          <path d={curtain} fill={`url(#${P}-drape-shade)`} />
          <path d={curtainFolds} fill="none" stroke="var(--illus-curtain-deep)" strokeOpacity="0.55" strokeWidth="1.2" />
          <path d="M60 156L78 162L76 168L58 162Z" fill="var(--illus-brass)" />
        </g>
        <g data-stage="curtain-right" transform="translate(360 0) scale(-1 1)">
          <path d={curtain} fill={`url(#${P}-folds)`} />
          <path d={curtain} fill={`url(#${P}-drape-shade)`} />
          <path d={curtainFolds} fill="none" stroke="var(--illus-curtain-deep)" strokeOpacity="0.55" strokeWidth="1.2" />
          <path d="M60 156L78 162L76 168L58 162Z" fill="var(--illus-brass)" />
        </g>
        <g data-stage="valance">
          <path
            d={`M${O.x0 - 6} ${O.top - 8}H${O.x1 + 6}V${O.top + 4}Q300 ${O.top + 24} 250 ${O.top + 8}Q215 ${O.top + 26} 180 ${O.top + 10}Q145 ${O.top + 26} 110 ${O.top + 8}Q60 ${O.top + 24} ${O.x0 - 6} ${O.top + 4}Z`}
            fill={`url(#${P}-valance)`}
          />
          <path
            d={`M${O.x1 + 6} ${O.top + 4}Q300 ${O.top + 24} 250 ${O.top + 8}Q215 ${O.top + 26} 180 ${O.top + 10}Q145 ${O.top + 26} 110 ${O.top + 8}Q60 ${O.top + 24} ${O.x0 - 6} ${O.top + 4}`}
            fill="none"
            stroke="var(--color-tangerine)"
            strokeOpacity="0.8"
            strokeWidth="1.6"
          />
          <path d={`M${O.x0 - 6} ${O.top - 7.5}H${O.x1 + 6}`} stroke="var(--illus-edge-hi)" strokeWidth="1" />
        </g>

        {/* Sound in the air. */}
        <Mark x={130} y={120} i={0} kind="staff" />
        <Mark x={236} y={104} i={1} kind="arcs" />
        <Mark x={252} y={156} i={2} kind="staff" />
      </svg>
    </IllusFrame>
  );
}
