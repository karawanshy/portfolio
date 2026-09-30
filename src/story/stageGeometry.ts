import { r1, seeded } from './scenes/rng';

/**
 * Story stage geometry — the one place to tune the stage art's shapes: the star field.
 * (The sun is laid out by tokens.css --story-sun-* and driven by motion.story.sun.)
 */
function stars(count: number, seed: number): string {
  const rand = seeded(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    // Denser and brighter toward the zenith; none near the horizon glow.
    const y = Math.pow(rand(), 1.6) * 560;
    const x = rand() * 1440;
    d += `M${r1(x)} ${r1(y)}h0`;
  }
  return d;
}

export const stageGeometry = {
  /** Star field (upper sky), one path of round-capped zero-length segments; two sizes. */
  stars: {
    viewBox: { width: 1440, height: 900 },
    small: stars(90, 7),
    large: stars(18, 29),
  },
} as const;
