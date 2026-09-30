import type { CSSProperties, ReactNode } from 'react';
import { days, layerMid, layers, RAIL, STACK } from './daysData';
import { HalfSun, IllusFrame } from './illusParts';

/**
 * Chapter 10 — six days. A small service rises layer by layer, one layer a day:
 * the foundation and its data (1), a lock and a three-part token (2), the core and
 * its routes (3), versioned steps and ordered modules (4), and a finished cap with
 * a first light in it (5). Beside it, day 6: a test rail that checks every layer.
 * No numbers and no ground line: just the stack and its checks. Abstract, not a UI.
 * The static markup is the finished state (all six days done). Data in daysData.ts.
 *
 * Hooks:
 *   [data-illus="days"] · svg[data-scene-part="days"]
 *   g[data-day="1…6"][data-day-kind="build|tests"][data-day-order=N]
 *       with its entry: data-day-dx / data-day-dy (arrives from seat + offset),
 *       data-day-rotate (deg); transform-box: fill-box, origin at its centre
 *   g[data-day-check="N"]               day 6's check on layer N (inside day 6)
 *   path[data-day-rail][pathLength=1]   day 6's rail (drawable)
 * Decorative.
 */

/** The drawing's own box (content x 98–396, y 104–332, plus a margin). */
const VIEW = '84 96 328 250';
const { x: X, w: FW, depth: D } = STACK;
const line = { fill: 'none', stroke: 'var(--illus-line)', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const movable: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

/** One slab of the stack: front face, right side and top face (the top shows only on the cap). */
function Slab({ y, h, children }: { y: number; h: number; children: ReactNode }) {
  return (
    <>
      <path d={`M${X} ${y}L${X + D.dx} ${y + D.dy}H${X + FW + D.dx}L${X + FW} ${y}Z`} fill="var(--days-top)" stroke="var(--illus-line-dim)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d={`M${X + FW} ${y}L${X + FW + D.dx} ${y + D.dy}V${y + h + D.dy}L${X + FW} ${y + h}Z`} fill="var(--days-side)" stroke="var(--illus-line-dim)" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x={X} y={y} width={FW} height={h} fill="url(#days-front)" stroke="var(--illus-line-dim)" strokeWidth="1.2" />
      {children}
    </>
  );
}

/** Each build day's contents, drawn on its slab's front face. */
function contents(day: number): ReactNode {
  const c = layerMid(day);
  switch (day) {
    case 1: // foundation: a database and its tables
      return (
        <>
          <path d={`M${X + 20} ${c - 8}v15a13 4 0 0 0 26 0v-15`} {...line} />
          <ellipse cx={X + 33} cy={c - 8} rx="13" ry="4" {...line} />
          {[68, 116, 164].map((dx, i) => (
            <g key={i}>
              <rect x={X + dx} y={c - 10} width="32" height="20" rx="3" {...line} strokeWidth={1.6} />
              <path d={`M${X + dx} ${c - 3}h32`} {...line} strokeWidth={1.2} stroke="var(--illus-line-dim)" />
            </g>
          ))}
          <path d={`M${X + 100} ${c + 2}h16M${X + 148} ${c + 2}h16`} {...line} strokeWidth={1.2} stroke="var(--illus-line-dim)" />
        </>
      );
    case 2: // auth: a lock, and a token in three parts
      return (
        <>
          <path d={`M${X + 27} ${c - 1}v-5a6 6 0 0 1 12 0v5`} {...line} />
          <rect x={X + 22} y={c - 1} width="22" height="14" rx="3" {...line} fill="var(--color-peach)" fillOpacity="0.2" />
          {(
            [
              [70, 34, 'var(--color-pink)'],
              [116, 40, 'var(--color-lilac)'],
              [168, 26, 'var(--color-peach)'],
            ] as const
          ).map(([dx, w, color], i) => (
            <g key={i}>
              <rect x={X + dx} y={c - 4} width={w} height="8" rx="4" fill={color} fillOpacity="0.75" />
              {i < 2 && <circle cx={X + dx + w + 6} cy={c} r="1.8" fill="var(--illus-line)" />}
            </g>
          ))}
        </>
      );
    case 3: // API: the core, and routes out of it (fanned wide enough that the heads stay apart)
      return (
        <>
          <circle cx={X + 33} cy={c} r="10" {...line} />
          <circle cx={X + 33} cy={c} r="3.5" fill="var(--color-tangerine)" />
          {[-12, 0, 12].map((o, i) => {
            const end = X + 146 + i * 20;
            return <path key={i} d={`M${X + 52} ${c}C${X + 70} ${c} ${X + 72} ${c + o} ${X + 90} ${c + o}H${end}m-5 -4l5 4l-5 4`} {...line} strokeWidth={1.8} />;
          })}
        </>
      );
    case 4: // migrations and scale: versioned steps (a staircase of slabs, each one up), ordered modules
      return (
        <>
          {[0, 1, 2].map((i) => {
            const x = X + 12 + i * 11;
            const y = c + 7 - i * 8;
            return (
              <g key={i} fillOpacity={0.4 + i * 0.25}>
                {/* A step: a thin slab with its top face, like the stack's own layers. */}
                <path d={`M${x} ${y}l4 -3h16l-4 3Z`} fill="var(--color-lilac)" fillOpacity={0.5} />
                <rect x={x} y={y} width="16" height="6" rx="1.2" fill="var(--color-lilac)" />
              </g>
            );
          })}
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={X + 72 + (i % 6) * 20} y={c - 12 + Math.floor(i / 6) * 14} width="15" height="10" rx="2.5" {...line} strokeWidth={1.4} />
          ))}
        </>
      );
    default: // finishing: a clean cap, with a first light in its seam
      return (
        <>
          <path d={`M${X + 16} ${c + 4}H${X + FW / 2 - 16}M${X + FW / 2 + 16} ${c + 4}H${X + FW - 16}`} stroke="var(--color-peach)" strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" />
          <HalfSun cx={X + FW / 2} cy={c + 4} r={9} fill="var(--color-tangerine)" />
        </>
      );
  }
}

export function Days() {
  const tests = days.find((d) => d.kind === 'tests')!;
  const build = days.filter((d) => d.kind === 'build');
  return (
    <IllusFrame name="days" size="lane-days">
      <svg data-scene-part="days" viewBox={VIEW} className="w-full overflow-visible">
        <defs>
          <linearGradient id="days-front" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-plum-surface)" />
            <stop offset="1" stopColor="var(--color-ink)" />
          </linearGradient>
        </defs>

        {build.map((d) => {
          const { y, h } = layers[d.day]!;
          return (
            <g
              key={d.day}
              data-day={d.day}
              data-day-kind={d.kind}
              data-day-order={d.order}
              data-day-dx={d.dx}
              data-day-dy={d.dy}
              data-day-rotate={d.rotate}
              style={movable}
            >
              <Slab y={y} h={h}>{contents(d.day)}</Slab>
            </g>
          );
        })}

        {/* Day 6: the tests — a rail beside the stack, checking every layer. */}
        <g
          data-day={tests.day}
          data-day-kind={tests.kind}
          data-day-order={tests.order}
          data-day-dx={tests.dx}
          data-day-dy={tests.dy}
          data-day-rotate={tests.rotate}
          style={movable}
        >
          <path data-day-rail pathLength={1} d={`M${RAIL.x} ${RAIL.top}V${RAIL.bottom}`} stroke="var(--field-pass)" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
          {build.map((d) => {
            const c = layerMid(d.day) + STACK.depth.dy / 2;
            return (
              <g key={d.day} data-day-check={d.day} style={{ filter: 'var(--field-pass-glow)' }}>
                <path d={`M${X + FW + D.dx + 6} ${c}H${RAIL.x - 9}`} stroke="var(--field-pass)" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="2 4" strokeLinecap="round" />
                <circle cx={RAIL.x} cy={c} r="8" fill="var(--color-ink)" stroke="var(--field-pass)" strokeWidth="1.6" />
                <path d={`M${RAIL.x - 3.5} ${c}l2.5 2.6l4.8 -5`} fill="none" stroke="var(--field-pass)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}
        </g>
      </svg>
    </IllusFrame>
  );
}
