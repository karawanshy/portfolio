import { CI, FIELD, ciMaskStops, ciPath, fieldPaths } from './fieldData';

/** The static state is the resolved one (no-JS, reduced motion): every test passing, the CI line steady green. */
const after = fieldPaths(1);
const stops = ciMaskStops(1);
const line = ciPath(1);

/**
 * Chapter 12: a field of 625 tests over the CI line. Static markup = the resolved
 * "after" (all green, a steady line). Motion (useStoryScenes) scrubs it back to failing
 * and replays the fix: dots flip to green suite by suite (setFieldProgress; the latest
 * batch blooms in path[data-dots-fresh]) and the line heals left → right
 * (setCiStability: the same path in two colours, each masked by a gradient whose stops
 * follow the front, so failing pink gives way to steady green with no dimming).
 * Decorative.
 *
 * Hooks: [data-scene-part="field"] (the SVG), path[data-dots=…], path[data-dots-fresh],
 * path[data-ci-line] (failing), path[data-ci-steady] (steady), path[data-ci-pulse]
 * (the "green build" glint, hidden), stop[data-ci-stop], rect[data-field-halo].
 */
export function FailureField() {
  const dot = { strokeLinecap: 'round' as const, strokeWidth: FIELD.dotSize, fill: 'none' };
  const lineProps = { fill: 'none', strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const pad = CI.maskPad;
  const maskRect = { x: -pad, y: -pad, width: CI.width + 2 * pad, height: CI.height + 2 * pad };
  const gradient = (k: 'heal' | 'fail', first: string, last: string) => (
    <linearGradient id={`ci-${k}-grad`} gradientUnits="userSpaceOnUse" x1={-pad} x2={CI.width + pad} y1="0" y2="0">
      <stop data-ci-stop={`${k}-0`} offset={stops[k][0]} stopColor={first} />
      <stop data-ci-stop={`${k}-1`} offset={stops[k][1]} stopColor={last} />
    </linearGradient>
  );
  return (
    // Phones/tablets: sized so the pin keeps the field near full size with the heading and lines.
    <div aria-hidden="true" className="relative w-full max-w-[270px] md:max-w-[320px] lg:w-[min(340px,25vw)] lg:max-w-none">
      <svg
        data-scene-part="field"
        viewBox={`0 0 ${FIELD.size} ${FIELD.size + CI.height + 28}`}
        className="w-full overflow-visible"
      >
        <defs>
          {/* white = shown: the steady line left of the front, the failing line right of it */}
          {gradient('heal', 'white', 'black')}
          {gradient('fail', 'black', 'white')}
          <mask id="ci-heal-mask" maskUnits="userSpaceOnUse" {...maskRect}>
            <rect {...maskRect} fill="url(#ci-heal-grad)" />
          </mask>
          <mask id="ci-fail-mask" maskUnits="userSpaceOnUse" {...maskRect}>
            <rect {...maskRect} fill="url(#ci-fail-grad)" />
          </mask>
        </defs>
        <rect
          x="-6"
          y="-6"
          width={FIELD.size + 12}
          height={FIELD.size + 12}
          rx="28"
          fill="var(--field-frame)"
          stroke="var(--field-frame-edge)"
        />
        {/* The frame's edge lights green as the suite passes (motion scrubs its opacity with the fix ratio). */}
        <rect
          data-field-halo
          x="-6"
          y="-6"
          width={FIELD.size + 12}
          height={FIELD.size + 12}
          rx="28"
          fill="none"
          stroke="var(--field-pass)"
          style={{ strokeOpacity: 'var(--field-halo)', filter: 'var(--field-pass-glow)' }}
        />
        {/* Passing dots: lit green with a soft glow, never dimmer than the failures. */}
        <path data-dots="pass" d={after.pass} stroke="var(--field-pass)" style={{ filter: 'var(--field-pass-glow)' }} {...dot} />
        <path data-dots="fail" d={after.fail} stroke="var(--field-fail)" {...dot} />
        <path data-dots="fail-alt" d={after.failAlt} stroke="var(--field-fail-2)" {...dot} />
        {/* The batch that just passed: a brief bloom (bigger, brighter) on top. Empty when static. */}
        <path
          data-dots-fresh
          d={after.fresh}
          stroke="var(--field-fresh)"
          style={{ filter: 'var(--field-fresh-glow)' }}
          {...dot}
          strokeWidth={FIELD.dotSize * 1.45}
        />

        <rect x="-6" y={FIELD.size + 16} width={FIELD.size + 12} height={CI.height + 24} rx="20" fill="var(--field-frame)" stroke="var(--field-frame-edge)" />
        <g transform={`translate(0 ${FIELD.size + 28})`}>
          <line x1="0" x2={CI.width} y1={CI.height / 2} y2={CI.height / 2} stroke="var(--ci-track)" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
          <path
            data-ci-line
            d={line}
            stroke="var(--ci-unstable)"
            strokeWidth="3"
            mask="url(#ci-fail-mask)"
            style={{ filter: 'drop-shadow(0 0 8px var(--ci-unstable))' }}
            {...lineProps}
          />
          <path
            data-ci-steady
            d={line}
            stroke="var(--ci-steady)"
            strokeWidth="5.5"
            mask="url(#ci-heal-mask)"
            style={{ filter: 'var(--ci-steady-glow)' }}
            {...lineProps}
          />
          {/* "Green build": a short glint that runs along the healed line once (motion only). */}
          <path
            data-ci-pulse
            d={line}
            pathLength={1}
            stroke="var(--ci-pulse)"
            strokeWidth="5"
            strokeDasharray="0.12 2"
            strokeDashoffset="0.12"
            opacity={0}
            style={{ filter: 'var(--ci-steady-glow)' }}
            {...lineProps}
          />
        </g>
      </svg>
    </div>
  );
}
