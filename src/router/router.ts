/**
 * A tiny History-API router. The site has exactly two routes (`/` and `/story`),
 * so a routing library would be dead weight. Unknown paths are replaced with `/`.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { onScroll } from '@/motion/driver';
import { hashElement } from './hash';

export type Route = 'portfolio' | 'story';

const ROUTES: Record<string, Route> = { '/': 'portfolio', '/story': 'story' };

function normalize(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function resolveRoute(pathname: string): Route | null {
  return ROUTES[normalize(pathname)] ?? null;
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}
/**
 * While a back/forward transition captures the old page (transition.ts), the route stays
 * on the path it's leaving: `heldPath` is what React sees until `releaseRoute()`.
 */
let heldPath: string | null = null;
const getPath = (): string => heldPath ?? window.location.pathname;

/** Show the route for the current URL (ends a hold). Call inside the transition's update. */
export function releaseRoute(): void {
  heldPath = null;
  listeners.forEach((l) => l());
}

/** Path used while prerendering (no window). Set by entry-server before each render. */
let serverPath = '/';
export function setServerPath(path: string): void {
  serverPath = path;
}
/**
 * Snapshot for server render AND hydration: on the client this is the real path, so
 * hydrating a prerendered /story matches its HTML.
 */
const getServerPath = (): string => (typeof window !== 'undefined' ? window.location.pathname : serverPath);

/**
 * What a history entry remembers (history.state; survives back/forward into a fresh page load).
 * - `scrollY`: where the entry was scrolled to (restored on back/forward).
 * - `storyOrigin` (a Portfolio entry): which link it opened the Story from, so going Back
 *   closes the orb onto that link.
 * - `storyReturn` (a Story entry opened from the Portfolio): the same origin plus the
 *   Portfolio's scroll position, for the Story's "← Portfolio" link.
 */
export type StoryOrigin = 'topbar' | 'band';
export interface EntryState {
  scrollY?: number;
  storyOrigin?: StoryOrigin;
  storyReturn?: { origin: StoryOrigin; scrollY: number };
}

export function entryState(): EntryState {
  try {
    const s: unknown = window.history.state;
    return s && typeof s === 'object' ? (s as EntryState) : {};
  } catch {
    return {};
  }
}

/** Remember where the current history entry was scrolled to (restored on back/forward), plus `extra`. */
function saveScroll(extra?: EntryState) {
  try {
    window.history.replaceState({ ...entryState(), scrollY: window.scrollY, ...extra }, '');
  } catch {
    /* replaceState can throw when rate-limited: the position is re-saved on the next pause. */
  }
}

/** Cancels a debounced scroll save that is still pending (set by installHistory). */
let cancelPendingSave = () => {};

/**
 * pushState that first records the current entry's scroll position (and `leaving`, merged
 * into the entry being left). `state` starts the new entry. Use for every push.
 */
export function pushUrl(url: string, state: EntryState | null = null, leaving?: EntryState): void {
  cancelPendingSave();
  saveScroll(leaving);
  window.history.pushState(state, '', url);
}

export function navigate(
  to: string,
  { replace = false, state = null, leaving }: { replace?: boolean; state?: EntryState | null; leaving?: EntryState } = {},
): void {
  if (replace) window.history.replaceState(state, '', to);
  else pushUrl(to, state, leaving);
  heldPath = null;
  listeners.forEach((l) => l());
  if (!replace) window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Focus and scroll after a route change (client only).
// ---------------------------------------------------------------------------

const hashTarget = () => hashElement(window.location.hash);

/**
 * Focus without scrolling. A target that isn't focusable on its own (a section, a heading)
 * gets tabindex="-1" so it can take programmatic focus without joining the Tab order;
 * a natively focusable one (a real link or button: `tabIndex` ≥ 0) is focused as it is,
 * so it stays in the Tab order.
 */
export function focusQuietly(el: HTMLElement | null) {
  if (!el) return;
  if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/**
 * Move focus to where a route change lands, so keyboard and screen-reader users
 * arrive somewhere meaningful (never on <body>): a #hash target if there is one;
 * otherwise the Story's h1, or — back on the Portfolio — the Story band (#story).
 */
export function focusArrival(route: Route): void {
  const hashed = hashTarget();
  if (hashed) return focusQuietly(hashed);
  if (route === 'story') focusQuietly(document.querySelector<HTMLElement>('[data-story] h1'));
  else focusQuietly(document.getElementById('story') ?? document.getElementById('main'));
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Resolve once `route` has rendered and its layout is final. The Story is a lazy
 * chunk, and its motion layer then lengthens the pinned scenes (from an effect,
 * which under load can land several frames later): a position restored before that
 * lands in the wrong place, and scroll anchoring then keeps the wrong place. So for
 * the Story, wait for `[data-story][data-motion]`, which StoryMotion sets once its
 * layout (or its reduced-motion final state) is applied.
 */
export async function routeSettled(route: Route): Promise<void> {
  for (let i = 0; i < 180 && route === 'story' && !document.querySelector('[data-story][data-motion]'); i++) await wait(16);
  await document.fonts?.ready;
  await frame();
  await frame();
}

/**
 * Bumped on every back/forward (popstate). Work started for one history entry (landAt, the
 * return transition's focus) checks it and stops once the reader has moved on to another.
 */
let historyGeneration = 0;

/** Settle budget for landAt: ticks of 16ms (timers; see below). */
const SETTLE = {
  /** Longest wait for web fonts still loading (ms) — skipped when they already have. */
  fontsMs: 250,
  /** Consecutive ticks the page height and position must hold. */
  stableTicks: 2,
  /** Upper bound (ticks) however much the layout keeps moving. */
  maxTicks: 30,
};

/**
 * Scroll to `y` once the page's layout has stopped changing (fonts, pin spacers and stage
 * heights set from layout effects): re-applies `y` every tick until the page height and
 * position hold for SETTLE.stableTicks (≤ ~0.5s). Timers only, so it also works inside a
 * View Transition's DOM update (rendering and requestAnimationFrame are paused there —
 * the old page's capture stays on screen meanwhile, so this must be quick). Resolves
 * false, without scrolling further, if a back/forward interrupted it — since `generation`
 * (a `currentHistoryGeneration()` reading taken when the work began; default: now).
 */
export async function landAt(y: number, generation = historyGeneration): Promise<boolean> {
  const mine = generation;
  const current = () => mine === historyGeneration;
  if (document.fonts && document.fonts.status !== 'loaded') await Promise.race([document.fonts.ready, wait(SETTLE.fontsMs)]);
  let lastH = -1;
  let stable = 0;
  for (let i = 0; i < SETTLE.maxTicks && stable < SETTLE.stableTicks; i++) {
    if (!current()) return false;
    window.scrollTo(0, y);
    const h = document.documentElement.scrollHeight;
    const reachable = Math.min(y, Math.max(0, h - window.innerHeight));
    stable = h === lastH && Math.abs(window.scrollY - reachable) < 1 ? stable + 1 : 0;
    lastH = h;
    if (stable < SETTLE.stableTicks) await wait(16);
  }
  if (!current()) return false;
  window.scrollTo(0, y);
  return true;
}

/** The back/forward counter: two different readings mean a back/forward happened in between. */
export const currentHistoryGeneration = (): number => historyGeneration;

/**
 * Back from the Story onto a Portfolio entry that opened it (`storyOrigin`): the orb
 * transition (transition.ts). Return a promise if it runs, or null to restore plainly.
 */
export type ReturnTransition = (origin: StoryOrigin, scrollY: number | undefined) => Promise<void> | null;

let historyInstalled = false;

/**
 * Manual scroll restoration: the browser would restore back/forward positions
 * before the Portfolio's layout (e.g. the pinned project rail) has settled, and
 * land hundreds of px off. Each entry stores its own scrollY (pushUrl, pagehide,
 * and whenever scrolling pauses); on back/forward we restore it once the route has
 * rendered, then move focus when the route changed. A reload starts at the top
 * (the hash dropped). Call once on the client.
 */
export function installHistory({ returnTransition }: { returnTransition?: ReturnTransition } = {}): void {
  if (historyInstalled || typeof window === 'undefined') return;
  historyInstalled = true;
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  let route = resolveRoute(window.location.pathname) ?? 'portfolio';
  let path = window.location.pathname;

  // Back/forward leave an entry without warning, so keep its scrollY current: write
  // it once scrolling pauses (debounced — replaceState is rate-limited). Scroll frames
  // come from the one scroll source (driver.ts). A pending write belongs to the entry that
  // was current when it was scheduled, so it's cancelled whenever the entry changes
  // (popstate, pushUrl): otherwise it could land on the NEXT entry and overwrite
  // the position that entry is about to restore.
  let idle = 0;
  /** True while a back/forward restore is in flight: its own scroll jumps aren't saved. */
  let restoring = false;
  cancelPendingSave = () => clearTimeout(idle);
  let lastY = window.scrollY;
  onScroll(({ scrollY }) => {
    // Resize-only frames (and the first call) don't move the page: nothing to save.
    if (scrollY === lastY) return;
    lastY = scrollY;
    clearTimeout(idle);
    if (!restoring) idle = window.setTimeout(() => saveScroll(), 180);
  });

  let generation = 0;
  /** The orb return started by the last popstate, until it has finished (and focused its link). */
  let returning: Promise<void> | null = null;
  const restore = async (routeChanged: boolean) => {
    const mine = ++generation;
    restoring = true;
    try {
      const current = resolveRoute(window.location.pathname) ?? 'portfolio';
      // Read the entry's position now, before anything can touch it.
      const { scrollY: y, storyOrigin } = entryState();
      await routeSettled(current);
      if (mine !== generation) return; // a newer back/forward took over
      if (typeof y === 'number') window.scrollTo(0, y);
      else hashTarget()?.scrollIntoView();
      if (!routeChanged) return;
      // Back on the Portfolio entry the Story was opened from: focus the link it was opened with.
      const origin = current === 'portfolio' && storyOrigin ? document.querySelector<HTMLElement>(`[data-story-origin="${storyOrigin}"]`) : null;
      if (origin) focusQuietly(origin);
      else focusArrival(current);
    } finally {
      if (mine === generation) restoring = false;
    }
  };

  // Registered before the App subscribes (main.tsx), so this runs first on popstate and can
  // hold the old route in place while a transition captures it.
  window.addEventListener('popstate', (event) => {
    cancelPendingSave();
    // Interrupts a return still in flight (a rapid second Back/Forward): its landAt stops, and
    // the route is no longer held on the Story, so this entry is restored on its own.
    historyGeneration++;
    const next = resolveRoute(window.location.pathname) ?? 'portfolio';
    // A return still in flight never got to move focus (it stops for this entry), so this entry
    // restores focus itself, as after a route change, even when both are the Portfolio.
    const changed = next !== route || returning !== null;
    returning = null;
    heldPath = null;
    const from = { route, path };
    route = next;
    path = window.location.pathname;
    const { storyOrigin, scrollY } = entryState();
    // Back from the Story to the Portfolio entry that opened it: close the orb onto the link it
    // was opened from (unless the browser already animated the swipe, e.g. Safari's back gesture).
    if (returnTransition && storyOrigin && from.route === 'story' && next === 'portfolio' && !(event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) {
      heldPath = from.path;
      const mine = ++generation;
      restoring = true;
      const run = returnTransition(storyOrigin, scrollY);
      if (run) {
        returning = run;
        void run.finally(() => {
          if (returning === run) returning = null;
          if (mine === generation) restoring = false;
        });
        return;
      }
      heldPath = null;
    }
    void restore(changed);
  });
  window.addEventListener('pagehide', () => saveScroll());

  // A reload starts the page over: at the top (the Story: its prologue), never at a saved
  // position or a #chapter. index.html's inline script has already dropped the hash and the
  // entry's saved position before the browser could scroll to it; this makes sure of the top
  // once the route has rendered (the Story's pins lengthen the page after hydration).
  const nav = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === 'reload') {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    window.scrollTo(0, 0);
    // …unless the reader has already started scrolling.
    let userScrolled = false;
    const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const mark = () => (userScrolled = true);
    inputs.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    void routeSettled(route).then(() => {
      inputs.forEach((e) => window.removeEventListener(e, mark));
      if (window.scrollY !== 0 && !userScrolled) window.scrollTo(0, 0);
    });
  } else if (nav?.type === 'back_forward') {
    // Back/forward into a fresh page load (not from the bfcache): restore the entry's position.
    void restore(false);
  }

  // Keep the tracked route in step with client-side navigations.
  listeners.add(() => {
    route = resolveRoute(window.location.pathname) ?? 'portfolio';
    path = window.location.pathname;
  });
}

/** Current route; unknown paths redirect to `/` (keeping any hash). */
export function useRoute(): Route {
  const path = useSyncExternalStore(subscribe, getPath, getServerPath);
  const route = resolveRoute(path);
  useEffect(() => {
    if (route === null) navigate(`/${window.location.hash}`, { replace: true });
  }, [route]);
  return route ?? 'portfolio';
}
