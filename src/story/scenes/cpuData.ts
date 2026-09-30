/**
 * Chapter 5 CPU: how the diagram assembles (shared by Cpu.tsx, the motion and tests).
 *
 * The package, its pins and the faint slot guides are the STRUCTURE: present from the
 * start, so the empty state reads as an intentional, waiting frame. The COMPONENTS
 * arrive one by one into their slots, each from a nearby direction; then the BUS
 * lines connect parts that are already seated, and the SIGNALS light up on them.
 * Pure data; viewBox units (420 × 420).
 */

export type CpuComponentId = 'core' | 'registers' | 'alu' | 'control' | 'cache';

export interface CpuEntry {
  id: CpuComponentId;
  /** Assembly order (0-based) = `data-cpu-order`. */
  order: number;
  /** Where it arrives from: offset from its seat (viewBox units), and a small rotation (deg). */
  dx: number;
  dy: number;
  rotate: number;
  /** Paint order when parts overlap in flight (higher = on top; later arrivals pass over seated ones). The DOM follows it. */
  z: number;
}

/** Components, in assembly order: the core first (the idea at the centre), then its neighbours. */
export const cpuComponents: readonly CpuEntry[] = [
  { id: 'core', order: 0, dx: 0, dy: -72, rotate: -8, z: 1 },
  { id: 'registers', order: 1, dx: -84, dy: 10, rotate: -6, z: 2 },
  { id: 'alu', order: 2, dx: 86, dy: -14, rotate: 10, z: 3 },
  { id: 'control', order: 3, dx: 24, dy: -78, rotate: 5, z: 4 },
  { id: 'cache', order: 4, dx: -18, dy: 76, rotate: -4, z: 5 },
];

/** A bus line: drawn (pathLength 1) only once both parts it joins are seated. */
export interface CpuBus {
  index: number;
  d: string;
  joins: readonly [CpuComponentId, CpuComponentId];
}

export const cpuBuses: readonly CpuBus[] = [
  { index: 0, d: 'M144 172H170', joins: ['registers', 'core'] },
  { index: 1, d: 'M144 200H170', joins: ['registers', 'core'] },
  { index: 2, d: 'M250 186H268', joins: ['core', 'alu'] },
  { index: 3, d: 'M250 214H268', joins: ['core', 'alu'] },
  { index: 4, d: 'M210 132V160', joins: ['control', 'core'] },
  { index: 5, d: 'M210 240V282', joins: ['core', 'cache'] },
  { index: 6, d: 'M318 186H340V250H279V282', joins: ['alu', 'cache'] }, // ends on the right-most cache cell
];

/** A signal: a spark on a bus, lit once that bus is drawn. */
export interface CpuSignal {
  index: number;
  bus: number;
  cx: number;
  cy: number;
}

export const cpuSignals: readonly CpuSignal[] = [
  { index: 0, bus: 4, cx: 210, cy: 148 },
  { index: 1, bus: 1, cx: 157, cy: 200 },
  { index: 2, bus: 3, cx: 259, cy: 214 },
  { index: 3, bus: 6, cx: 340, cy: 222 },
];

/** The assembly order of everything that moves: components, then the bus group, then signals. */
export const CPU_BUS_ORDER = cpuComponents.length;
export const CPU_SIGNALS_ORDER = cpuComponents.length + 1;

/** The order after which a bus can be drawn: the later of the two parts it joins. */
export const busReadyAfter = (bus: CpuBus): number =>
  Math.max(...bus.joins.map((id) => cpuComponents.find((c) => c.id === id)!.order));
