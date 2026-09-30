/**
 * Chapter 10 — six days: a small service built layer by layer (days 1–5, bottom up),
 * then verified by a test rail (day 6) that checks every layer. Shared by Days.tsx,
 * the motion and tests. Pure data; SVG user units (the drawing spans about x 98–396, y 104–332).
 *
 * No day numbers are drawn.
 */

export type DayKind = 'build' | 'tests';

export interface Day {
  /** 1…6 = `data-day`. */
  day: number;
  kind: DayKind;
  /** What the day added (from the chapter's Dive Deeper; for reference, never rendered). */
  about: string;
  /** Assembly order (0-based) = `data-day-order`. */
  order: number;
  /** Where it arrives from: offset from its seat (viewBox units) and a small rotation (deg). */
  dx: number;
  dy: number;
  rotate: number;
}

export const days: readonly Day[] = [
  { day: 1, kind: 'build', about: 'Foundation: project setup and database structure', order: 0, dx: 0, dy: -64, rotate: -3 },
  { day: 2, kind: 'build', about: 'Authentication and security', order: 1, dx: 0, dy: -64, rotate: 3 },
  { day: 3, kind: 'build', about: 'API design and the core logic', order: 2, dx: 0, dy: -64, rotate: -2 },
  { day: 4, kind: 'build', about: 'Migrations, organisation and scalability', order: 3, dx: 0, dy: -64, rotate: 2 },
  { day: 5, kind: 'build', about: 'Finishing the implementation', order: 4, dx: 0, dy: -56, rotate: -2 },
  { day: 6, kind: 'tests', about: 'A full day of tests', order: 5, dx: 56, dy: 0, rotate: 0 },
];

/** The stack's front faces: x, width, and each build layer's top y and height (bottom up). */
export const STACK = { x: 118, w: 204, depth: { dx: 22, dy: -14 } } as const;
export const layers: Readonly<Record<number, { y: number; h: number }>> = {
  1: { y: 290, h: 42 },
  2: { y: 248, h: 42 },
  3: { y: 206, h: 42 },
  4: { y: 164, h: 42 },
  5: { y: 132, h: 32 },
};

/** The test rail (day 6): its x, top and bottom. */
export const RAIL = { x: 372, top: 141, bottom: 318 } as const;

/** The centre line of a build layer's front face. */
export const layerMid = (day: number) => layers[day]!.y + layers[day]!.h / 2;
