import { useId } from 'react';

/**
 * Hasoub card visual (abstract, not a product UI or an architecture diagram):
 * four actor nodes on a lifecycle ring, joined by dotted spokes to the ◒ hub.
 * Node glyphs are generic shapes, never client branding. Labels hide on phones,
 * where the ring is small; the aria-label carries them everywhere.
 */

/** Ring geometry, in viewBox units (0 0 260 240). Tune here. */
const C = { x: 130, y: 122 };
const R = 86;
const NODE_R = 21;

/** Node glyphs, drawn around (0,0), stroked in cream. */
const glyphs = [
  // Candidate: a person
  <g key="candidate">
    <circle cx="0" cy="-4.5" r="4" />
    <path d="M-8 9 a8 7.5 0 0 1 16 0" />
  </g>,
  // Recruiter / company: a briefcase
  <g key="recruiter">
    <rect x="-8.5" y="-4" width="17" height="12" rx="2.5" />
    <path d="M-4 -4 v-3.5 h8 v3.5" />
  </g>,
  // Senior: two rank chevrons
  <g key="senior">
    <path d="M-7.5 1 l7.5 -6.5 l7.5 6.5" />
    <path d="M-7.5 8.5 l7.5 -6.5 l7.5 6.5" />
  </g>,
  // Admin: a small dashboard grid
  <g key="admin">
    <rect x="-8" y="-8" width="7" height="7" rx="1.5" />
    <rect x="1" y="-8" width="7" height="7" rx="1.5" />
    <rect x="-8" y="1" width="7" height="7" rx="1.5" />
    <rect x="1" y="1" width="7" height="7" rx="1.5" />
  </g>,
];

/** Point on the ring at `deg` (SVG space: 0 = east, clockwise). */
const onRing = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: C.x + R * Math.cos(a), y: C.y + R * Math.sin(a) };
};

/**
 * Nodes on the diagonals, clockwise from the top right, so every label sits
 * outside the ring: above the top two, below the bottom two.
 */
const nodes = [-45, 45, 135, 225].map((deg) => {
  const p = onRing(deg);
  const top = p.y < C.y;
  return { ...p, label: { dx: 0, dy: top ? -NODE_R - 9 : NODE_R + 18 } };
});

/** Flow chevrons between the nodes, pointing clockwise (angles in degrees, SVG space). */
const arrows = [0, 90, 180, 270].map((deg) => ({ ...onRing(deg), rotate: deg + 90 }));

export function ActorRing({ actors, label, className = '' }: { actors: readonly string[]; label: string; className?: string }) {
  const id = useId();
  const ringId = `ring-${id}`;
  const sunId = `hub-${id}`;
  return (
    <svg role="img" aria-label={label} viewBox="0 0 260 240" className={`block h-auto overflow-visible ${className}`}>
      <defs>
        <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-lilac)" />
          <stop offset="0.55" stopColor="var(--color-pink)" />
          <stop offset="1" stopColor="var(--color-tangerine)" />
        </linearGradient>
        <linearGradient id={sunId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-tangerine)" />
          <stop offset="1" stopColor="var(--color-pink)" />
        </linearGradient>
      </defs>

      {/* Lifecycle ring + clockwise flow chevrons */}
      <circle cx={C.x} cy={C.y} r={R} fill="none" stroke={`url(#${ringId})`} strokeWidth="2.5" opacity="0.9" />
      {arrows.map((a, i) => (
        <path
          key={i}
          d="M-4.5 -5 L3.5 0 L-4.5 5"
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${a.rotate})`}
        />
      ))}

      {/* Spokes: hub → each actor */}
      {nodes.map((n, i) => (
        <line
          key={i}
          x1={(C.x + (n.x - C.x) * 0.3).toFixed(1)}
          y1={(C.y + (n.y - C.y) * 0.3).toFixed(1)}
          x2={(C.x + (n.x - C.x) * 0.72).toFixed(1)}
          y2={(C.y + (n.y - C.y) * 0.72).toFixed(1)}
          stroke="var(--actor-spoke)"
          strokeWidth="2"
          strokeDasharray="3 5"
          strokeLinecap="round"
        />
      ))}

      {/* ◒ hub: half-sun over two short lines (the site's mark) */}
      <path d={`M${C.x - 20} ${C.y + 4} a20 20 0 0 1 40 0 Z`} fill={`url(#${sunId})`} />
      <path
        d={`M${C.x - 24} ${C.y + 11} h48 M${C.x - 14} ${C.y + 18} h28`}
        stroke="var(--color-pink)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Actor nodes */}
      {nodes.map((n, i) => (
        <g key={i} transform={`translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`}>
          <circle r={NODE_R} fill="var(--actor-node-fill)" stroke="var(--actor-node-edge)" strokeWidth="1.5" />
          <g fill="none" stroke="var(--color-cream)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {glyphs[i]}
          </g>
        </g>
      ))}

      {/* Labels (md+; too small to read on the phone ring) */}
      <g aria-hidden="true" className="max-md:hidden" fill="var(--color-text-2)" textAnchor="middle">
        {nodes.map((n, i) => (
          <text
            key={i}
            x={(n.x + n.label.dx).toFixed(1)}
            y={(n.y + n.label.dy).toFixed(1)}
            className="font-display"
            fontSize="11.5"
            fontWeight="700"
            letterSpacing="1.2"
          >
            {actors[i]?.toUpperCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}
