/**
 * The hero portrait — the ONE place the photo is imported.
 *
 * To swap in a cleaner cutout: run
 *   node scripts/optimize-portrait.mjs <path-to-new-cutout.png>
 * which regenerates the two WebP files below. Nothing else needs to change.
 * (Intrinsic size of the source cutout: 900×1159.)
 */
import portrait360 from './portrait/karawan-360.webp';
import portrait720 from './portrait/karawan-720.webp';

export const portrait = {
  /** 1x fallback / default: the 360w file. */
  src: portrait360,
  srcSet: `${portrait360} 360w, ${portrait720} 720w`,
  /** Slot widths: desktop 228–300px, tablet 193px, phone up to 160px (see heroGeometry photo). */
  sizes: '(min-width: 1024px) 300px, (min-width: 768px) 193px, 160px',
  width: 720,
  height: 927,
} as const;
