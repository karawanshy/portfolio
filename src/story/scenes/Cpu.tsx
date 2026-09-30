import type { CSSProperties, ReactNode } from 'react';
import { cpuBuses, cpuComponents, cpuSignals, CPU_BUS_ORDER, CPU_SIGNALS_ORDER, type CpuComponentId } from './cpuData';

/**
 * Chapter 5: a CPU-style diagram that assembles. The STRUCTURE (package, pins and
 * faint dashed slot guides where each part belongs) is there from the start, so the
 * empty state reads as a waiting frame; the COMPONENTS arrive into their slots, then
 * the BUS lines connect seated parts and the SIGNALS light up. No labels: it's a
 * diagram's shape, not a spec. Entry data lives in cpuData.ts. The static markup is
 * the finished machine (no-JS / reduced motion).
 *
 * Hooks:
 *   [data-scene-part="cpu"]                     the SVG
 *   g[data-cpu-structure]                       package + pins (never moves)
 *   [data-cpu-slot="<id>"]                      a component's dashed slot guide
 *   g[data-cpu-part="<id>"][data-cpu-order=N]   a component (N = 0…4), with its entry:
 *       data-cpu-dx / data-cpu-dy (arrives from its seat + offset), data-cpu-rotate (deg),
 *       data-cpu-z; transform-box: fill-box, origin at its centre
 *   g[data-cpu-part="bus"][data-cpu-order=5]    › path[data-cpu-bus=i][data-joins="a b"][pathLength=1]
 *   g[data-cpu-part="signals"][data-cpu-order=6] › circle[data-cpu-signal=i][data-bus=b]
 * Decorative.
 */

const S = 420; // viewBox
const PKG = { x: 70, y: 70, w: 280, h: 280 };

/** Pins: short ticks on all four sides of the package, one path. */
const pins = (() => {
  let d = '';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = PKG.x + 30 + (i * (PKG.w - 60)) / (n - 1);
    d += `M${t} ${PKG.y - 26}V${PKG.y - 6}`; // top
    d += `M${t} ${PKG.y + PKG.h + 6}V${PKG.y + PKG.h + 26}`; // bottom
    d += `M${PKG.x - 26} ${t}H${PKG.x - 6}`; // left
    d += `M${PKG.x + PKG.w + 6} ${t}H${PKG.x + PKG.w + 26}`; // right
  }
  return d;
})();

const cacheCells = Array.from({ length: 12 }, (_, i) => ({ x: 128 + (i % 6) * 28, y: 282 + Math.floor(i / 6) * 22 }));
const registers = Array.from({ length: 5 }, (_, i) => ({ x: 96, y: 148 + i * 26 }));

/** Slot guides (padded around each seat): x, y, w, h, rx. */
const slots: Record<CpuComponentId, readonly [number, number, number, number, number]> = {
  core: [162, 152, 96, 96, 20],
  registers: [89, 141, 62, 131, 11],
  alu: [261, 155, 64, 62, 12],
  control: [153, 89, 114, 50, 15],
  cache: [121, 277, 176, 48, 11],
};

const line = { fill: 'none', stroke: 'var(--cpu-line)', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Each component's art, at its seat. */
const art: Record<CpuComponentId, ReactNode> = {
  core: (
    <>
      <rect x="170" y="160" width="80" height="80" rx="14" {...line} fill="url(#cpu-core)" />
      <rect x="188" y="178" width="44" height="44" rx="8" fill="none" stroke="var(--color-cream)" strokeOpacity="0.5" strokeWidth="1.5" />
    </>
  ),
  // The ALU: the classic notched V shape.
  alu: <path d="M268 162 L318 162 L318 178 L308 186 L318 194 L318 210 L268 210 L284 186 Z" {...line} fill="var(--cpu-fill)" />,
  registers: (
    <>
      {registers.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width="48" height="16" rx="5" {...line} strokeWidth={2} fill="var(--cpu-fill)" />
      ))}
    </>
  ),
  control: (
    <>
      <rect x="160" y="96" width="100" height="36" rx="10" {...line} fill="var(--cpu-fill)" />
      <path d="M176 114 H200 M210 114 H244" {...line} strokeWidth={2} stroke="var(--cpu-line-dim)" />
    </>
  ),
  cache: (
    <>
      {cacheCells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width="22" height="16" rx="4" {...line} strokeWidth={1.8} fill="var(--cpu-fill)" />
      ))}
    </>
  ),
};

/** transform-ready: translate / rotate about the group's own centre. */
const movable: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

export function Cpu() {
  return (
    <div aria-hidden="true" className="relative w-full max-w-[360px] lg:w-[min(360px,27vw)] lg:max-w-none">
      <svg data-scene-part="cpu" viewBox={`0 0 ${S} ${S}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="cpu-package" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-plum-surface)" />
            <stop offset="1" stopColor="var(--color-ink)" />
          </linearGradient>
          <linearGradient id="cpu-core" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-lilac)" stopOpacity="0.45" />
            <stop offset="1" stopColor="var(--color-chess-dark)" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <g data-cpu-structure>
          <rect x={PKG.x} y={PKG.y} width={PKG.w} height={PKG.h} rx="26" {...line} fill="url(#cpu-package)" stroke="var(--cpu-line-dim)" />
          <circle cx={PKG.x + 22} cy={PKG.y + 22} r="5" fill="var(--cpu-line-dim)" />
          <path d={pins} {...line} stroke="var(--cpu-line-dim)" strokeWidth={4} />
          {/* Slot guides: where each part belongs (faint, dashed; they stay as sockets). */}
          {cpuComponents.map(({ id }) => {
            const [x, y, w, h, rx] = slots[id];
            return (
              <rect key={id} data-cpu-slot={id} x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke="var(--cpu-line-dim)" strokeWidth={1.2} strokeDasharray="3 6" strokeLinecap="round" />
            );
          })}
        </g>

        {/* Components, painted in their z order (lowest first). */}
        {[...cpuComponents]
          .sort((a, b) => a.z - b.z)
          .map((c) => (
            <g
              key={c.id}
              data-cpu-part={c.id}
              data-cpu-order={c.order}
              data-cpu-dx={c.dx}
              data-cpu-dy={c.dy}
              data-cpu-rotate={c.rotate}
              data-cpu-z={c.z}
              style={movable}
            >
              {art[c.id]}
            </g>
          ))}

        <g data-cpu-part="bus" data-cpu-order={CPU_BUS_ORDER}>
          {cpuBuses.map((b) => (
            <path key={b.index} data-cpu-bus={b.index} data-joins={b.joins.join(' ')} pathLength={1} d={b.d} {...line} strokeWidth={2} stroke="var(--cpu-line-dim)" />
          ))}
        </g>

        <g data-cpu-part="signals" data-cpu-order={CPU_SIGNALS_ORDER} fill="var(--cpu-spark)" style={{ filter: 'drop-shadow(0 0 6px var(--cpu-spark))' }}>
          {cpuSignals.map((g) => (
            <circle key={g.index} data-cpu-signal={g.index} data-bus={g.bus} cx={g.cx} cy={g.cy} r="4" style={movable} />
          ))}
        </g>
      </svg>
    </div>
  );
}
