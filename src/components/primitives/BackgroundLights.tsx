import { useRef, type CSSProperties } from 'react';
import { motion } from '@/motion/config';
import { useTimeOfDay } from '@/motion/useTimeOfDay';
import { GRAIN } from './grain';

/**
 * Page atmosphere: base vertical gradient + six soft light pools, laid out on a
 * fixed-height field at the top of the page (--pool-field-h ≈ the page height per
 * layout, so the sky reads sunset at the top → night mid-page → warm glow lower down).
 * Pools are placed in % of that FIXED height, never of the live page height, so a
 * font swap or late layout change can't move them (no layout shift). The field is
 * clipped to the page.
 *
 * plus a fixed, static SVG grain over everything. All decorative, aria-hidden.
 *
 * Pools mirror the desktop artboard exactly (radii + % positions over the page).
 * Each pool is its own element and drifts with the CSS `translate`/`scale`
 * properties only (see `.pool-drift` in global.css — enabled when motion is on).
 * On small screens pools shrink (per the mobile artboard) via --pool-scale.
 *
 * Time of day: two fixed sky overlays (late night, sunrise) whose opacity follows
 * the scroll position (useTimeOfDay). At the top both are 0, so the page opens on
 * the static sunset; gradients are painted once and only opacity changes.
 * The fixed layers are as tall as the large viewport (lvh): no bare strip while a phone's toolbars slide away.
 */
interface Pool {
  /** Ellipse radii in px at desktop. */
  rx: number;
  ry: number;
  /** Center, as % of the page width / of the pool field height. */
  x: number;
  y: number;
  color: string; // rgb triplet
  opacity: number;
}

const pools: Pool[] = [
  { rx: 760, ry: 560, x: 86, y: 8, color: '255 61 139', opacity: 0.34 }, // pink, top-right
  { rx: 640, ry: 520, x: 6, y: 12, color: '255 138 61', opacity: 0.2 }, // tangerine, top-left
  { rx: 760, ry: 600, x: 92, y: 24, color: '185 163 255', opacity: 0.14 }, // lilac, right
  { rx: 800, ry: 640, x: 4, y: 40, color: '255 61 139', opacity: 0.14 }, // pink, left-middle
  { rx: 760, ry: 620, x: 96, y: 58, color: '185 163 255', opacity: 0.18 }, // lilac, right-lower
  { rx: 760, ry: 620, x: 10, y: 74, color: '255 138 61', opacity: 0.14 }, // tangerine, left-lower
];

/** Per-pool drift: each heads a different way at a slightly different pace. */
function drift(i: number): CSSProperties {
  const { driftAmplitude: a, driftDurationS: d, driftScale } = motion.lights;
  const angle = (i * 137.5 * Math.PI) / 180; // golden-angle spread
  return {
    ['--drift-x' as string]: `calc(${(Math.cos(angle) * a).toFixed(1)}px * var(--pool-scale))`,
    ['--drift-y' as string]: `calc(${(Math.sin(angle) * a * 0.7).toFixed(1)}px * var(--pool-scale))`,
    ['--drift-scale' as string]: String(driftScale),
    ['--drift-dur' as string]: `${(d * (0.8 + ((i * 7) % 5) * 0.1)).toFixed(1)}s`,
    ['--drift-delay' as string]: `${(-d * ((i * 3) % 4) * 0.25).toFixed(1)}s`,
  };
}

export function BackgroundLights() {
  const nightRef = useRef<HTMLDivElement>(null);
  const dawnRef = useRef<HTMLDivElement>(null);
  useTimeOfDay(nightRef, dawnRef);
  return (
    <>
      <div
        aria-hidden="true"
        data-background-lights
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [--pool-scale:0.5] lg:[--pool-scale:1]"
        style={{ background: 'var(--gradient-page-base)' }}
      >
        <div className="absolute inset-x-0 top-0" style={{ height: 'var(--pool-field-h)' }}>
          {pools.map((p, i) => {
            const style: CSSProperties = {
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `calc(${p.rx * 2}px * var(--pool-scale))`,
              height: `calc(${p.ry * 2}px * var(--pool-scale))`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(closest-side, rgb(${p.color} / ${p.opacity}), rgb(${p.color} / 0) 70%)`,
              ...drift(i),
            };
            return <div key={i} data-pool={i} className="pool-drift" style={style} />;
          })}
        </div>
      </div>
      {/* Sky overlays: above the pools, below the page's sunrise glow (-z-5) and content. */}
      <div
        ref={nightRef}
        aria-hidden="true"
        data-tod="night"
        className="pointer-events-none fixed inset-x-0 top-0 -z-[8] h-lvh opacity-0"
        style={{ background: 'var(--tod-night)' }}
      />
      <div
        ref={dawnRef}
        aria-hidden="true"
        data-tod="dawn"
        className="pointer-events-none fixed inset-x-0 top-0 -z-[7] h-lvh opacity-0"
        style={{ background: 'var(--tod-dawn)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-lvh"
        style={{ backgroundImage: GRAIN, opacity: 'var(--grain-opacity)' }}
      />
    </>
  );
}
