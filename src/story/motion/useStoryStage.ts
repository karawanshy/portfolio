import { useEffect } from 'react';
import { motion } from '@/motion/config';
import { onScroll } from '@/motion/driver';
import { createSmoothScroll } from '@/motion/smoothScroll';
import { skyKeyframes } from '../storyContent';
import { readPin } from './sceneKit';
import { createSunCurve } from './sunProgress';

const cfg = motion.story.stage;
const sunCfg = motion.story.sun;
const boatCfg = motion.story.boat;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * The Story stage follows the (smoothed) scroll — motion allowed only; StoryMotion decides:
 * - ONE continuous timeline: each chapter has an anchor (page px: the prologue at the top,
 *   the last chapter at the bottom, the others inside their pin — motion.story.sun);
 * - the sun tells the progress: its height and brightness follow a monotone cubic through the
 *   chapters' keyframes at their anchors (sunProgress.ts), across ALL the scroll, so it moves
 *   whenever the page does; written as `--sun-h` / `--sun-b` on [data-story-sun]
 *   (global.css maps them); the unsmoothed target is on `data-sun-target` ("h b", for tests);
 * - the sky crossfades on the same timeline: between two anchors whose chapters have
 *   different skies, the later one fades in (eased) — so sun and sky move together; stars
 *   interpolate the two skies' `--sky-<id>-stars`;
 * - the progress fill follows overall page progress; depth: the stars drift up slowly;
 * - ch 18's paper boat (motion.story.boat): it fades in as ch 18 arrives and drifts slowly out
 *   to sea toward the sun over the rest of the page, written as `--boat-o` and `--boat-x/-y/-k/-r`.
 * The displayed scroll eases toward the real one (motion.story.smoothing), so it glides.
 * Everything writes CSS variables / transforms only.
 */
export function useStoryStage(enabled: boolean) {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('[data-story-stage]');
    if (!enabled || !stage) return;
    const layers = new Map(
      [...stage.querySelectorAll<HTMLElement>('[data-sky-layer]')].map((el) => [el.dataset.skyLayer!, el]),
    );
    const order = new Map(skyKeyframes.map((k, i) => [k.id as string, i]));
    const stars = stage.querySelector<SVGSVGElement>('[data-story-stars]');
    const sun = stage.querySelector<HTMLElement>('[data-story-sun]');
    const fill = document.querySelector<HTMLElement>('[data-progress-fill]');
    const boat = stage.querySelector<HTMLElement>('[data-story-boat]');
    const horizonEl = stage.querySelector<HTMLElement>('[data-story-horizon]');
    const scenes = [...document.querySelectorAll<HTMLElement>('[data-scene]')];
    if (!scenes.length) return;

    // Numeric sky values (stars opacity) from tokens.css, read once.
    const rootStyle = getComputedStyle(document.documentElement);
    const num = (name: string, fallback: number) => {
      const v = parseFloat(rootStyle.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    const skyStars = new Map(skyKeyframes.map((k) => [k.id as string, num(`--sky-${k.id}-stars`, 0)]));

    // The CSS transitions soften React's discrete swaps; scroll drives these now.
    const driven = [...layers.values(), stars];
    driven.forEach((el) => el && (el.style.transition = 'none'));

    // Layout reads are cached: anchors and the page height change only on resize / content
    // resize (pins, fonts…), not while scrolling.
    let curve = createSunCurve([0], [sunCfg.chapters[0]!], 0);
    /** Each chapter's anchor (page px): the sky crossfades between them. */
    let chapterXs: number[] = [0];
    let maxScroll = 0;
    let dirty = true;
    /** The boat's scroll marks (page px) and its geometry (px), measured with the layout. */
    let boatAt = { appear0: 0, appear1: 1, drift0: 0, dx: 0, dy: 0, far: 1 };
    // Mark stale only: the scenes' own observer already asks the driver for a re-measure
    // pass (invalidating here too would re-trigger their pin layout on every resize).
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => (dirty = true));
    const main = document.getElementById('main');
    if (main) ro?.observe(main);
    const measure = (scrollY: number, vh: number) => {
      maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
      const anchors = scenes.map((el, i) => {
        if (i === 0) return 0;
        if (i === scenes.length - 1) return maxScroll;
        const pin = readPin(el, scrollY);
        if (pin) return pin.start + (sunCfg.anchors[el.id] ?? sunCfg.anchor) * (pin.end - pin.start);
        // Not pinned (ch 8): where the scene is centred in the viewport.
        const r = el.getBoundingClientRect();
        return r.top + scrollY + r.height / 2 - vh / 2;
      });
      const knots = anchors.map((x, i) => ({ x, state: sunCfg.chapters[i]!, chapter: true }));
      for (const k of sunCfg.knots) {
        const pin = scenes[k.chapter] && readPin(scenes[k.chapter]!, scrollY);
        if (pin) knots.push({ x: pin.start + k.at * (pin.end - pin.start), state: { h: k.h, b: k.b }, chapter: false });
      }
      knots.sort((p, q) => p.x - q.x);
      curve = createSunCurve(knots.map((k) => k.x), knots.map((k) => k.state), maxScroll);
      // The chapters' own anchors, as the curve placed them (for tests and tuning).
      chapterXs = curve.anchors.filter((_, i) => knots[i]!.chapter);
      stage.dataset.sunAnchors = chapterXs.map((a) => Math.round(a)).join(' ');

      // The boat: when ch 18's top (the section's own top, deliberately: not its pin) is at
      // appear[0] / appear[1] / driftFrom × vh down the viewport.
      const last = scenes[scenes.length - 1]!;
      const top = last.getBoundingClientRect().top + scrollY;
      const horizon = horizonEl?.getBoundingClientRect().top ?? vh * 0.8;
      const far = num('--story-boat-far-scale', 0.32);
      boatAt = {
        appear0: top - boatCfg.appear[0] * vh,
        appear1: top - boatCfg.appear[1] * vh,
        drift0: Math.min(maxScroll - 1, top - boatCfg.driftFrom * vh),
        dx: boatCfg.nearDx * window.innerWidth,
        dy: num('--story-boat-depth', 0.5) * (vh - horizon),
        far,
      };
    };

    let last = '';
    let lastSun = '';
    let lastBoat = '';
    /** Draw the stage at (smoothed) scroll position y. */
    const render = (y: number) => {
      const xs = chapterXs;
      // --- Sky: the two chapters around y, and how far between their anchors.
      let i = 0;
      while (i < xs.length - 1 && y >= xs[i + 1]!) i++;
      const lower = scenes[i]?.dataset.sky ?? 'dusk';
      let upper = lower;
      let t = 0;
      const next = scenes[i + 1]?.dataset.sky;
      if (next && next !== lower && i < xs.length - 1) {
        upper = next;
        t = smooth(clamp01((y - xs[i]!) / (xs[i + 1]! - xs[i]!)));
      }
      // Layers are stacked in keyframe order: fade the higher one over the lower one.
      const upperAbove = (order.get(upper) ?? 0) > (order.get(lower) ?? 0);
      const key = `${lower}|${upper}|${t.toFixed(3)}`;
      if (key !== last) {
        last = key;
        for (const [id, el] of layers) {
          let w = 0;
          if (id === lower) w = upper === lower || upperAbove ? 1 : 1 - t;
          else if (id === upper) w = upperAbove ? t : 1;
          el.style.setProperty('--sky-w', w.toFixed(3));
        }
        stage.style.setProperty('--stars-o', lerp(skyStars.get(lower)!, skyStars.get(upper)!, t).toFixed(3));
      }

      // --- The sun: its state at this point of the story.
      const s = curve.at(y);
      const h = s.h.toFixed(5);
      const b = s.b.toFixed(5);
      if (sun && `${h}|${b}` !== lastSun) {
        lastSun = `${h}|${b}`;
        sun.style.setProperty('--sun-h', h);
        sun.style.setProperty('--sun-b', b);
      }

      // --- Ch 18's boat: fades in with the chapter, then drifts slowly out toward the sun.
      if (boat) {
        const b = boatAt;
        const o = smooth(clamp01((y - b.appear0) / (b.appear1 - b.appear0)));
        const u = smooth(clamp01((y - b.drift0) / Math.max(1, maxScroll - b.drift0)));
        const k = lerp(1, b.far, u);
        const turn = boatCfg.rock * Math.sin(Math.PI * clamp01(u * 6)) * (1 - u) + boatCfg.bob * Math.sin(u * Math.PI * 4);
        const vals = {
          '--boat-o': o.toFixed(3),
          '--boat-x': `${(b.dx * (1 - u)).toFixed(1)}px`,
          '--boat-y': `${(b.dy * (1 - u)).toFixed(1)}px`,
          '--boat-k': k.toFixed(4),
          '--boat-r': `${turn.toFixed(2)}deg`,
        };
        const key = Object.values(vals).join('|');
        if (key !== lastBoat) {
          lastBoat = key;
          for (const [name, v] of Object.entries(vals)) boat.style.setProperty(name, v);
        }
      }

      // --- Overall page progress: progress fill, star depth.
      const p = maxScroll > 0 ? clamp01(y / maxScroll) : 0;
      fill?.style.setProperty('--progress', p.toFixed(4));
      if (stars) stars.style.transform = `translate3d(0, ${(-p * cfg.starsDepth).toFixed(1)}px, 0)`;
    };
    const smoothed = createSmoothScroll(render, {
      ...motion.story.smoothing,
      flag: { el: document.querySelector<HTMLElement>('[data-story]'), name: 'settling-stage' },
    });

    const stop = onScroll(({ scrollY, vh, resized }) => {
      let remeasured = false;
      if (resized || dirty) {
        dirty = false;
        measure(scrollY, vh);
        remeasured = true;
      }
      const target = curve.at(scrollY);
      stage.dataset.sunTarget = `${target.h.toFixed(5)} ${target.b.toFixed(5)}`;
      // A re-measure moves the anchors under the displayed value: land on the new layout at once.
      smoothed.set(scrollY, vh, remeasured);
    });

    return () => {
      stop();
      smoothed.dispose();
      delete stage.dataset.sunAnchors;
      delete stage.dataset.sunTarget;
      for (const el of layers.values()) el.style.removeProperty('--sky-w');
      stage.style.removeProperty('--stars-o');
      sun?.style.removeProperty('--sun-h');
      sun?.style.removeProperty('--sun-b');
      ['--boat-o', '--boat-x', '--boat-y', '--boat-k', '--boat-r'].forEach((name) => boat?.style.removeProperty(name));
      driven.forEach((el) => el && (el.style.transition = ''));
      ro?.disconnect();
      if (stars) stars.style.transform = '';
      fill?.style.removeProperty('--progress');
    };
  }, [enabled]);
}
