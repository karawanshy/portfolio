import { motion } from './config';

/**
 * The ONE animation loop and scroll source. Effects subscribe here instead of
 * adding their own scroll listeners or rAF loops.
 *
 * - `onScroll(fn)` runs once per frame, only on frames where the page scrolled or
 *   resized (plus once right after subscribing). One passive scroll listener feeds it.
 * - `onFrame(fn)` runs every frame while subscribed. Subscribers should unsubscribe
 *   when idle/offscreen; with no frame subscribers the loop sleeps.
 * The loop never runs while the tab is hidden.
 */
export interface FrameInfo {
  /** rAF timestamp (ms). */
  time: number;
  /** Seconds since the previous frame (clamped). */
  dt: number;
  scrollY: number;
  /** Smoothed scroll velocity (px/s, signed). */
  velocity: number;
  vw: number;
  vh: number;
  resized: boolean;
}

type Subscriber = (info: FrameInfo) => void;

const scrollSubs = new Set<Subscriber>();
const frameSubs = new Set<Subscriber>();

let raf = 0;
let lastTime = 0;
let lastY = 0;
let velocity = 0;
let scrollDirty = true;
let resizeDirty = true;
let listening = false;
const pending = new Set<Subscriber>();

function schedule() {
  if (!raf && typeof document !== 'undefined' && !document.hidden) raf = requestAnimationFrame(tick);
}

function tick(time: number) {
  raf = 0;
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 1 / 60;
  lastTime = time;
  const y = window.scrollY;
  // Two callbacks can share a timestamp (dt = 0): (y − lastY) / 0 is NaN or ±Infinity,
  // and a NaN velocity never settles (so the loop never sleeps) and poisons every
  // consumer (e.g. a ribbon's startOffset). Skip the velocity update on such frames.
  if (dt > 0) {
    const instant = (y - lastY) / dt;
    lastY = y;
    velocity += (instant - velocity) * (1 - Math.exp(-dt / motion.driver.velocitySmoothingS));
  }
  if (!Number.isFinite(velocity) || Math.abs(velocity) < 0.5) velocity = 0;

  const info: FrameInfo = {
    time,
    dt,
    scrollY: y,
    velocity,
    vw: window.innerWidth,
    vh: window.innerHeight,
    resized: resizeDirty,
  };
  if (scrollDirty || resizeDirty) {
    scrollSubs.forEach((fn) => fn(info));
  } else if (pending.size) {
    pending.forEach((fn) => fn(info));
  }
  pending.clear();
  scrollDirty = resizeDirty = false;
  frameSubs.forEach((fn) => fn(info));

  // Keep ticking only while something needs continuous frames (they read velocity, and it keeps
  // settling while they run). Nobody else reads it between scrolls: with no frame subscribers
  // the loop sleeps at once, velocity reset (a big jump used to keep it ticking for seconds).
  if (frameSubs.size > 0) schedule();
  else {
    lastTime = 0;
    velocity = 0;
  }
}

const onScrollEvent = () => {
  scrollDirty = true;
  schedule();
};
const onResizeEvent = () => {
  resizeDirty = true;
  schedule();
};
const onVisibility = () => {
  if (document.hidden) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastTime = 0;
  } else {
    resizeDirty = true;
    schedule();
  }
};

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  lastY = window.scrollY;
  window.addEventListener('scroll', onScrollEvent, { passive: true });
  window.addEventListener('resize', onResizeEvent, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
}

function unlistenIfIdle() {
  if (!listening || scrollSubs.size || frameSubs.size) return;
  listening = false;
  window.removeEventListener('scroll', onScrollEvent);
  window.removeEventListener('resize', onResizeEvent);
  document.removeEventListener('visibilitychange', onVisibility);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastTime = 0;
  velocity = 0;
}

/** Run `fn` on frames where the page scrolled or resized. Returns an unsubscribe. */
export function onScroll(fn: Subscriber): () => void {
  listen();
  scrollSubs.add(fn);
  pending.add(fn);
  schedule();
  return () => {
    scrollSubs.delete(fn);
    pending.delete(fn);
    unlistenIfIdle();
  };
}

/** Run `fn` every frame until unsubscribed. Returns an unsubscribe. */
export function onFrame(fn: Subscriber): () => void {
  listen();
  frameSubs.add(fn);
  schedule();
  return () => {
    frameSubs.delete(fn);
    unlistenIfIdle();
  };
}

/** Ask every scroll subscriber to re-measure on the next frame (e.g. after a layout change). */
export function invalidate() {
  resizeDirty = true;
  schedule();
}
