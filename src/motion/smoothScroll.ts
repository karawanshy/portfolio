import { onFrame, type FrameInfo } from './driver';

export interface SmoothScrollOptions {
  /** Time constant of the critically damped (exponential) approach, ms. */
  tauMs: number;
  /** Within this many px of the target it snaps exactly onto it and stops. */
  settlePx: number;
  /** Moves larger than this × vh (anchor jumps) snap at once. */
  jumpVh: number;
  /** Present on this element (as `data-<flag>`) while the value is still easing (tests wait on it). */
  flag?: { el: HTMLElement | null; name: string };
}

/**
 * A smoothed scroll position for scroll-scrubbed motion. `set(scrollY)` (from the driver's
 * `onScroll`) moves the target; the displayed value eases toward it on the driver's frame loop
 * (subscribed only while it is moving, so the loop sleeps once settled) and snaps exactly onto
 * it within `settlePx` — no drift, and fully reversible (it is a function of the scroll only
 * once settled). `render(y, vh)` is called with the displayed value whenever it changes.
 * It never touches the page's own scrolling.
 */
export function createSmoothScroll(render: (y: number, vh: number) => void, o: SmoothScrollOptions) {
  let y = NaN;
  let target = 0;
  let vh = 0;
  let stopFrames: (() => void) | null = null;
  const flag = (on: boolean) => {
    if (!o.flag?.el) return;
    if (on) o.flag.el.setAttribute(`data-${o.flag.name}`, '');
    else o.flag.el.removeAttribute(`data-${o.flag.name}`);
  };
  const stop = () => {
    stopFrames?.();
    stopFrames = null;
    flag(false);
  };
  const tick = (info: FrameInfo) => {
    const k = 1 - Math.exp(-(info.dt * 1000) / o.tauMs);
    y += (target - y) * k;
    if (Math.abs(target - y) <= o.settlePx) {
      y = target;
      stop();
    }
    render(y, vh);
  };
  return {
    /** New target. First call, big jumps and `snap` land at once. */
    set(scrollY: number, viewportH: number, snap = false) {
      target = scrollY;
      vh = viewportH;
      if (snap || !Number.isFinite(y) || Math.abs(target - y) > o.jumpVh * vh || Math.abs(target - y) <= o.settlePx) {
        y = target;
        stop();
        render(y, vh);
      } else if (!stopFrames) {
        stopFrames = onFrame(tick);
        flag(true);
      }
    },
    /** The displayed value (NaN before the first `set`). */
    get value() {
      return y;
    },
    dispose: stop,
  };
}
