/** Deterministic PRNG (mulberry32): the same art on the server and the client (prerender-safe). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round to 1 decimal for compact SVG path data. */
export const r1 = (n: number) => Math.round(n * 10) / 10;
