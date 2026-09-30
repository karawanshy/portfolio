import { expect, test, type Page } from '@playwright/test';
import { motion } from '../src/motion/config';

/**
 * /story S4: the chapter illustrations play while their chapter is pinned — at their start as
 * the pin engages, complete by its release — finish in the markup's state (ch 16: the trunk
 * closed), and reverse exactly. ch 17 is the climax with the sunrise. Reduced motion shows the
 * final states.
 */

/** Wait until the smoothed scroll (scene timelines, sun, sky) has settled on the current scroll position. */
async function settle(page: Page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page.locator('[data-story][data-settling-scenes], [data-story][data-settling-stage]')).toHaveCount(0);
}

async function openStory(page: Page, state: 'on' | 'reduced' = 'on') {
  await page.goto('/story');
  await expect(page.locator(`[data-story][data-motion="${state}"]`)).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
}

/** A pinned scene's scrub range (page px); sticky = it actually pins. */
async function pinRange(page: Page, id: string) {
  return page.evaluate((sceneId) => {
    const s = document.getElementById(sceneId)!;
    const pin = s.querySelector<HTMLElement>('[data-scene-pin]')!;
    const cs = getComputedStyle(s);
    const pad = parseFloat(cs.paddingTop);
    const start = s.getBoundingClientRect().top + scrollY + pad - parseFloat(pin.style.top || '0');
    const length = s.offsetHeight - pin.offsetHeight - pad - parseFloat(cs.paddingBottom);
    return { sticky: pin.style.position === 'sticky', start, end: start + length };
  }, id);
}
const scrollToY = async (page: Page, y: number) => {
  await page.evaluate((to) => scrollTo(0, to), y);
  await settle(page);
};

/** Scroll chapter n to where its pin engages (t = 0) or releases (t = 1). */
async function toPin(page: Page, n: number, t: 0 | 1) {
  const pin = await pinRange(page, `chapter-${n}`);
  expect(pin.sticky, `chapter-${n} pins`).toBe(true);
  await scrollToY(page, t === 0 ? pin.start + 1 : pin.end - 1);
}

/** Evaluates a chapter's probe expression. */
const read = (page: Page, fn: string) => page.evaluate(fn);

/** For each chapter: a probe, its value as the pin engages (start) and at its release (end). */
const cases: { n: number; name: string; probe: string; start: unknown; end: unknown }[] = [
  {
    n: 1,
    name: 'ch 1: the glows appear one by one, each switching on its spotlight on the girl, who lights up',
    probe: `(() => {
      const o = (el) => Number(getComputedStyle(el).opacity);
      const r = document.querySelector('#chapter-1 [data-illus]');
      return {
        glows: [...r.querySelectorAll('g[data-glow]')].map(o),
        beams: [...r.querySelectorAll('g[data-beam]')].map(o),
        lit: o(r.querySelector('[data-girl-lit]')),
      };
    })()`,
    start: { glows: [0, 0, 0, 0, 0], beams: [0, 0, 0, 0, 0], lit: 0 },
    end: { glows: [1, 1, 1, 1, 1], beams: [1, 1, 1, 1, 1], lit: 1 },
  },
  {
    n: 2,
    name: 'ch 2: the curtains part, the light comes on, the spark lands',
    probe: `(() => {
      const q = (k) => document.querySelector('#chapter-2 g[data-stage="' + k + '"]');
      const sx = new DOMMatrix(getComputedStyle(q('curtain-left')).transform).a;
      return { closed: sx > 1.5, spot: Number(getComputedStyle(q('spot')).opacity), spark: Number(getComputedStyle(q('spark')).opacity) };
    })()`,
    start: { closed: true, spot: 0, spark: 0 },
    end: { closed: false, spot: 1, spark: 1 },
  },
  {
    n: 7,
    name: 'ch 7: the applications fly in and pile up, the certificate lands last; the light under the door never changes',
    probe: `(() => {
      const svg = [...document.querySelectorAll('#chapter-7 [data-illus] > svg')].find((s) => s.getClientRects().length);
      const sheets = [...svg.querySelectorAll('g[data-envelope]')];
      return {
        home: sheets.filter((g) => g.style.transform === '').length,
        shown: sheets.filter((g) => Number(getComputedStyle(g).opacity) > 0).length,
        cert: Number(getComputedStyle(svg.querySelector('g[data-cert]')).opacity),
        light: getComputedStyle(svg.querySelector('[data-door-part="light"]')).opacity,
      };
    })()`,
    start: { home: 0, shown: 0, cert: 0, light: '1' },
    end: { home: 21, shown: 21, cert: 1, light: '1' },
  },
  {
    n: 8,
    name: 'ch 8: the builds come together in turn — the robot (its eyes lighting), the wired board and its LED, the house rising from its outline',
    probe: `(() => {
      const r = document.querySelector('#chapter-8 [data-illus]');
      const o = (el) => Number(getComputedStyle(el).opacity);
      const wire = (w) => (o(w) === 0 ? 0 : Math.round((1 - parseFloat(w.style.strokeDashoffset || '0')) * 100) / 100);
      return {
        pieces: [...r.querySelectorAll('[data-ch8-piece]')].filter((g) => g.style.transform === '' && o(g) === 1).length,
        eyes: o(r.querySelector('[data-ch8-robot-eyes]')),
        wires: [...r.querySelectorAll('path[data-ch8-wire]')].map(wire),
        led: o(r.querySelector('[data-ch8-led]')),
        risen: new DOMMatrix(getComputedStyle(r.querySelector('g[data-ch8-shape]')).transform).d === 1 && o(r.querySelector('g[data-ch8-shape]')) === 1,
        people: [...r.querySelectorAll('[data-kid], [data-teacher]')].map(o),
      };
    })()`,
    start: { pieces: 0, eyes: 0, wires: [0, 0], led: 0, risen: false, people: [1, 1, 1, 1, 1] },
    end: { pieces: 4, eyes: 1, wires: [1, 1], led: 1, risen: true, people: [1, 1, 1, 1, 1] },
  },
  {
    n: 9,
    name: 'ch 9: one after another, a few people in the crowd light up; the crowd stays',
    probe: `(() => {
      const r = document.querySelector('#chapter-9 [data-illus]');
      const o = (el) => Number(getComputedStyle(el).opacity);
      return {
        lit: [...r.querySelectorAll('path[data-pick-part="lit"]')].map(o),
        light: [...r.querySelectorAll('g[data-crowd-pick]')].map(o),
        crowd: [...r.querySelectorAll('[data-crowd-row]')].map(o),
      };
    })()`,
    start: { lit: [0, 0, 0], light: [0, 0, 0], crowd: [1, 1, 1, 1] },
    end: { lit: [1, 1, 1], light: [1, 1, 1], crowd: [1, 1, 1, 1] },
  },
  {
    n: 10,
    name: 'ch 10: the layers seat day by day, then the rail draws and every layer is checked',
    probe: `(() => {
      const r = document.querySelector('#chapter-10 [data-illus]');
      return {
        seated: [...r.querySelectorAll('g[data-day-kind="build"]')].filter((g) => g.style.transform === '' && getComputedStyle(g).opacity === '1').length,
        rail: getComputedStyle(r.querySelector('[data-day-rail]')).opacity === '0' ? 0 : 1 + parseFloat(r.querySelector('[data-day-rail]').style.strokeDashoffset || '0'),
        checks: [...r.querySelectorAll('g[data-day-check]')].map((c) => Number(getComputedStyle(c).opacity)),
      };
    })()`,
    start: { seated: 0, rail: 0, checks: [0, 0, 0, 0, 0] },
    end: { seated: 5, rail: 1, checks: [1, 1, 1, 1, 1] },
  },
  {
    n: 11,
    name: 'ch 11: rooms light floor by floor, hers last, then the date',
    probe: `(() => {
      const r = document.querySelector('#chapter-11 [data-illus]');
      const o = (el) => Number(getComputedStyle(el).opacity);
      return {
        rooms: [...r.querySelectorAll('rect[data-window-state="soft"]')].map(o).reduce((a, b) => a + b, 0),
        kept: o(r.querySelector('rect[data-window-state="kept"]')),
        date: o(r.querySelector('[data-date]')),
      };
    })()`,
    start: { rooms: 0, kept: 0, date: 0 },
    end: { rooms: 9, kept: 1, date: 1 },
  },
  {
    n: 13,
    name: 'ch 13: the sign goes off and the rooms go dark one by one; hers stays lit',
    probe: `(() => {
      const r = document.querySelector('#chapter-13 [data-illus]');
      const lit = [...r.querySelectorAll('[data-motion-copy]')].map((el) => Number(getComputedStyle(el).opacity));
      return { lit: lit.reduce((a, b) => a + b, 0), kept: getComputedStyle(r.querySelector('rect[data-window-state="kept"]')).opacity };
    })()`,
    start: { lit: 11, kept: '1' }, // 9 rooms, the entrance and the sign
    end: { lit: 0, kept: '1' },
  },
  {
    n: 15,
    name: 'ch 15: tasks travel into the hub and come out done',
    probe: `[...document.querySelectorAll('#chapter-15 [data-task="done"]')].map((d) => Number(getComputedStyle(d).opacity))`,
    start: [0, 0, 0, 0, 0, 0],
    end: [1, 1, 1, 1, 1, 1],
  },
  {
    n: 16,
    name: 'ch 16: the box settles, the lid closes, the tail lights come on, the days fade',
    probe: `(() => {
      const r = document.querySelector('#chapter-16 [data-illus]');
      const lid = new DOMMatrix(getComputedStyle(r.querySelector('[data-trunk-lid]')).transform);
      const lights = [...r.querySelectorAll('rect[data-motion-copy]')].map((el) => Number(getComputedStyle(el).opacity));
      return { lid: Math.round(lid.d * 100) / 100, lights, day3: Number(getComputedStyle(r.querySelector('[data-day="3"]')).opacity) };
    })()`,
    start: { lid: 1, lights: [0, 0], day3: 1 },
    end: { lid: motion.story.illus.trunk.lidClosed, lights: [1, 1], day3: 0.16 },
  },
];

test.describe('chapter illustrations play inside their pin, and reverse', () => {
  for (const c of cases) {
    test(c.name, async ({ page }) => {
      await openStory(page);
      await toPin(page, c.n, 0);
      expect(await read(page, c.probe), 'start').toEqual(c.start);
      await toPin(page, c.n, 1);
      expect(await read(page, c.probe), 'end').toEqual(c.end);
      await toPin(page, c.n, 0);
      expect(await read(page, c.probe), 'reversed').toEqual(c.start);
    });
  }

  test('ch 7: the applications are seen in flight, coming from the upper left; their path is never drawn', async ({ page }) => {
    await openStory(page);
    const pin = await pinRange(page, 'chapter-7');
    let flying = 0;
    for (const f of [0.15, 0.3, 0.45, 0.6]) {
      await scrollToY(page, pin.start + (pin.end - pin.start) * f);
      const s = await page.evaluate(() => {
        const svg = [...document.querySelectorAll('#chapter-7 [data-illus] > svg')].find((x) => x.getClientRects().length)!;
        const home = (g: SVGGElement) => g.getBoundingClientRect();
        return {
          // A visible sheet well up and to the left of where it rests: in the air.
          air: [...svg.querySelectorAll<SVGGElement>('g[data-envelope]')].filter((g) => {
            if (Number(getComputedStyle(g).opacity) === 0 || g.style.transform === '') return false;
            const m = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(g.style.transform);
            return !!m && Number(m[1]) < -10 && Number(m[2]) < -10 && home(g).width > 0;
          }).length,
          // Nothing draws the path: no dotted trail, no stroked path other than the door's own light.
          trail: svg.querySelectorAll('[data-trail] path[stroke-dasharray]').length,
        };
      });
      flying += s.air;
      expect(s.trail, `at ${f}`).toBe(0);
    }
    expect(flying).toBeGreaterThan(0);
  });

  test('ch 10: each layer’s check ticks in with its layer, never before it', async ({ page }) => {
    await openStory(page);
    const pin = await pinRange(page, 'chapter-10');
    let together = 0;
    for (const f of [0.15, 0.3, 0.45, 0.6, 0.75]) {
      await scrollToY(page, pin.start + (pin.end - pin.start) * f);
      const days = await page.evaluate(() =>
        [1, 2, 3, 4, 5].map((d) => {
          const o = (sel: string) => Number(getComputedStyle(document.querySelector(`#chapter-10 ${sel}`)!).opacity);
          return { layer: o(`g[data-day="${d}"]`), check: o(`g[data-day-check="${d}"]`) };
        }),
      );
      for (const d of days) expect(d.check).toBeLessThanOrEqual(d.layer + 1e-6);
      // Mid-play, some layers are done with their checks and some are still to come.
      if (days.some((d) => d.check === 1) && days.some((d) => d.layer === 0)) together++;
    }
    expect(together).toBeGreaterThan(0);
  });

  test('ch 18: the paper boat shows on the sea only in ch 18, drifts slowly out toward the sun, and back', async ({ page }) => {
    await openStory(page);
    const boat = () =>
      page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('[data-story-boat]')!;
        const b = el.querySelector('svg')!.getBoundingClientRect();
        const horizon = document.querySelector('[data-story-horizon]')!.getBoundingClientRect().top;
        return { o: Number(getComputedStyle(el).opacity), x: b.x + b.width / 2, w: b.width, below: b.bottom > horizon };
      });
    // Not in the earlier chapters.
    await toPin(page, 17, 1);
    expect((await boat()).o).toBe(0);
    const s18 = await page.evaluate(() => {
      const s = document.getElementById('chapter-18')!;
      return { top: s.getBoundingClientRect().top + scrollY, max: document.documentElement.scrollHeight - innerHeight };
    });
    const at = (f: number) => scrollToY(page, s18.top - 0.5 * (page.viewportSize()!.height) + (s18.max - (s18.top - 0.5 * page.viewportSize()!.height)) * f);
    await at(0.1);
    const near = await boat();
    expect(near.o).toBe(1);
    expect(near.below).toBe(true); // on the water
    await at(0.6);
    const mid = await boat();
    expect(mid.x).toBeGreaterThan(near.x);
    expect(mid.w).toBeLessThan(near.w);
    await scrollToY(page, s18.max);
    const far = await boat();
    expect(far.x).toBeGreaterThan(mid.x);
    expect(far.w).toBeLessThan(mid.w);
    // And back.
    await at(0.1);
    expect(await boat()).toEqual(near);
    await toPin(page, 17, 1);
    expect((await boat()).o).toBe(0);
  });

  test('the story ends as high above the horizon as the prologue starts, and the boat keeps clear of ch 18’s words and links', async ({ page }) => {
    await openStory(page);
    const gapAt = (sel: string) =>
      page.evaluate((q) => {
        const horizon = document.querySelector('[data-story-horizon]')!.getBoundingClientRect().top;
        return horizon - Math.max(...[...document.querySelectorAll(q)].map((el) => el.getBoundingClientRect().bottom));
      }, sel);
    const prologue = await gapAt('[data-scene-part="prologue"]');
    const s18 = await page.evaluate(() => {
      const s = document.getElementById('chapter-18')!;
      return { top: s.getBoundingClientRect().top + scrollY, max: document.documentElement.scrollHeight - innerHeight };
    });
    for (const f of [0.2, 0.5, 1]) {
      await scrollToY(page, s18.top + (s18.max - s18.top) * f);
      const hits = await page.evaluate(() => {
        const b = document.querySelector('[data-story-boat] svg')!.getBoundingClientRect();
        return [...document.querySelectorAll('#chapter-18 h2, #chapter-18 [data-line], #chapter-18 a, #chapter-18 button')]
          .map((el) => el.getBoundingClientRect())
          .filter((t) => t.width && !(t.right < b.left || t.left > b.right || t.bottom < b.top || t.top > b.bottom)).length;
      });
      expect(hits, `at ${f}`).toBe(0);
    }
    await scrollToY(page, s18.max);
    const end = await gapAt('#chapter-18 [data-story-ending] a');
    expect(Math.abs(end - prologue)).toBeLessThanOrEqual(2);
  });

  test('ch 14: the road draws, then the lit bend peels off, all inside its pin', async ({ page }) => {
    await openStory(page);
    const probe = () =>
      page.evaluate(() => {
        const r = document.querySelector('#chapter-14 [data-illus]')!;
        const bend = r.querySelector<SVGPathElement>('[data-fork="bend"]')!;
        const drawn = getComputedStyle(bend).opacity === '0' ? 0 : 1 - parseFloat(bend.style.strokeDashoffset || '0') / (bend.getTotalLength() + 1);
        const ty = (id: string) => new DOMMatrix(getComputedStyle(document.querySelector(`#${id} rect`)!).transform).f;
        return { bend: Math.round(drawn * 100) / 100, road: ty('fork-reveal-road'), branch: ty('fork-reveal-branch') };
      });
    await toPin(page, 14, 0);
    const s = await probe();
    expect(s.bend).toBe(0);
    expect(s.road).toBeGreaterThan(300); // the road's reveal still below it: nothing drawn yet
    await toPin(page, 14, 1);
    const e = await probe();
    expect(e).toMatchObject({ bend: 1 });
    expect(e.road).toBeLessThan(80);
    expect(e.branch).toBeLessThan(80);
    await toPin(page, 14, 0);
    expect(await probe()).toEqual(s);
  });
});

/**
 * The sun as it looks: the disc's lift (its centre above the horizon, px), its radius, its
 * opacity, and how much of it shows above the horizon (0…1).
 */
const sunLook = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector('[data-story-sun]')!.getBoundingClientRect();
    const disc = document.querySelector('[data-story-sun-full]')!;
    const d = disc.getBoundingClientRect();
    const horizon = box.top + box.height * 0.65;
    return {
      lift: Math.round(horizon - (d.top + d.height / 2)),
      radius: d.height / 2,
      shown: Math.round((Math.min(1, Math.max(0, (horizon - d.top) / d.height)) * 100)) / 100,
      opacity: Number(getComputedStyle(disc).opacity),
    };
  });

test.describe('ch 17: the climax and the sunrise', () => {
  const door = (page: Page) =>
    page.evaluate(() => {
      const r = document.querySelector('#chapter-17 [data-illus]')!;
      return {
        shown: Number(getComputedStyle(r.querySelector('[data-doorway="door"]')!).opacity),
        open: !r.querySelector('[data-door-leaf="leaf"]')!.getAttribute('d')!.includes('L96 0'),
        spill: Number(getComputedStyle(r.querySelector('[data-doorway="spill"]')!).opacity),
      };
    });

  test('the doorway draws, the door opens and the sun brightens from its dullest — in place, only in ch 17, and back', async ({ page }) => {
    await openStory(page);
    const pin = await pinRange(page, 'chapter-17');
    expect(pin.sticky).toBe(true);
    // The sun never moves: the half-sun on the horizon throughout; only its brightness changes.
    const inPlace = (s: Awaited<ReturnType<typeof sunLook>>) => {
      expect(Math.abs(s.lift)).toBeLessThanOrEqual(1);
      expect(s.shown).toBe(0.5);
    };
    // As the pin engages: the door isn't there yet, the sun still dull (ch 16).
    await scrollToY(page, pin.start + 1);
    expect(await door(page)).toMatchObject({ shown: 0, open: false, spill: 0 });
    const low = await sunLook(page);
    inPlace(low);
    expect(low.opacity).toBeLessThan(0.6);
    // The door opens before the sun brightens.
    await scrollToY(page, pin.start + (pin.end - pin.start) * 0.58);
    expect(await door(page)).toMatchObject({ open: true });
    const opening = await sunLook(page);
    inPlace(opening);
    expect(opening.opacity).toBeLessThan(0.7);
    // The release: door open, the sun radiant.
    await scrollToY(page, pin.end - 1);
    expect(await door(page)).toMatchObject({ shown: 1, open: true, spill: 1 });
    const risen = await sunLook(page);
    inPlace(risen);
    expect(risen.opacity).toBeGreaterThan(0.95);
    // Past it (ch 18, the bottom): fully radiant, still in place.
    await scrollToY(page, 1e6);
    const top = await sunLook(page);
    inPlace(top);
    expect(top.opacity).toBe(1);
    // And back.
    await scrollToY(page, pin.start + 1);
    expect(await sunLook(page)).toEqual(low);
    expect(await door(page)).toMatchObject({ shown: 0, open: false });
  });
});

test.describe('reduced motion: the final states', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the art as rendered (finished), the trunk closed, and the sun shows each chapter’s state, static', async ({ page }) => {
    await openStory(page, 'reduced');
    const s = await page.evaluate(() => ({
      glows: [...document.querySelectorAll('#chapter-1 g[data-glow]')].every((g) => getComputedStyle(g).opacity === '1'),
      curtain: (document.querySelector('#chapter-2 g[data-stage="curtain-left"]') as SVGElement).style.transform,
      days: [...document.querySelectorAll<SVGElement>('#chapter-10 g[data-day]')].every((g) => g.style.transform === '' && getComputedStyle(g).opacity === '1'),
      done: [...document.querySelectorAll('#chapter-15 [data-task="done"]')].every((d) => getComputedStyle(d).opacity === '1'),
      doorOpen: !document.querySelector('#chapter-17 [data-door-leaf="leaf"]')!.getAttribute('d')!.includes('L96 0'),
      lid: new DOMMatrix(getComputedStyle(document.querySelector('#chapter-16 [data-trunk-lid]')!).transform).d,
    }));
    expect(s).toMatchObject({ glows: true, curtain: '', days: true, done: true, doorOpen: true });
    expect(s.lid).toBeCloseTo(motion.story.illus.trunk.lidClosed, 2);
    // The prologue: the half-sun.
    const top = await sunLook(page);
    expect(Math.abs(top.lift)).toBeLessThanOrEqual(1);
    expect(top.shown).toBe(0.5);
    // Each chapter's sun, applied at once (no transition), in place: dull in ch 7, radiant in ch 17.
    const at = async (n: number) => {
      await page.evaluate((id) => document.getElementById(id)!.scrollIntoView(), `chapter-${n}`);
      await expect(page.locator('[data-story-sun]')).toHaveAttribute('style', new RegExp(`--sun-h0: ${motion.story.sun.chapters[n]!.h}(;|$)`));
      return sunLook(page);
    };
    const night = await at(7);
    expect(Math.abs(night.lift)).toBeLessThanOrEqual(1);
    expect(night.shown).toBe(0.5);
    expect(night.opacity).toBeLessThan(0.6);
    const risen = await at(17);
    expect(Math.abs(risen.lift)).toBeLessThanOrEqual(1);
    expect(risen.shown).toBe(0.5);
    expect(risen.opacity).toBeGreaterThan(0.95);
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(async () => (await sunLook(page)).shown).toBe(0.5);
  });
});

test.describe('first load mid-story', () => {
  test('the art in view waits for its first frame, then fades in', async ({ page }) => {
    await page.goto('/story#chapter-10');
    await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
    await expect(page.locator('#chapter-10 [data-illus]')).toHaveAttribute('data-illus-ready', '');
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('#chapter-10 [data-illus]')!).opacity)).toBe('1');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every illustration shows, the trunk is closed (as reduced motion), and the stage shows the prologue’s half-sun', async ({ page }) => {
    await page.goto('/story');
    const s = await page.evaluate(() => ({
      hidden: [...document.querySelectorAll('[data-illus]')].filter((el) => getComputedStyle(el).opacity !== '1').length,
      lid: new DOMMatrix(getComputedStyle(document.querySelector('#chapter-16 [data-trunk-lid]')!).transform).d,
    }));
    expect(s.hidden).toBe(0);
    expect(s.lid).toBeCloseTo(motion.story.illus.trunk.lidClosed, 2);
    const sun = await sunLook(page);
    expect(Math.abs(sun.lift)).toBeLessThanOrEqual(1);
    expect(sun.shown).toBe(0.5);
    // Scrolling changes nothing without JS: still the half-sun at the end.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    expect((await sunLook(page)).shown).toBe(0.5);
  });
});
