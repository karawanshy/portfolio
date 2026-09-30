import { HalfSun, IllusDefs, IllusFrame, Shadow } from './illusParts';

const P = 'ch16';

/**
 * The car's geometry (viewBox 300 × 250). The trunk lid is hinged where it meets the rear
 * glass, at HINGE: the motion folds [data-trunk-lid] about the bottom of its bounding box
 * (so nothing in the lid may reach below HINGE), and the no-JS CSS in global.css mirrors
 * it (translate 124px). Open, the lid stands up over the rear window (its top at
 * LID_TOP); folded to motion.story.illus.trunk.lidClosed (−0.74) its free edge lands at
 * ≈ y 164, closing the opening under the glass.
 */
const HINGE = 124;
const LID_TOP = 70;
/** The lid's free edge once folded (lidClosed −0.74): where the opening must end. */
const LID_LIP = HINGE + (HINGE - LID_TOP) * 0.74;

/**
 * Chapter 16 — the internship was ending; the equipment was already packed in the
 * car; three days remained. A still life seen from behind: a compact sedan — cabin,
 * rear glass, roof and C-pillars; tail-light clusters, bumper, blank plate recess,
 * tyres and a contact shadow — its trunk lid standing open over the rear glass, the
 * packed box inside, and three small half-suns above, the last two fading.
 * QUIET. Hooks: [data-trunk-lid] (+ [data-trunk-lid-line], its crease), [data-box],
 * g[data-day="1|2|3"], rect[data-tail-light].
 */
export function Trunk() {
  return (
    <IllusFrame name="trunk" size="small">
      <svg viewBox="0 0 300 250" className="w-full overflow-visible">
        <IllusDefs p={P} />
        <defs>
          {/* The lid: lit at its hinge (the top, once closed), falling to shade at its lip. */}
          <linearGradient id={`${P}-lid`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="var(--illus-face-top)" />
            <stop offset="0.55" stopColor="var(--illus-face-front)" />
            <stop offset="1" stopColor="var(--illus-face-front-2)" />
          </linearGradient>
          {/* Rear glass: dark, with a soft sky reflection at its top. */}
          <linearGradient id={`${P}-glass`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--illus-face-top)" />
            <stop offset="0.35" stopColor="var(--illus-glass-dark)" />
            <stop offset="1" stopColor="var(--illus-face-side)" />
          </linearGradient>
        </defs>

        {/* Three days: one still bright, two fading. */}
        <HalfSun data-day={1} cx={112} cy={40} r={11} fill="var(--color-tangerine)" />
        <HalfSun data-day={2} cx={150} cy={40} r={11} fill="var(--color-peach)" opacity={0.42} />
        <HalfSun data-day={3} cx={188} cy={40} r={11} fill="var(--color-peach)" opacity={0.16} />

        <line x1="20" x2="280" y1="220" y2="220" stroke="var(--illus-ground)" strokeWidth="2" strokeLinecap="round" />
        <Shadow p={P} cx={150} cy={220} rx={128} ry={9} />

        {/* Tyres, below the body. */}
        <rect x="54" y="190" width="32" height="30" rx="7" fill="var(--illus-face-side)" />
        <rect x="214" y="190" width="32" height="30" rx="7" fill="var(--illus-face-side)" />
        <path d="M58 191H82M218 191H242" stroke="var(--illus-edge-hi)" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round" />

        {/* Side mirrors, peeking out from the cabin. */}
        <path d="M60 118Q50 116 46 121Q46 127 54 127H66Z" fill="var(--illus-face-side)" />
        <path d="M240 118Q250 116 254 121Q254 127 246 127H234Z" fill="var(--illus-face-side)" />

        {/* Cabin: roof and C-pillars round the rear glass. */}
        <path d="M60 128L86 82Q91 73 102 73H198Q209 73 214 82L240 128Z" fill={`url(#${P}-front)`} />
        <path d="M60 128L86 82Q91 73 102 73H198Q209 73 214 82L240 128" fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1" strokeLinejoin="round" />
        <path d="M79 122L98 88Q101 83 108 83H192Q199 83 202 88L221 122Z" fill={`url(#${P}-glass)`} />
        <path d="M100 91Q102 87 108 87H192Q198 87 200 91" fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M112 118L128 90H140L124 118Z" fill="var(--illus-edge-hi)" opacity={0.12} />

        {/* Rear body: shoulders, flanks in shade, the bumper and the plate recess. */}
        <path d="M44 196V146Q44 128 64 124H236Q256 128 256 146V196Z" fill={`url(#${P}-front)`} />
        <path d="M44 196V146Q44 132 54 127V196Z M256 196V146Q256 132 246 127V196Z" fill="var(--illus-face-side)" opacity={0.7} />
        <path d="M50 131Q54 125 64 124.5H236Q246 125 250 131" fill="none" stroke="var(--illus-edge-hi)" strokeWidth="1" strokeLinecap="round" />
        <path d="M38 186Q38 180 46 180H254Q262 180 262 186V200Q262 206 254 206H46Q38 206 38 200Z" fill="var(--illus-face-front-2)" />
        <path d="M44 180.5H256" stroke="var(--illus-edge-hi)" strokeWidth="1" strokeOpacity="0.7" strokeLinecap="round" />
        <rect x="126" y="167" width="48" height="16" rx="2.5" fill="var(--illus-face-inset)" stroke="var(--illus-edge-lo)" strokeWidth="1" />
        <path d="M127 182.5H173" stroke="var(--illus-edge-hi)" strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Tail-light clusters: housings wrapping the rear corners, the lamps inside. */}
        <path d="M48 142Q48 132 60 130H82V150H52Q48 150 48 146Z" fill="var(--illus-face-inset)" stroke="var(--illus-edge-lo)" strokeWidth="1" />
        <path d="M252 142Q252 132 240 130H218V150H248Q252 150 252 146Z" fill="var(--illus-face-inset)" stroke="var(--illus-edge-lo)" strokeWidth="1" />
        <rect data-tail-light x="54" y="134" width="24" height="10" rx="3" fill="var(--color-pink)" opacity={0.45} />
        <rect data-tail-light x="222" y="134" width="24" height="10" rx="3" fill="var(--color-pink)" opacity={0.45} />

        {/* The open trunk: the dark opening under the glass, the packed box inside. */}
        <path d={`M86 ${HINGE}H214L${204} ${LID_LIP - 1}H96Z`} fill="var(--color-ink)" opacity={0.9} />
        <g data-box>
          <rect x="118" y="130" width="64" height="30" rx="2" fill="var(--color-peach)" fillOpacity="0.22" stroke="var(--color-peach)" strokeWidth="1.5" />
          <path d="M150 130V160M118 139H182" stroke="var(--color-peach)" strokeOpacity="0.55" strokeWidth="1.5" />
        </g>

        {/* The lid, standing open over the rear glass; it folds down about HINGE. Nothing below HINGE. */}
        <g data-trunk-lid>
          <path
            d={`M84 ${HINGE}L96 ${LID_TOP + 3}Q97 ${LID_TOP} 101 ${LID_TOP}H199Q203 ${LID_TOP} 204 ${LID_TOP + 3}L216 ${HINGE}Z`}
            fill={`url(#${P}-lid)`}
            stroke="var(--illus-edge-lo)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* The lid's pressed panel: its inner face while open, the trunk's crease once closed. */}
          <path d={`M95 ${HINGE - 6}L103 ${LID_TOP + 12}H197L205 ${HINGE - 6}Z`} fill="var(--illus-face-inset)" fillOpacity="0.35" stroke="var(--illus-edge-lo)" strokeWidth="1" strokeLinejoin="round" />
          <path d={`M99 ${LID_TOP + 0.8}H201`} stroke="var(--illus-edge-hi)" strokeWidth="1" strokeLinecap="round" />
          <path d={`M88 ${HINGE - 0.8}H212`} stroke="var(--illus-edge-hi)" strokeWidth="1" strokeLinecap="round" />
        </g>
        <path data-trunk-lid-line d={`M104 ${LID_TOP + 8}H196`} stroke="var(--illus-edge-hi)" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </IllusFrame>
  );
}
