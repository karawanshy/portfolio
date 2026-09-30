/**
 * Portfolio ↔ Story transitions (approved concept).
 *
 * To the Story: the orb of the link that was clicked — the Story band's lilac "Enter the
 * Story" orb, or the top bar's "Story" pill orb — expands to fill the screen,
 * the page dips to dusk under it, and it fades away onto the Prologue (dusk sky, ◒ on the
 * horizon). Back to the Portfolio (the Story's "← Portfolio" / K◒ links, or browser Back):
 * the same in reverse — a full-screen orb contracts into the orb of the link the Story was
 * opened from, with the Portfolio restored to the exact scroll position it was left at.
 * The origin and position live in history.state (router.ts EntryState): the Story entry's
 * `storyReturn`, and the Portfolio entry's `storyOrigin` + `scrollY`. Opened directly (no
 * origin recorded), "← Portfolio" contracts into the Story band's orb, landing on /#story.
 *
 * View Transitions API where available (the orb is a plain gradient circle named
 * `story-orb`, laid exactly over the real orb, so it scales without blurry text,
 * with a `story-dusk` twin that darkens it toward the dusk horizon as it grows);
 * elsewhere a short cross-fade through the page colour. Reduced motion: no morph,
 * an instant change (the position is still restored). Transform/opacity only.
 * Tunables: motion.story.transition. Styles: `html[data-vt]` rules in global.css.
 * While a transition runs, html also carries `data-vt-origin` (topbar | band) — the link
 * the orb grows from / closes onto (e2e tests read it).
 */
import { flushSync } from 'react-dom';
import { motion } from '@/motion/config';
import { prefersReducedMotion } from '@/motion/usePrefersReducedMotion';
import { hashElement } from './hash';
import {
  focusArrival,
  currentHistoryGeneration,
  focusQuietly,
  landAt,
  navigate,
  releaseRoute,
  resolveRoute,
  entryState,
  type StoryOrigin,
} from './router';

const cfg = motion.story.transition;
/**
 * The orb: two stacked circles over `rect`, each named for the View Transition —
 * `story-orb` (the lilac→pink gradient) and `story-dusk` (dusk horizon colour),
 * which the CSS fades up as the orb grows so the full-screen moment reads as
 * dusk, not a flat bright frame. Both are laid out at their full-screen size (so
 * the snapshots are captured at full resolution and stay crisp); the transition
 * starts them at `scale(1 / cover)` over the real orb. They're inserted in the same
 * task that starts the transition, so the live page never paints them. The dusk
 * circle sits under the orb in the page; the CSS lifts it above in the transition.
 * Returns a cleanup.
 */
function makeOrb(rect: DOMRect, cover: number): () => void {
  const d = Math.max(rect.width, rect.height) * cover;
  const circle = (name: string, background: string, z: string) => {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.dataset.vtOrb = name;
    Object.assign(el.style, {
      position: 'fixed',
      left: `${rect.left + rect.width / 2 - d / 2}px`,
      top: `${rect.top + rect.height / 2 - d / 2}px`,
      width: `${d}px`,
      height: `${d}px`,
      borderRadius: '50%',
      background,
      pointerEvents: 'none',
      zIndex: z,
      viewTransitionName: name,
    });
    document.body.append(el);
    return el;
  };
  const dusk = circle('story-dusk', 'var(--sky-dusk-horizon)', '999');
  const orb = circle('story-orb', 'var(--gradient-story-orb)', '1000');
  return () => {
    dusk.remove();
    orb.remove();
  };
}

/** Scale that makes a circle of diameter `d` centred on `rect` cover the whole viewport. */
function coverScale(rect: DOMRect): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const r = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
  return ((2 * r) / Math.max(rect.width, rect.height, 1)) * 1.04;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

const tick = () => new Promise<void>((r) => setTimeout(r, 16));

/**
 * Wait (≤ ~1s) until the Story has rendered (it's a lazy chunk). Timers, not rAF:
 * rendering — and with it requestAnimationFrame — is paused during a View
 * Transition's DOM update.
 */
async function storyRendered() {
  for (let i = 0; i < 60 && !document.querySelector('[data-story]'); i++) await tick();
}

/** The Portfolio link the Story was opened from (`data-story-origin` on the link). */
function originLink(origin: StoryOrigin): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-story-origin="${origin}"]`);
}

/** The circle an orb grows from / closes onto: the link's `[data-story-orb]`, else the link. */
function orbRect(link: Element | null): DOMRect | null {
  const el = link?.querySelector('[data-story-orb]') ?? link;
  const rect = el?.getBoundingClientRect();
  return rect && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight ? rect : null;
}

const isOrigin = (v: unknown): v is StoryOrigin => v === 'topbar' || v === 'band';

let running = false;

/**
 * Run `update` (the DOM swap) under the orb transition. `from` is the orb the old page
 * grows from (to the Story); `to()` measures, after the swap, the orb the new page closes
 * onto (to the Portfolio). Reduced motion: `update` alone.
 */
async function transition(
  dir: 'to-story' | 'to-portfolio',
  origin: StoryOrigin | null,
  update: () => Promise<void>,
  from: DOMRect | null,
  to: () => DOMRect | null,
): Promise<void> {
  if (prefersReducedMotion()) return update(); // no morph, no fade

  if (typeof document.startViewTransition !== 'function') {
    // Fallback: dip to the page colour and back (opacity only).
    const veil = document.createElement('div');
    veil.setAttribute('aria-hidden', 'true');
    Object.assign(veil.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '1000',
      background: 'var(--color-ink)',
      opacity: '0',
      pointerEvents: 'none',
      transition: `opacity ${cfg.fallbackMs}ms ease-out`,
    });
    document.body.append(veil);
    await nextFrame();
    veil.style.opacity = '1';
    await new Promise((r) => setTimeout(r, cfg.fallbackMs));
    await update();
    await nextFrame();
    veil.style.opacity = '0';
    await new Promise((r) => setTimeout(r, cfg.fallbackMs));
    veil.remove();
    return;
  }

  const root = document.documentElement;
  root.style.setProperty('--vt-orb-ms', `${cfg.orbMs}ms`);
  root.style.setProperty('--vt-fade-ms', `${cfg.fadeMs}ms`);
  root.dataset.vt = dir;
  if (origin) root.dataset.vtOrigin = origin;
  try {
    let removeOrb: (() => void) | null = null;
    if (from) {
      const cover = coverScale(from);
      removeOrb = makeOrb(from, cover);
      root.style.setProperty('--vt-orb-scale', String(cover));
    }
    const vt = document.startViewTransition(async () => {
      removeOrb?.();
      removeOrb = null;
      await update();
      const target = to();
      if (target) {
        const cover = coverScale(target);
        removeOrb = makeOrb(target, cover);
        root.style.setProperty('--vt-orb-scale', String(cover));
      }
    });
    await vt.finished.catch(() => {});
    removeOrb?.();
  } finally {
    delete root.dataset.vt;
    delete root.dataset.vtOrigin;
    root.style.removeProperty('--vt-orb-scale');
  }
}

/**
 * Navigate between the Portfolio and the Story with the transition. `link` is the
 * clicked link. Same-route links should keep using `navigate()`.
 */
export async function navigateWithTransition(href: string, link: Element | null): Promise<void> {
  if (running) return;
  running = true;
  try {
    const url = new URL(href, location.href);
    if (resolveRoute(url.pathname) === 'story') {
      // Remember which link opened the Story, and where the Portfolio was scrolled to.
      const tagged = link?.closest<HTMLElement>('[data-story-origin]')?.dataset.storyOrigin;
      const origin = isOrigin(tagged) ? tagged : null;
      // The Story is a lazy chunk: fetch it before the old page is captured.
      await import('@/pages/StoryPage');
      const update = async () => {
        flushSync(() =>
          navigate(href, {
            state: origin ? { storyReturn: { origin, scrollY: window.scrollY } } : null,
            // Clears a stale origin when an untagged link opened the Story.
            leaving: { storyOrigin: origin ?? undefined },
          }),
        );
        await storyRendered();
        land(url);
        focusArrival('story');
      };
      await transition('to-story', origin, update, orbRect(link), () => null);
      return;
    }

    // Back to the Portfolio. Opened from a Portfolio link: that link's orb, at the exact
    // position the Portfolio was left at (a fresh entry, no #hash). Otherwise: the Story band.
    const back = entryState().storyReturn;
    const origin = back && isOrigin(back.origin) ? back.origin : null;
    if (origin && back) {
      await returnTo(origin, back.scrollY, () =>
        flushSync(() => navigate(url.pathname + url.search, { state: { scrollY: back.scrollY } })),
      );
      return;
    }
    const update = async () => {
      flushSync(() => navigate(href));
      land(url);
      focusArrival('portfolio');
    };
    await transition('to-portfolio', null, update, null, () => orbRect(document.getElementById('story')));
  } finally {
    running = false;
  }
}

/** Land on the URL's #hash, if any. */
function land(url: URL) {
  hashElement(url.hash)?.scrollIntoView();
}

/**
 * Show the Portfolio (`swap`), restore `scrollY` once its layout has settled, give focus
 * back to the origin link, and close the orb onto it.
 */
async function returnTo(origin: StoryOrigin, scrollY: number | undefined, swap: () => void): Promise<void> {
  // Read before the transition starts: its update runs a frame later, and a back/forward
  // in between must also count as an interruption.
  const generation = currentHistoryGeneration();
  const update = async () => {
    swap();
    if (typeof scrollY === 'number') await landAt(scrollY, generation);
    // A back/forward during the return: that entry's own restore handles scroll and focus.
    if (generation !== currentHistoryGeneration()) return;
    const link = originLink(origin);
    if (link) focusQuietly(link);
    else focusArrival('portfolio');
  };
  await transition('to-portfolio', origin, update, null, () => orbRect(originLink(origin)));
}

/**
 * Browser Back from the Story onto the Portfolio entry that opened it (router.ts calls this
 * from popstate, with the route held on the Story until the swap). Null when it can't run
 * (another transition is running): the router restores the entry plainly instead.
 */
export function returnOnPopstate(origin: StoryOrigin, scrollY: number | undefined): Promise<void> | null {
  if (running || !isOrigin(origin)) return null;
  running = true;
  let released = false;
  const swap = () => {
    released = true;
    flushSync(releaseRoute);
  };
  return returnTo(origin, scrollY, swap).finally(() => {
    if (!released) releaseRoute();
    running = false;
  });
}
