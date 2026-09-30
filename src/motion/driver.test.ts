import type { FrameInfo } from './driver';

/** Manual rAF: frames run only when the test calls `frame(time)`. */
function stubRaf() {
  let queue: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.push(cb);
    return queue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    queue = [];
  });
  return {
    frame(time: number) {
      const run = queue;
      queue = [];
      run.forEach((cb) => cb(time));
    },
    get pending() {
      return queue.length;
    },
  };
}

const scrollTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
};

describe('motion driver', () => {
  beforeEach(() => {
    vi.resetModules();
    scrollTo(0);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps velocity finite when two frames share a timestamp, and goes back to sleep', async () => {
    const raf = stubRaf();
    const { onScroll } = await import('./driver');
    const seen: FrameInfo[] = [];
    const stop = onScroll((info) => seen.push(info));

    raf.frame(1000);
    scrollTo(40);
    raf.frame(1016);
    scrollTo(80);
    raf.frame(1016); // same timestamp: dt = 0
    scrollTo(120);
    raf.frame(1032);

    expect(seen.length).toBeGreaterThan(2);
    for (const info of seen) expect(Number.isFinite(info.velocity)).toBe(true);
    expect(seen.at(-1)!.velocity).toBeGreaterThan(0);

    // With the page still, velocity settles to exactly 0 and the loop stops.
    let t = 1032;
    for (let i = 0; i < 200 && raf.pending; i++) raf.frame((t += 16));
    expect(raf.pending).toBe(0);
    stop();
  });
});
