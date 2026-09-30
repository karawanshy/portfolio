import { describe, expect, it } from 'vitest';
import { busReadyAfter, cpuBuses, cpuComponents, cpuSignals, CPU_BUS_ORDER, CPU_SIGNALS_ORDER } from './cpuData';

describe('ch 5 CPU assembly data', () => {
  it('orders the components 0…n−1, then the bus, then the signals', () => {
    expect(cpuComponents.map((c) => c.order)).toEqual([...cpuComponents.keys()]);
    expect(CPU_BUS_ORDER).toBe(cpuComponents.length);
    expect(CPU_SIGNALS_ORDER).toBe(CPU_BUS_ORDER + 1);
    expect(new Set(cpuComponents.map((c) => c.z)).size).toBe(cpuComponents.length);
  });

  it('brings components in from nearby, varied directions, with a small rotation', () => {
    for (const c of cpuComponents) {
      const dist = Math.hypot(c.dx, c.dy);
      expect(dist).toBeGreaterThan(40);
      expect(dist).toBeLessThan(120);
      expect(Math.abs(c.rotate)).toBeLessThanOrEqual(12);
    }
    const sides = new Set(cpuComponents.map((c) => (Math.abs(c.dx) > Math.abs(c.dy) ? (c.dx > 0 ? 'right' : 'left') : c.dy > 0 ? 'below' : 'above')));
    expect(sides.size).toBeGreaterThanOrEqual(3);
  });

  it('connects only seated parts, and lights signals on existing buses', () => {
    const ids = new Set(cpuComponents.map((c) => c.id));
    for (const b of cpuBuses) {
      b.joins.forEach((id) => expect(ids.has(id)).toBe(true));
      expect(busReadyAfter(b)).toBeLessThan(CPU_BUS_ORDER);
    }
    for (const s of cpuSignals) expect(cpuBuses.some((b) => b.index === s.bus)).toBe(true);
  });
});
