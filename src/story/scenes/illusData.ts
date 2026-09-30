/**
 * Shared data for the chapter illustrations: the recurring door, the solid-object depth,
 * the detour's bend and the building of ch 11 / 13.
 */

/**
 * The door (ch 7 closed, ch 17 the doorway drawn): they rhyme exactly.
 * `w × h` is the opening; `frame` the architrave's width around it (top and sides).
 */
export const DOOR = { w: 96, h: 190, frame: 10 } as const;

/**
 * How far each swung state's leaf reaches (fraction of the opening's width, from the left
 * hinge) and how much its free edge shrinks in perspective (top drop, bottom rise). Closed is
 * the flat leaf across the whole opening. Motion interpolates between these (ch 17).
 */
export const DOOR_SWING = {
  closed: { open: 1, drop: 0, rise: 0 },
  open: { open: 0.15, drop: 13, rise: 10 },
} as const;

/**
 * The swung leaf's geometry for a leaf `width` wide at the hinge side (DOOR.w = closed) and a
 * perspective `drop` / `rise` at its free edge: the leaf, its two recessed panels, its lit free
 * edge and the knob. Shared by Door and the ch 17 motion (it rewrites these paths).
 */
export function doorLeaf(width: number, drop: number, rise: number) {
  /** A point on the swung leaf: u across (0 hinge → 1 free edge), v down (0 → DH). */
  const DH = DOOR.h;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const at = (u: number, v: number) => `${r1(u * width)} ${r1(v * (1 - (u * (drop + rise)) / DH) + u * drop)}`;
  const quad = (u0: number, u1: number, v0: number, v1: number) => `M${at(u0, v0)}L${at(u1, v0)}L${at(u1, v1)}L${at(u0, v1)}Z`;
  return {
    width,
    leaf: `M0 0L${at(1, 0)}L${at(1, DH)}L0 ${DH}Z`,
    recess: `${quad(0.2, 0.85, 14, 14 + DH * 0.36)}${quad(0.2, 0.85, DH * 0.5, DH * 0.9)}`,
    edge: `M${at(1, 0)}h3.5V${r1(DH - rise)}h-3.5Z`,
    knob: [r1(width - 7), r1(DH * 0.52 + 2)] as const,
  };
}

/** The solid-object depth: the same receding top/side faces as ch 10's slabs (daysData STACK.depth). */
export const ISO = { dx: 22, dy: -14 } as const;

/**
 * The detour's bend (ch 14, in its 360 × 340 frame): the lit way leaves the straight
 * lane at the root (180, 340), turns off through the junction and runs straight toward
 * the side road's vanishing point on the horizon (`vanish`).
 */
export const DETOUR_BEND = {
  /** The lit way runs all the way to the side road's vanishing point (`vanish`). */
  d: 'M180 340 L180 314 C 180 290, 150 278, 136 250 L 64 98',
  root: [180, 340] as const,
  vanish: [64, 98] as const,
};

/**
 * The building of ch 11 and ch 13 (viewBox width × height): its front face (x, y, w, h),
 * its depth, and the window grid (cols × rows).
 */
export const BUILDING = {
  width: 260,
  height: 380,
  cols: 3,
  rows: 6,
  x: 44,
  y: 82,
  w: 150,
  h: 256,
  depth: { dx: 20, dy: -12 },
} as const;
/** The window that is "hers": lit in ch 11, the one still lit in ch 13. */
export const KEPT_WINDOW = { row: 3, col: 1 } as const;
/** The occupied (softly lit) rooms of ch 11, as "row-col": the rooms that go dark in ch 13. */
export const OCCUPIED_WINDOWS: ReadonlySet<string> = new Set(['0-0', '0-2', '1-1', '2-0', '2-2', '3-2', '4-0', '4-1', '5-2']);
/** dark · fading (going out) · soft (an occupied room) · kept (hers: the brightest). */
export type WindowState = 'dark' | 'fading' | 'soft' | 'kept';
