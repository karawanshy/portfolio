import { HalfSun, IllusFrame } from './illusParts';

const W = 440;
const H = 330;
const HUB = { x: 220, y: 172 } as const;

/** Task / context lanes: one per workstream, each in its own colour. */
const lanes = [
  { y: 92, color: 'var(--color-pink)' },
  { y: 144, color: 'var(--color-peach)' },
  { y: 200, color: 'var(--color-lilac)' },
  { y: 252, color: 'var(--color-cream)' },
] as const;
/** Strands bundle this close together inside the hub. */
const bundle = [-12, -4, 4, 12];
/** Task nodes along each lane: queued before the hub, done after it (x positions). */
const tasks = [
  { before: [134, 160], after: [286] },
  { before: [140], after: [270, 300] },
  { before: [128, 150, 172], after: [292] },
  { before: [146], after: [276, 304] },
];

const DESIGN = { x: 20, y: 52, w: 92, h: 226 } as const;
const BUILD = { x: 328, y: 52, w: 92, h: 226 } as const;

function strand(i: number): string {
  const y = lanes[i]!.y;
  const o = HUB.y + bundle[i]!;
  const x0 = DESIGN.x + DESIGN.w;
  const x1 = BUILD.x;
  return `M${x0} ${y}C${x0 + 44} ${y} ${HUB.x - 70} ${o} ${HUB.x - 40} ${o}H${HUB.x + 40}C${HUB.x + 70} ${o} ${x1 - 44} ${y} ${x1} ${y}`;
}

/**
 * Chapter 15 — frontend infrastructure that improves how designers and engineers
 * work together, and AI used to orchestrate parts of the workflow across multiple
 * tasks and contexts. A lit panel (the depth of the ch 3 board): on the left, the
 * designers' side — swatches and design tokens; on the right, the engineers' side —
 * component blocks; between them, four task/context lanes, each carrying its own
 * workstream (queued tasks before, finished ones after), all bundled through one
 * coordinating ◒ hub. One horizontal composition on every size.
 * RICH. Hooks: [data-scene-part="hub-panel"], g[data-lane="0…3"] (band, strand
 * path[data-strand], task marks [data-task="queued|done"]), g[data-hub],
 * g[data-piece="design"] ([data-piece-part="swatch|token"]),
 * g[data-piece="build"] ([data-piece-part="component"][data-component=…]).
 */
export function Hub() {
  const line = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <IllusFrame name="hub" size="rich">
      <svg
        data-scene-part="hub-panel"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-[26px] lg:rounded-[30px]"
        style={{ background: 'var(--hub-panel-fill)', boxShadow: 'var(--hub-panel-shadow)' }}
      >
        {/* Lanes: bands and dashed guides behind everything. */}
        {lanes.map((l, i) => (
          <g key={i} data-lane={i}>
            <rect x={DESIGN.x + DESIGN.w + 6} y={l.y - 15} width={BUILD.x - DESIGN.x - DESIGN.w - 12} height="30" rx="15" fill="var(--hub-lane)" />
            <path d={`M${DESIGN.x + DESIGN.w + 14} ${l.y}H${BUILD.x - 14}`} {...line} stroke="var(--illus-line-dim)" strokeWidth="1" strokeDasharray="2 7" />
          </g>
        ))}

        {/* Strands: each lane's workstream, bundled through the hub. */}
        {lanes.map((l, i) => (
          <path key={i} data-strand={i} d={strand(i)} {...line} stroke={l.color} strokeOpacity="0.9" strokeWidth="2.5" />
        ))}

        {/* Tasks along the lanes: queued (outlined) before the hub, done (filled) after it. */}
        {lanes.map((l, i) => (
          <g key={i} data-lane-tasks={i}>
            {tasks[i]!.before.map((x) => (
              <rect key={`b${x}`} data-task="queued" x={x - 5} y={l.y - 5} width="10" height="10" rx="3" fill="var(--hub-panel-fill)" stroke={l.color} strokeOpacity="0.7" strokeWidth="1.4" />
            ))}
            {tasks[i]!.after.map((x) => (
              <rect key={`a${x}`} data-task="done" x={x - 5} y={l.y - 5} width="10" height="10" rx="3" fill={l.color} fillOpacity="0.9" />
            ))}
          </g>
        ))}

        {/* The hub: the ◒ coordinating the lanes, with an orbit and ports. */}
        <g data-hub>
          <circle cx={HUB.x} cy={HUB.y} r="58" {...line} stroke="var(--color-lilac)" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 7" />
          <circle cx={HUB.x} cy={HUB.y} r="42" fill="var(--color-ink)" stroke="var(--color-lilac)" strokeOpacity="0.7" strokeWidth="1.8" />
          {bundle.map((o, i) => (
            <g key={i}>
              <circle cx={HUB.x - 42} cy={HUB.y + o} r="2.4" fill={lanes[i]!.color} />
              <circle cx={HUB.x + 42} cy={HUB.y + o} r="2.4" fill={lanes[i]!.color} />
            </g>
          ))}
          <HalfSun cx={HUB.x} cy={HUB.y + 8} r={19} fill="var(--color-tangerine)" />
        </g>

        {/* Designers' side: swatches and tokens (one token per lane). */}
        <g data-piece="design">
          <rect x={DESIGN.x} y={DESIGN.y} width={DESIGN.w} height={DESIGN.h} rx="14" fill="var(--illus-fill)" stroke="var(--illus-line-dim)" strokeWidth="1.2" />
          {['var(--color-pink)', 'var(--color-peach)', 'var(--color-lilac)', 'var(--color-tangerine)'].map((c, i) => (
            <rect key={i} data-piece-part="swatch" x={DESIGN.x + 12 + i * 18} y={DESIGN.y + 12} width="14" height="14" rx="4" fill={c} />
          ))}
          {lanes.map((l, i) => (
            <g key={i} data-piece-part="token">
              <circle cx={DESIGN.x + 18} cy={l.y} r="5" fill={l.color} />
              <path d={`M${DESIGN.x + 30} ${l.y - 3}H${DESIGN.x + 70 - i * 6}M${DESIGN.x + 30} ${l.y + 4}H${DESIGN.x + 52}`} {...line} stroke="var(--illus-line)" strokeOpacity="0.55" strokeWidth="2" />
              <circle cx={DESIGN.x + DESIGN.w} cy={l.y} r="3" fill={l.color} />
            </g>
          ))}
        </g>

        {/* Engineers' side: component blocks (a button, an input, a card, a toggle). */}
        <g data-piece="build">
          <rect x={BUILD.x} y={BUILD.y} width={BUILD.w} height={BUILD.h} rx="14" fill="var(--illus-fill)" stroke="var(--illus-line-dim)" strokeWidth="1.2" />
          {lanes.map((l, i) => (
            <circle key={i} cx={BUILD.x} cy={l.y} r="3" fill={l.color} />
          ))}
          <g data-piece-part="component" data-component="button">
            <rect x={BUILD.x + 14} y={lanes[0].y - 10} width="58" height="20" rx="10" fill="var(--color-pink)" fillOpacity="0.8" />
            <path d={`M${BUILD.x + 30} ${lanes[0].y}H${BUILD.x + 56}`} {...line} stroke="var(--color-deep)" strokeWidth="2" />
          </g>
          <g data-piece-part="component" data-component="input">
            <rect x={BUILD.x + 14} y={lanes[1].y - 10} width="64" height="20" rx="6" fill="none" stroke="var(--color-peach)" strokeWidth="1.5" />
            <path d={`M${BUILD.x + 24} ${lanes[1].y - 5}V${lanes[1].y + 5}`} {...line} stroke="var(--color-peach)" strokeWidth="1.8" />
          </g>
          <g data-piece-part="component" data-component="card">
            <rect x={BUILD.x + 14} y={lanes[2].y - 20} width="64" height="40" rx="7" fill="var(--illus-fill-soft)" stroke="var(--color-lilac)" strokeWidth="1.5" />
            <rect x={BUILD.x + 20} y={lanes[2].y - 14} width="20" height="16" rx="3" fill="var(--color-lilac)" fillOpacity="0.5" />
            <path d={`M${BUILD.x + 46} ${lanes[2].y - 9}H${BUILD.x + 70}M${BUILD.x + 46} ${lanes[2].y - 2}H${BUILD.x + 62}M${BUILD.x + 20} ${lanes[2].y + 11}H${BUILD.x + 70}`} {...line} stroke="var(--illus-line)" strokeOpacity="0.5" strokeWidth="1.8" />
          </g>
          <g data-piece-part="component" data-component="toggle">
            <rect x={BUILD.x + 14} y={lanes[3].y - 9} width="36" height="18" rx="9" fill="var(--color-cream)" fillOpacity="0.2" stroke="var(--color-cream)" strokeOpacity="0.6" strokeWidth="1.3" />
            <circle cx={BUILD.x + 41} cy={lanes[3].y} r="6" fill="var(--color-cream)" />
          </g>
        </g>
      </svg>
    </IllusFrame>
  );
}
