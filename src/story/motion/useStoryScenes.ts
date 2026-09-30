import { useEffect } from 'react';
import { motion } from '@/motion/config';
import { invalidate, onScroll } from '@/motion/driver';
import { createSmoothScroll } from '@/motion/smoothScroll';
import { type IllusTimeline } from './sceneKit';
import { clamp01, createSceneArt, easeOut, seg, Writer } from './sceneArt';
import { createSunCurve } from './sunProgress';

const S = motion.story;
/** Portrait phones (motion.story.pin.phone): narrower than `below` and taller than wide. Read at layout time only. */
const phonePortrait = (vh: number) => window.innerWidth < S.pin.phone.below && vh > window.innerWidth;

interface Pin {
  pin: HTMLElement;
  distance: number;
  /** The sticky top (px from the viewport top). */
  top: number;
  padTop: number;
  /** The art sits in the desktop lane (absolutely placed beside the text), not in the flow. */
  lane: boolean;
  /** Elements motion scaled / moved to fit the pinned core (restored when the pin is cleared). */
  fitted: HTMLElement[];
  /** Page scroll (px) where the block sticks; progress = (scroll − start) / distance. */
  start: number;
}

interface SceneRec {
  el: HTMLElement;
  id: string;
  /** Header, lines and controls: rise into place as they enter from below. */
  enter: { el: HTMLElement; offset: number }[];
  pinCandidate: boolean;
  pin: Pin | null;
}

export interface StoryScenesOptions {
  /** Motion allowed. When false the scenes are put in their final state and left static. */
  motion: boolean;
}

/**
 * Scene motion for /story, all scroll-linked through the ONE driver (no timers,
 * nothing runs while the page is still):
 * - every scene: header, lines and controls rise gently as they enter from below;
 *   `--scene-progress` (0→1 across the scene's pass through the viewport) on each scene;
 * - every chapter with an animation PINS while it plays (motion.story.pin, every width): its
 *   block sticks once framed (its heading and art in the safe area — see `layout`), the pin
 *   progress scrubs the animation from its start, and it releases after a short hold. ch 3,
 *   6, 12 and 17 lay their timelines over the whole pin; the others (ch 4, 5 and the chapter
 *   illustrations, illusMotion.ts) play one 0→1 timeline over `pin.play`;
 * - a chapter's typographic beat (scene.quote) lands line by line at the end of its pin, after
 *   its art (motion.story.quote; ch 3's with its board).
 * Reduced motion: no pins, no scrubbing — the scenes show their final states.
 * Only transform, opacity, SVG dash offsets and the field helpers' path data change
 * (plus the pins' layout: sticky blocks and section heights, set on (re)measure only).
 */
export function useStoryScenes({ motion: allowed }: StoryScenesOptions) {
  useEffect(() => {
    const sceneEls = [...document.querySelectorAll<HTMLElement>('[data-scene]')];
    if (!sceneEls.length) return;
    const w = new Writer();
    const { byId, board, field, waver, cpu, chess, illus, doorwayScene, resetIllus, quotes, resetQuotes } =
      createSceneArt(sceneEls, w, allowed);

    // Reduced motion: final states, nothing else. The board (written), the CPU
    // (assembled), the waver (drawn), the chess (synced, pulses hidden) and the chapter
    // illustrations are already final as rendered; the field passes, and the trunk (ch 16)
    // closes. The sun shows the current chapter's state, static (StoryStage).
    if (!allowed) {
      field?.final();
      const ch16 = byId('chapter-16');
      if (ch16) illus.get(ch16)?.tl.render(1);
      return () => {
        resetIllus();
        board?.reset();
        resetQuotes();
        waver?.reset();
        cpu?.reset();
        chess?.reset();
        field?.reset();
      };
    }

    // ------------------------------------------------------------- scene records
    const ENTER =
      '[data-scene-part="header"], [data-scene-part="prologue"] > h1, [data-line], [data-scene-part="controls"], [data-story-ending]';
    const recs: SceneRec[] = sceneEls.map((el) => ({
      el,
      id: el.id,
      // Outermost matches only (ch 3's lines sit inside its header: they rise with it).
      enter: [...el.querySelectorAll<HTMLElement>(ENTER)]
        .filter((e) => !e.parentElement?.closest(ENTER))
        .map((e) => ({ el: e, offset: 0 })),
      // Every chapter with an animation (a pin length) pins.
      pinCandidate: !!S.pin.length[el.id],
      pin: null,
    }));

    const main = document.getElementById('main');
    const clearPin = (r: SceneRec) => {
      const pin = r.el.querySelector<HTMLElement>('[data-scene-pin]');
      r.el.style.height = '';
      r.el.style.scrollMarginTop = '';
      r.el.style.paddingBottom = '';
      if (r === recs[recs.length - 1] && main) main.style.paddingBottom = '';
      delete r.el.dataset.pinFit;
      if (pin) Object.assign(pin.style, { position: '', top: '', height: '', alignSelf: '', justifyContent: '' });
      r.pin?.fitted.forEach((el) => Object.assign(el.style, { transform: '', transformOrigin: '' }));
      r.el.querySelectorAll<HTMLElement>('[data-scene-part="controls"], [data-story-ending]').forEach((el) => fitShift.delete(el));
      r.pin = null;
    };

    const shown = (el: Element) => el.getClientRects().length > 0;
    /** Pin fit: how far an entering part (controls, ending) moves up to close a scaled art's gap. */
    const fitShift = new Map<HTMLElement, number>();
    const enterEls = new Set(recs.flatMap((r) => r.enter.map((e) => e.el)));
    /** Top and bottom of the union of `els` (px, relative to `origin`); null if none is shown. */
    const span = (els: Element[], origin: number): [number, number] | null => {
      const rs = els.filter(shown).map((el) => el.getBoundingClientRect());
      return rs.length ? [Math.min(...rs.map((r) => r.top)) - origin, Math.max(...rs.map((r) => r.bottom)) - origin] : null;
    };
    const header = document.querySelector<HTMLElement>('[data-story] header');
    const rail = document.querySelector<HTMLElement>('[data-story-progress]');
    const sunEl = document.querySelector<HTMLElement>('[data-story-sun]');
    /**
     * The sun's geometry (viewport px), measured once per layout: where its disc is at height h
     * (tokens.css --story-sun-*; the same maths as global.css). A pinned block keeps its core
     * clear of the sun at the heights it reaches while that chapter plays.
     */
    const sunGeometry = () => {
      if (!sunEl) return null;
      const box = sunEl.getBoundingClientRect();
      if (!box.width) return null;
      const cs = getComputedStyle(sunEl);
      const px = (v: string) => {
        const probe = document.createElement('div');
        probe.style.cssText = `position:absolute;visibility:hidden;width:0;height:${v}`;
        sunEl.append(probe);
        const out = probe.offsetHeight;
        probe.remove();
        return out;
      };
      const rise = px('var(--story-sun-rise)');
      const sink = px('var(--story-sun-sink)');
      const drift = px('var(--story-sun-drift)');
      const driftBy = parseFloat(cs.getPropertyValue('--story-sun-drift-by')) || 1;
      const R = box.width * 0.45;
      const horizon = box.top + box.height * 0.65;
      const cx = box.left + box.width / 2;
      return (h: number) => {
        const lift = h < 0 ? h * sink : h * rise;
        const x = cx + clamp01(h / driftBy) * drift;
        return { top: horizon - lift - R, left: x - R, right: x + R };
      };
    };
    let sunAt: ReturnType<typeof sunGeometry> = null;

    /**
     * Where a pinned block sticks (its `top`, px from the viewport top), and the art's fit.
     * Centred in the viewport, then kept so its CORE — the heading, the art and (ch 3) the
     * quote — is inside the safe area (below the fixed header, above the progress rail:
     * motion.story.pin.safe). If the core is taller than that (phones), the art scales down
     * from its top (≥ pin.minArtScale) and the core parts after it move up to close the gap;
     * if it still doesn't fit, the animated parts (art, quote) win, as low as they fit.
     */
    const place = (r: SceneRec, pin: HTMLElement, vh: number) => {
      const P = S.pin;
      const H = pin.offsetHeight;
      const origin = pin.getBoundingClientRect().top;
      // Chapters that must keep their words (ch 18) may sit up into the header's fade, just clear
      // of its controls (the logo, the chapter pill, "← Portfolio").
      const keep = P.keepHeading.includes(r.id);
      const headerRow = header ? Math.max(...[...header.children].filter(shown).map((c) => c.getBoundingClientRect().bottom)) : 0;
      const s0 = keep && header ? Math.min(header.offsetHeight - P.safe.headerOverlap, headerRow + P.safe.headerGap) + P.safe.margin : (header ? header.offsetHeight - P.safe.headerOverlap : 0) + P.safe.margin;
      // Portrait phones (motion.story.pin.phone): the topmost label at a set fraction of the
      // viewport height, and the core above the horizon line too.
      const phone = phonePortrait(vh);
      const horizonTop = phone ? document.querySelector('[data-story-horizon]')?.getBoundingClientRect().top : undefined;
      const s1Rail = vh - (rail ? rail.offsetHeight - P.safe.footerOverlap : 0) - P.safe.margin;
      const s1 = Math.min(s1Rail, horizonTop != null ? horizonTop - (P.phone.horizonAirFor[r.id] ?? P.phone.horizonAir) : Infinity);
      // Portrait phones: never higher than the old fallback, however lean the header gets.
      const top0 = phone ? Math.max(s0, Math.min(P.phone.minLabelTop, Math.round(vh * P.phone.minLabelTopVh))) : s0;
      const heading = [...r.el.querySelectorAll('[data-scene-part="header"], [data-scene-part="prologue"] > h1')].filter(shown);
      const visual = [...r.el.querySelectorAll<HTMLElement>('[data-scene-visual]')].find(shown) ?? null;
      const extras = [...r.el.querySelectorAll<HTMLElement>('[data-scene-part="quote"]')].filter(shown);
      // What must stay reachable while pinned: the controls (in a two-column layout they can run
      // below the art) and ch 18's ending links.
      const reach = [...r.el.querySelectorAll<HTMLElement>('[data-scene-part="controls"], [data-story-ending]')].filter(shown);
      const core = span([...heading, ...(visual ? [visual] : []), ...extras, ...reach], origin);
      const center = Math.round((vh - H) / 2);
      const label = phone ? [...r.el.querySelectorAll('[data-scene-part="header"] .label')].find(shown) : undefined;
      const labelAt = label ? label.getBoundingClientRect().top - origin : null;
      /** Where the block would like to sit: centred, or (portrait phones) its topmost label at `labelTop`. */
      const target = labelAt === null ? center : Math.round(vh * P.phone.labelTop - labelAt);
      const fitted: HTMLElement[] = [];
      if (!core) return { top: target, fitted, heading: true, fit: 'fits', bottom: H };

      // Each core part's bottom (block px) and the lowest it may sit on screen: above the rail,
      // and above the sun where the sun shares its columns at any height it reaches while this
      // chapter is on screen (the sun's curve passes through the neighbours' keyframes, and a
      // knot inside this pin). Text counts by its ink (the quote's lines are full-width blocks).
      const n = Number(r.el.dataset.sceneIndex);
      const keys = motion.story.sun.chapters;
      // The heights the sun passes through while this chapter is pinned: sampled from a preview of
      // the sun's curve over this pin (preview: the layout as the pins will make it, each block
      // centred), a little beyond its ends, plus a margin for the difference.
      const k0 = keys[n]?.h ?? 0;
      const during = preview.pins.get(r);
      const hs = during
        ? Array.from({ length: 17 }, (_, k) => preview.curve.at(during.start - 0.15 * (during.end - during.start) + ((during.end - during.start) * 1.3 * k) / 16).h)
        : [k0];
      const [hLo, hHi] = [Math.min(...hs) - 0.03, Math.min(1, Math.max(...hs) + 0.05)];
      const suns = sunAt ? Array.from({ length: 9 }, (_, k) => sunAt!(hLo + ((hHi - hLo) * k) / 8)) : [];
      const ink = (el: Element) => {
        const rs: DOMRect[] = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let t = walk.nextNode(); t; t = walk.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(t);
          rs.push(...range.getClientRects());
        }
        return rs.length ? rs : [el.getBoundingClientRect()];
      };
      // Controls count by their buttons (their row is full width); text by its ink. The art and
      // what follows it in the flow move when the art scales; the rest stays.
      const pills = (el: Element) => [...el.querySelectorAll('a, button')].filter(shown).map((b) => b.getBoundingClientRect());
      const box = visual?.getBoundingClientRect();
      // Followers: below the art in its own column (a two-column layout's text column doesn't move).
      const followers = box
        ? [...extras, ...reach].filter((el) => {
            const b = el.getBoundingClientRect();
            return b.top >= box.bottom - 1 && b.left < box.right && b.right > box.left;
          })
        : [];
      const clearOf = (b: Pick<DOMRect, 'left' | 'right'>) => Math.min(...suns.filter((u) => u.right > b.left && u.left < b.right).map((u) => u.top - P.safe.sun));
      const artH = box?.height ?? 0;
      /**
       * Where the art scales from, as a share of its height (CSS --fit-origin-y on the art, with a
       * matching transform-origin; default its top): its top then moves down by oy·(1−s)·height.
       * ch 6 on portrait phones scales about board b's top, which must stay below the controls.
       */
      const oy = visual ? parseFloat(getComputedStyle(visual).getPropertyValue('--fit-origin-y')) || 0 : 0;
      const artBottomAt = (s: number) => box!.top - origin + (oy * (1 - s) + s) * artH;
      /**
       * The columns the art takes, for the sun: its box, or (portrait phones) its drawings'
       * (an illustration narrower than its full-width box, e.g. ch 11's building, may sit lower).
       */
      const artCols = (b: DOMRect) => {
        const svgs = phone && visual ? [...visual.querySelectorAll('svg')].filter(shown).map((el) => el.getBoundingClientRect()) : [];
        return svgs.length ? { left: Math.min(...svgs.map((x) => x.left)), right: Math.max(...svgs.map((x) => x.right)) } : b;
      };
      // What a follower may not move up past: the text above it in its columns that doesn't
      // move (in a two-column layout the full-width quote sits under the text column too).
      const still = [
        ...[...r.el.querySelectorAll('h2, [data-line]')].filter(shown).flatMap(ink),
        ...reach.filter((el) => !followers.includes(el)).flatMap(pills),
      ];
      const stop = new Map(
        followers.map((el) => {
          const f = el.getBoundingClientRect();
          const above = still.filter((b) => b.bottom <= f.top + 1 && b.left < f.right && b.right > f.left).map((b) => b.bottom - origin);
          return [el, above.length ? Math.max(...above) : -Infinity];
        }),
      );
      /** How far a follower moves up with the art scaled by s: the art's gap, but never onto the text above it. */
      const shiftOf = (el: HTMLElement, s: number) => {
        const artBottom = box!.bottom - origin;
        return Math.max(0, artBottom - Math.max(artBottomAt(s), stop.get(el) ?? -Infinity));
      };
      const part = (b: DOMRect, kind: 'art' | 'fixed' | HTMLElement, quote = false) => ({ top: b.top - origin, bottom: b.bottom - origin, sun: clearOf(b), kind, quote });
      const parts = [
        ...heading.flatMap(ink).map((b) => part(b, 'fixed')),
        ...extras.flatMap((el) => ink(el).map((b) => part(b, followers.includes(el) ? el : 'fixed', true))),
        ...reach.flatMap((el) => pills(el).map((b) => part(b, followers.includes(el) ? el : 'fixed'))),
        ...(box ? [{ ...part(box, 'art'), sun: clearOf(artCols(box)) }] : []),
      ];
      // Portrait phones, chapters whose quote ends close beside the sun (ch 15 on narrow phones):
      // the whole quote clears the sun wherever any of its lines shares the sun's columns.
      if (phone && P.phone.quoteBlockSun.includes(r.id)) {
        const q = parts.filter((x) => x.quote);
        const clear = Math.min(...q.map((x) => x.sun));
        q.forEach((x) => (x.sun = clear));
      }
      /** Where the parts' bottoms are with the art scaled by s (from its top) and the gap after it closed. */
      const bottomAt = (q: (typeof parts)[number], s: number) =>
        q.kind === 'art' ? artBottomAt(s) : q.kind === 'fixed' ? q.bottom : q.bottom - shiftOf(q.kind, s);
      /**
       * The range of sticky tops that keep `group` inside the frame (above the rail, and the sun if
       * `sun`), none higher than `atLeast`. `limit` (portrait phones): 'all' keeps every part above
       * the horizon line, 'quote' only the quote; 'rail' goes down to the rail as it always did (the
       * usual fit decides the art's scale with it, so the horizon never makes the art smaller than
       * it used to be).
       */
      type Limit = 'all' | 'quote' | 'rail';
      /** Portrait phones: the quote keeps clear of the sun in every step (see the over-sun steps below). */
      let quoteSun = phone;
      const range = (group: typeof parts, s: number, sun: boolean, atLeast = -Infinity, limit: Limit = 'all') => ({
        min: Math.max(atLeast, top0 - Math.min(...group.map((q) => q.top))),
        max: Math.min(
          // Portrait phones: a quote clears the sun even where the art may pass over its path.
          ...group.map((q) => Math.min(limit === 'all' || (limit === 'quote' && q.quote) ? s1 : s1Rail, sun || (quoteSun && q.quote) ? q.sun : Infinity) - bottomAt(q, s)),
        ),
      });
      const place1 = (r: { min: number; max: number }) => Math.round(Math.min(Math.max(target, r.min), r.max));

      /** The lowest core part (block px) with the art at scale s: where the block visibly ends. */
      const lowestAt = (s: number) => Math.max(...parts.map((q) => bottomAt(q, s)));
      // Portrait phones: no higher than `maxRise` above the label's place.
      const floor = labelAt === null ? -Infinity : target - P.phone.maxRise;
      const all = range(parts, 1, true, floor);
      if (all.min <= all.max) return { top: place1(all), fitted, heading: true, fit: 'fits', bottom: lowestAt(1) };

      const fit = (s: number) => {
        Object.assign(visual!.style, { transform: `scale(${s.toFixed(4)})`, transformOrigin: '50% 0' });
        fitted.push(visual!);
        for (const el of followers) {
          const gap = shiftOf(el, s);
          if (!gap) continue;
          // Entering parts (controls, the ending) carry the shift in their entry transform.
          if (enterEls.has(el)) fitShift.set(el, -gap);
          else {
            el.style.transform = `translate3d(0, ${(-gap).toFixed(1)}px, 0)`;
            fitted.push(el);
          }
        }
      };
      /** The largest art scale ≥ min at which `group` fits (null if none), none higher than `atLeast`. */
      const largest = (group: typeof parts, min: number, sun: boolean, atLeast = -Infinity, limit: Limit = 'all') => {
        if (!box || !artH) return null;
        for (let s = 1; s >= Math.max(0, min - 1e-9); s -= 0.01) {
          const r = range(group, s, sun, atLeast, limit);
          if (r.min <= r.max) return { s, r };
        }
        return null;
      };
      if (labelAt !== null) {
        // Portrait phones: a little smaller art rather than the block much higher…
        const got = P.phone.keepArt.includes(r.id) ? null : largest(parts, P.phone.minArtScale, true, floor);
        if (got) {
          fit(got.s);
          return { top: place1(got.r), fitted, heading: true, fit: 'scaled', bottom: lowestAt(got.s) };
        }
        // …else the usual fit, anywhere in the safe area.
        const any = range(parts, 1, true);
        if (any.min <= any.max) return { top: place1(any), fitted, heading: true, fit: 'fits', bottom: lowestAt(1) };
        // …and, as it always did, at full size wherever the old frame allows it.
        const was = range(parts, 1, true, -Infinity, 'quote');
        if (was.min <= was.max) return { top: place1(was), fitted, heading: true, fit: 'fits', bottom: lowestAt(1) };
      }
      /**
       * Portrait phones: the usual fit's scale (decided down to the rail), placed above the horizon
       * where that allows it (everything, else the quote); if not even the quote clears it, the
       * largest scale in the same step that keeps the quote clear; failing that, as it was.
       */
      const within = (got: { s: number; r: { min: number; max: number } }, min: number, sun: boolean) => {
        if (!phone) return got;
        for (const limit of ['all', 'quote'] as const) {
          const st = range(parts, got.s, sun, -Infinity, limit);
          if (st.min <= st.max) return { s: got.s, r: st };
        }
        return largest(parts, min, sun, -Infinity, 'quote') ?? got;
      };
      const loose: Limit = phone ? 'rail' : 'all';
      // Too tall (phones, short screens): scale the art down from its top and close the gap after
      // it. Tried in order: clear of the sun at the usual minimum scale, then smaller (short
      // screens), then down to the rail (the sun may pass behind the art).
      for (const [min, sun, name] of [
        [P.minArtScale, true, 'scaled'],
        [P.minArtScaleShort, true, 'scaled-short'],
        // Smaller still rather than over the sun, when that keeps it clear (the smallest phones).
        [P.minArtScaleTight, true, 'scaled-short'],
        [P.minArtScaleShort, false, 'over-sun'],
        // Landscape phones: smaller still, before giving up the heading.
        [P.minArtScaleLast, false, 'over-sun'],
      ] as const) {
        // The last-resort scale is for landscape phones: portrait ones keep a sensible art scale and
        // let the heading go instead (art-only, below), as they always did.
        if (phone && min === P.minArtScaleLast) continue;
        let was = largest(parts, min, sun, -Infinity, loose);
        // …unless nothing at this step allows it (the shortest phones): then as it always was,
        // rather than giving up the heading.
        if (!was && quoteSun && !sun) {
          quoteSun = false;
          was = largest(parts, min, sun, -Infinity, loose);
        }
        if (was) {
          const got = within(was, min, sun);
          fit(got.s);
          return { top: place1(got.r), fitted, heading: true, fit: name, bottom: lowestAt(got.s) };
        }
      }
      // Chapters whose words must stay (ch 18, the closing line and the ending links): any art
      // shrinks as far as it must, down to nothing (dropped), and never takes the heading's place
      // (ch 18 itself has no scene art: its boat is on the stage).
      if (keep) {
        const got = largest(parts, 0, false, -Infinity, loose);
        const s = got ? (got.s < P.dropBelow ? 0 : got.s) : 0;
        if (box && artH) fit(s);
        const r2 = range(parts, s, false, -Infinity, loose);
        return { top: Math.round(r2.min <= r2.max ? place1(r2) : r2.min), fitted, heading: true, fit: s === 0 ? 'no-art' : 'scaled-hard', bottom: lowestAt(s) };
      }
      // Still too tall (the smallest screens): the animated parts and what must stay reachable
      // (ch 18's ending), scaled if need be; the heading is above the frame while pinned.
      const group = parts.filter((q) => q.kind !== 'fixed' || !heading.length || q.top > Math.max(...heading.flatMap(ink).map((b) => b.bottom - origin)));
      const got =
        largest(group, P.minArtScaleShort, true, -Infinity, loose) ??
        largest(group, P.minArtScaleShort, false, -Infinity, loose) ??
        largest(group, P.minArtScaleLast, false, -Infinity, loose);
      if (got) {
        if (got.s < 1) fit(got.s);
        return { top: place1(got.r), fitted, heading: false, fit: 'art-only', bottom: lowestAt(got.s) };
      }
      // Nothing fits: the smallest art, its bottom (and the controls, ch 18's ending) on the rail,
      // so what must stay reachable is on screen; the art's top may be above the frame.
      if (box && artH) fit(P.minArtScaleLast);
      const s = box && artH ? P.minArtScaleLast : 1;
      return { top: Math.round(s1Rail - Math.max(...group.map((q) => bottomAt(q, s)))), fitted, heading: false, fit: 'art-only', bottom: lowestAt(s) };
    };

    /**
     * Re-measure with the viewport held in place. Clearing and re-applying the pins
     * changes section heights above the viewport twice in one pass; the browser's
     * scroll anchoring can compensate one change but not the other and leave the
     * page a whole pin length off (seen after a back/forward restore, when the
     * ResizeObserver's initial callback lands late). So anchoring is off for the pass
     * and the first scene still on screen is put back where it was.
     */
    const measure = (vh: number) => {
      const root = document.documentElement;
      const anchor = sceneEls.find((el) => el.getBoundingClientRect().bottom > 0) ?? null;
      const anchorTop = anchor?.getBoundingClientRect().top ?? 0;
      const prevAnchoring = root.style.overflowAnchor;
      root.style.overflowAnchor = 'none';
      layout(vh);
      if (anchor) {
        const drift = anchor.getBoundingClientRect().top - anchorTop;
        if (Math.abs(drift) >= 1) window.scrollBy(0, drift);
      }
      root.style.overflowAnchor = prevAnchoring;
    };
    /** Layout pass (mount, resize, font/content size changes). Top-down, so later pins see earlier ones. */
    /**
     * A preview of the sun's curve (useStoryStage builds the real one from the laid-out pins):
     * the pins' scroll ranges as they will be, each block centred — so a pinned block keeps
     * clear of the heights the sun actually passes through during it.
     */
    const previewSun = (vh: number) => {
      const scrollY = window.scrollY;
      const sunCfg = motion.story.sun;
      const pins = new Map<SceneRec, { start: number; end: number }>();
      const anchors: number[] = [];
      let added = 0;
      recs.forEach((r) => {
        const b = r.el.getBoundingClientRect();
        const top = b.top + scrollY + added;
        const pin = r.el.querySelector<HTMLElement>('[data-scene-pin]');
        if (r.pinCandidate && pin) {
          const dist = Math.round(S.pin.length[r.id]! * vh);
          const start = top + (parseFloat(getComputedStyle(r.el).paddingTop) || 0) - (vh - pin.offsetHeight) / 2;
          pins.set(r, { start, end: start + dist });
          anchors.push(start + (sunCfg.anchors[r.id] ?? sunCfg.anchor) * dist);
          added += dist;
        } else anchors.push(top + b.height / 2 - vh / 2);
      });
      const max = Math.max(0, document.documentElement.scrollHeight + added - vh);
      anchors[0] = 0;
      anchors[anchors.length - 1] = max;
      const knots = anchors.map((x, i) => ({ x, state: sunCfg.chapters[i]! }));
      for (const k of sunCfg.knots) {
        const p = pins.get(recs[k.chapter]!);
        if (p) knots.push({ x: p.start + k.at * (p.end - p.start), state: { h: k.h, b: k.b } });
      }
      knots.sort((a, b) => a.x - b.x);
      return { pins, curve: createSunCurve(knots.map((k) => k.x), knots.map((k) => k.state), max) };
    };
    let preview: ReturnType<typeof previewSun> = { pins: new Map(), curve: createSunCurve([0], [motion.story.sun.chapters[0]!], 0) };

    const layout = (vh: number) => {
      sunAt = sunGeometry();
      // Measure the quotes where they rest, not where their landing has them this frame (the
      // timelines redraw them on the next render), so a re-measure mid-pin lays out the same.
      resetQuotes();
      board?.resetQuote();
      for (const r of recs) {
        r.enter.forEach((e) => {
          e.el.style.transform = '';
          w.forget(e.el);
        });
        if (r.pinCandidate) clearPin(r);
      }
      preview = previewSun(vh);
      // The prologue's gap above the horizon at the top of the page: the story ends the same way
      // (ch 18's resting block sits that far above the horizon at the end of the scroll).
      const horizonY = document.querySelector('[data-story-horizon]')?.getBoundingClientRect().top ?? null;
      const prologue = document.querySelector('[data-scene-part="prologue"]');
      const horizonGap = horizonY !== null && prologue ? horizonY - (prologue.getBoundingClientRect().bottom + window.scrollY) : null;
      for (const r of recs) {
        const top = r.el.getBoundingClientRect().top;
        r.enter.forEach((e) => (e.offset = e.el.getBoundingClientRect().top - top));
        if (!r.pinCandidate) continue;
        const pin = r.el.querySelector<HTMLElement>('[data-scene-pin]');
        if (!pin) continue;
        const pinH = pin.offsetHeight;
        const distance = Math.round(S.pin.length[r.id]! * vh);
        const H0 = r.el.offsetHeight;
        const padTop = parseFloat(getComputedStyle(r.el).paddingTop) || 0;
        const placed = place(r, pin, vh);
        const { fitted, heading } = placed;
        let topPx = placed.top;
        /** The last chapter's content end (block px), shared with the page-end sizing below. */
        let lastEnd: number | null = null;
        // The last chapter rests as high above the horizon as the prologue starts (never under the header).
        if (r === recs[recs.length - 1] && horizonY !== null && horizonGap !== null) {
          // Where its content visibly ends (its last links), in block px, once the block is laid out
          // from its top (flex-start, below): the content's own height below the block's padding.
          const kids = [...pin.children].filter(shown);
          const ends = [...pin.querySelectorAll('[data-story-ending], [data-scene-part="controls"], [data-line]')].filter(shown);
          const end = (lastEnd = kids.length && ends.length
            ? (parseFloat(getComputedStyle(pin).paddingTop) || 0) + Math.max(...ends.map((el) => el.getBoundingClientRect().bottom)) - Math.min(...kids.map((el) => el.getBoundingClientRect().top))
            : Math.min(pinH, Math.ceil(placed.bottom)));
          // Portrait phones: no higher than before the header got leaner (motion.story.pin.phone).
          const PH = S.pin.phone;
          const phoneTop = phonePortrait(vh) ? Math.min(PH.minLabelTop, Math.round(vh * PH.minLabelTopVh)) - S.pin.safe.margin : 0;
          const minTop = Math.max(header ? header.offsetHeight - S.pin.safe.headerOverlap : 0, phoneTop);
          topPx = Math.max(minTop, Math.round(horizonY - horizonGap - end));
          document.querySelector<HTMLElement>('[data-story]')?.setAttribute('data-horizon-gap', String(Math.round(horizonGap)));
        } else if (r === recs[recs.length - 1]) document.querySelector('[data-story]')?.removeAttribute('data-horizon-gap');
        const visual = [...r.el.querySelectorAll<HTMLElement>('[data-scene-visual]')].find(shown);
        Object.assign(pin.style, { position: 'sticky', top: `${topPx}px`, height: `${pinH}px`, alignSelf: 'flex-start' });
        // The last chapter: the page ends exactly where its pin ends, so the final resting frame
        // is the composed ending (heading, lines, links), not a block scrolled half under the header.
        // What follows the pinned block (the scene's and the page's bottom padding) becomes just
        // the room under the block as it rests: nothing left to scroll once it releases.
        // The block is sized to where it visibly ends (a scaled art leaves layout space behind).
        let H = H0;
        if (r === recs[recs.length - 1] && main) {
          const cs = getComputedStyle(r.el);
          const padBottom = parseFloat(cs.paddingBottom) || 0;
          const end = Math.ceil(lastEnd ?? Math.min(pinH, placed.bottom));
          // Room under the resting block: what's left of the frame — at least the progress rail's,
          // so the last links clear it when the block is taller than the frame (then the final
          // frame scrolls a little past the pin to show them).
          const railRoom = rail ? rail.offsetHeight - S.pin.safe.footerOverlap + S.pin.safe.margin : 0;
          const room = Math.max(railRoom, Math.round(vh - (topPx + end)));
          main.style.paddingBottom = '0px';
          r.el.style.paddingBottom = `${room}px`;
          // Shorter than its content: keep the content where it was laid out (the block centres it).
          Object.assign(pin.style, { height: `${end}px`, justifyContent: 'flex-start' });
          H = H0 - padBottom + room - (pinH - end);
        }
        // Portrait phones: a short pinned block leaves the next chapter's first words in the frame
        // while it's still pinned. Extra room under the block (padding and height together, so
        // the pin itself is unchanged) keeps them below the frame until the pin releases.
        const i = recs.indexOf(r);
        const next = recs[i + 1];
        if (next && phonePortrait(vh)) {
          const first = [...next.el.querySelectorAll('.label, h2, [data-line]')].find(shown);
          if (first) {
            const offset = first.getBoundingClientRect().top - r.el.getBoundingClientRect().bottom;
            const padBottom = parseFloat(getComputedStyle(r.el).paddingBottom) || 0;
            const extra = Math.max(0, Math.ceil(vh - (topPx + pinH + padBottom + offset)));
            if (extra) {
              r.el.style.paddingBottom = `${padBottom + extra}px`;
              H += extra;
            }
          }
        }
        r.el.style.height = `${H + distance}px`;
        // Anchors (deep links, the chapter index) land exactly where the pin engages — unless
        // the heading is above the frame while pinned: then just before, with the heading in view.
        if (heading) r.el.style.scrollMarginTop = `${topPx - padTop}px`;
        // How the pinned block fits (for tests and tuning): fits · scaled · scaled-short (short
        // screens) · over-sun (the art sits over the sun's path to keep the heading) · art-only
        // (the heading is above the frame while pinned: landscape phones).
        r.el.dataset.pinFit = placed.fit;
        r.pin = {
          pin,
          distance,
          top: topPx,
          padTop,
          lane: !!visual && getComputedStyle(visual.closest('[data-scene-lane]') ?? visual).position === 'absolute',
          fitted,
          start: r.el.getBoundingClientRect().top + window.scrollY + padTop - topPx,
        };
      }
      illus.forEach((x) => (x.last = NaN)); // redraw (a twin may have swapped in)
    };
    measure(window.innerHeight);

    // Late size changes (fonts, the panel images…) → re-measure on the next frame.
    let dirty = false;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      dirty = true;
      invalidate();
    });
    if (main) ro?.observe(main);

    /** Draw an illustration at t (skipped when t hasn't changed). */
    const play = (x: { art: HTMLElement; tl: IllusTimeline; last: number } | undefined, t: number) => {
      if (!x || t === x.last) return;
      x.last = t;
      x.tl.render(t);
      // Shown from its first frame on (global.css keeps it hidden until then: no jump on load).
      if (!('illusReady' in x.art.dataset)) x.art.dataset.illusReady = '';
    };
    /**
     * The scene timelines at (smoothed) scroll position y: each pinned scene's progress is
     * (y − its pin's start) / its length — one 0→1 timeline over pin.play, or (ch 3, 6, 12, 17)
     * the whole pin. Scenes far from the viewport are left as they are.
     */
    const renderTimelines = (y: number, vh: number) => {
      const scrollY = window.scrollY;
      for (const r of recs) {
        if (!r.pin) continue;
        const near = r.pin.start - scrollY; // where the block sits relative to its sticky top
        if (near > vh * 1.6 || near + r.pin.distance < -vh * 1.6) continue;
        const pinned = clamp01((y - r.pin.start) / r.pin.distance);
        // With a quote, the art finishes by `artEnd` and the quote lands after it.
        const quote = quotes.get(r.el);
        const artEnd = quote?.artEnd ?? 1;
        const whole = clamp01(pinned / artEnd);
        const t = seg(pinned, quote?.play ?? S.pin.play);
        quote?.render(pinned);
        const art = illus.get(r.el);
        if (art) play(art, r.el === doorwayScene ? whole : t);
        if (board && r.el === board.scene) board.pinned(pinned);
        else if (field && r.el === field.scene) field.pinned(whole);
        else if (chess && r.el === chess.scene) chess.pinned(whole, r.pin.lane ? r.pin.pin.getBoundingClientRect().top - r.pin.top : 0);
        else if (waver && r.el === waver.scene) waver.play(t);
        else if (cpu && r.el === cpu.scene) cpu.play(t);
      }
    };
    // The timelines follow a smoothed scroll (motion.story.smoothing): they glide, and settle exactly.
    const smoothed = createSmoothScroll(renderTimelines, {
      ...S.smoothing,
      flag: { el: document.querySelector<HTMLElement>('[data-story]'), name: 'settling-scenes' },
    });

    const stop = onScroll(({ scrollY, vh, resized }) => {
      let remeasured = false;
      if (resized || dirty) {
        dirty = false;
        measure(vh);
        remeasured = true;
      }
      const E = S.enter;
      const headerH = header?.offsetHeight ?? 0;
      for (const r of recs) {
        const rect = r.el.getBoundingClientRect();
        if (rect.bottom < -vh * 0.5 || rect.top > vh * 1.5) continue; // off-screen: leave as is

        w.set(r.el, '--scene-progress', clamp01((vh - rect.top) / (rect.height + vh)).toFixed(3));

        // Entry: rise and fade in from below, staggered by position.
        // Art-only pins (landscape phones): the words left above the frame fade as they slide
        // under the header, instead of sitting half-hidden behind the chapter pill all pin long.
        const hidesWords = r.el.dataset.pinFit === 'art-only';
        r.enter.forEach((e, i) => {
          const top = rect.top + e.offset;
          const t = easeOut(clamp01((vh * (1 - E.stagger * Math.min(i, 4)) - top) / (E.span * vh)));
          // (Its real position: inside a pinned block, the offset from the section's top no longer holds.)
          const o = hidesWords ? t * clamp01((e.el.getBoundingClientRect().top - (headerH - S.pin.wordsFade)) / S.pin.wordsFade) : t;
          w.set(e.el, 'opacity', o >= 1 ? '' : o.toFixed(3));
          const shift = fitShift.get(e.el) ?? 0;
          w.set(e.el, 'transform', t >= 1 && !shift ? '' : `translate3d(0, ${((1 - t) * E.rise + shift).toFixed(1)}px, 0)`);
        });
      }
      smoothed.set(scrollY, vh, remeasured);
    });

    return () => {
      stop();
      smoothed.dispose();
      ro?.disconnect();
      for (const r of recs) {
        clearPin(r);
        r.el.style.removeProperty('--scene-progress');
        r.enter.map((e) => e.el).forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
        });
      }
      board?.reset();
      waver?.reset();
      cpu?.reset();
      chess?.reset();
      field?.reset();
      resetIllus();
      resetQuotes();
      document.querySelector('[data-story]')?.removeAttribute('data-horizon-gap');
    };
  }, [allowed]);
}
