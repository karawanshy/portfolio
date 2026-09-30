import { expect, test, type Page } from '@playwright/test';
import { BOARD_PART_COUNT, BOARD_STROKE_COUNT } from '../src/story/scenes/boardData';
import { moves, squareXY } from '../src/story/scenes/chessData';
import { motion } from '../src/motion/config';
import { quoteTiming } from '../src/story/motion/quoteTiming';

/**
 * /story motion: every animated chapter pins while it plays and never traps scrolling (wheel and
 * keyboard, both ways), anchors land, the sun tells the progress, the Portfolio ↔ Story
 * transition, and the reduced-motion final states.
 */

/** Wait until the smoothed scroll (scene timelines, sun, sky) has settled on the current scroll position. */
async function settle(page: Page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page.locator('[data-story][data-settling-scenes], [data-story][data-settling-stage]')).toHaveCount(0);
}

const PINNED = Object.keys(motion.story.pin.length);

/** Open /story (optionally with a hash) and wait until the motion layer has hydrated and applied. */
async function openStory(page: Page, hash = '', state: 'on' | 'reduced' = 'on') {
  await page.goto(`/story${hash}`);
  await expect(page.locator(`[data-story][data-motion="${state}"]`)).toBeAttached();
}

/** Page scrollY where a pinned scene's scrub starts, and its length (0 when not pinned). */
async function pinRange(page: Page, id: string) {
  return page.evaluate((sceneId) => {
    const s = document.getElementById(sceneId)!;
    const pin = s.querySelector<HTMLElement>('[data-scene-pin]')!;
    const cs = getComputedStyle(s);
    const pad = parseFloat(cs.paddingTop);
    const T = parseFloat(pin.style.top || '0');
    const start = s.getBoundingClientRect().top + scrollY + pad - T;
    const length = s.offsetHeight - pin.offsetHeight - pad - parseFloat(cs.paddingBottom);
    return { sticky: pin.style.position === 'sticky', start, end: start + length };
  }, id);
}

const maxScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);

test.describe('pinned scenes', () => {
  test('every chapter (1–18) pins, each where its heading is in view', async ({ page }) => {
    await openStory(page);
    const pins = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-scene]')].map((s) => ({
        id: s.id,
        sticky: s.querySelector<HTMLElement>('[data-scene-pin]')!.style.position === 'sticky',
      })),
    );
    expect(pins.filter((p) => p.sticky).map((p) => p.id)).toEqual(PINNED);
    expect(PINNED).toEqual(Array.from({ length: 18 }, (_, i) => `chapter-${i + 1}`));
  });

  test('the wheel passes through every pin, down to the end and back up to the top', async ({ page }) => {
    test.setTimeout(120_000);
    await openStory(page);
    const vp = page.viewportSize()!;
    await page.mouse.move(vp.width / 2, vp.height / 2);
    let prev = await page.evaluate(() => scrollY);
    for (let i = 0; i < 300 && prev < (await maxScroll(page)) - 1; i++) {
      await page.mouse.wheel(0, 500);
      // Every wheel step moves the page (polled: under load a smooth-scroll step can start late).
      const from = prev;
      await expect.poll(() => page.evaluate(() => scrollY), { message: `wheel down moves the page (step ${i}, at ${from})`, timeout: 3000 }).toBeGreaterThan(from);
      prev = await page.evaluate(() => scrollY);
    }
    expect(prev).toBeGreaterThanOrEqual((await maxScroll(page)) - 1);
    // Let the last smooth-scroll step finish at the bottom before turning round.
    await page.waitForTimeout(400);
    prev = await page.evaluate(() => scrollY);
    for (let i = 0; i < 300 && prev > 0; i++) {
      await page.mouse.wheel(0, -500);
      // Every wheel step moves the page (polled: under load a smooth-scroll step can start late).
      const from = prev;
      await expect.poll(() => page.evaluate(() => scrollY), { message: `wheel up moves the page (step ${i}, at ${from})`, timeout: 3000 }).toBeLessThan(from);
      prev = await page.evaluate(() => scrollY);
    }
    expect(prev).toBe(0);
  });

  test('the keyboard passes through every pin both ways (Page Down / Page Up)', async ({ page }) => {
    test.setTimeout(240_000);
    await openStory(page);
    await page.evaluate(() => document.getElementById('main')!.focus({ preventScroll: true }));
    const y = () => page.evaluate(() => scrollY);
    /**
     * One key step. Under heavy parallel load Chrome can drop a key-scroll while the previous
     * smooth scroll is still running (seen once in a full run, never alone): the page is not
     * stuck, the input was lost. So a step may press again (up to 3 times), but it must move.
     */
    const step = async (key: 'PageDown' | 'PageUp', from: number) => {
      const moved = (v: number) => (key === 'PageDown' ? v > from : v < from);
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.keyboard.press(key);
        const t0 = Date.now();
        while (Date.now() - t0 < 1500) {
          const v = await y();
          if (moved(v)) return v;
          await page.waitForTimeout(40);
        }
      }
      throw new Error(`${key} never moved the page from ${from}`);
    };
    let prev = await y();
    for (let i = 0; i < 200 && prev < (await maxScroll(page)) - 1; i++) prev = await step('PageDown', prev);
    expect(prev).toBeGreaterThanOrEqual((await maxScroll(page)) - 1);
    for (let i = 0; i < 200 && prev > 0; i++) prev = await step('PageUp', prev);
    expect(prev).toBe(0);
  });

  test('a pinned block holds still through its pin and moves on after the release', async ({ page }) => {
    await openStory(page);
    for (const id of PINNED) {
      const { start, end } = await pinRange(page, id);
      const top = async (y: number) => {
        await page.evaluate((to) => scrollTo(0, to), y);
        return page.evaluate((sceneId) => Math.round(document.querySelector(`#${sceneId} [data-scene-pin]`)!.getBoundingClientRect().top), id);
      };
      const t0 = await top(start + 1);
      expect(await top((start + end) / 2), id).toBe(t0);
      expect(await top(end - 1), id).toBe(t0);
      if (id === PINNED.at(-1)) {
        // The last chapter: the page ends where its pin ends — the composed ending is the final frame.
        expect(Math.abs((await maxScroll(page)) - end), id).toBeLessThanOrEqual(2);
        expect(await top(1e7), id).toBe(t0);
      } else {
        // After the release it scrolls on.
        expect(await top(end + 200), id).toBeLessThan(t0 - 198);
      }
      expect(await top(start - 200), id).toBeGreaterThan(t0 + 150);
    }
  });

  test('ch 3 scrubs: the board is written stroke by stroke (chalk on the tip), then the quote lands and holds', async ({ page }) => {
    test.setTimeout(90_000); // many scroll steps, each waiting for the smoothed scrub to settle
    await openStory(page);
    const { start, end } = await pinRange(page, 'chapter-3');
    const state = () =>
      page.evaluate(() => {
        const scene = document.getElementById('chapter-3')!;
        const board = [...scene.querySelectorAll<SVGSVGElement>('svg[data-scene-part="board"]')].find((s) => s.getClientRects().length)!;
        // Each part (one pen movement) draws with its dash offset 1 → 0 and is hidden at 0.
        let drawn = 0;
        let total = 0;
        let tip: { x: number; y: number } | null = null;
        let visibleStrokes = 0;
        for (const stroke of board.querySelectorAll<SVGGElement>('g[data-stroke]')) {
          let any = false;
          for (const p of stroke.querySelectorAll<SVGPathElement>('path[data-stroke-part]')) {
            const L = p.getTotalLength();
            const f = getComputedStyle(p).opacity === '0' ? 0 : 1 - parseFloat(p.style.strokeDashoffset || '0');
            drawn += f * L;
            total += L;
            if (f > 0) any = true;
            if (f > 0.1 && f < 0.9) tip = p.getPointAtLength(f * L);
          }
          if (any) visibleStrokes++;
        }
        const m = new DOMMatrix(getComputedStyle(board.querySelector('[data-board-chalk]')!).transform);
        const q = [...scene.querySelectorAll<HTMLElement>('[data-quote-line]')].map((el) => Number(getComputedStyle(el).opacity));
        return { drawn: drawn / total, visibleStrokes, tipGap: tip ? Math.hypot(tip.x - m.e, tip.y - m.f) : null, q };
      });
    const at = async (f: number) => {
      await page.evaluate((y) => scrollTo(0, y), start + (end - start) * f);
      await settle(page);
      return state();
    };

    // An empty board when the pin begins.
    expect(await at(0)).toMatchObject({ drawn: 0, visibleStrokes: 0, q: [0, 0] });
    // Writing: strokes only ever increase; mid-way the chalk sits on the active stroke's tip.
    let prev = 0;
    let tipChecked = false;
    const B = motion.story.board;
    for (let f = 0.05; f <= B.write[1]; f += 0.02) {
      const s = await at(f);
      expect(s.drawn, `drawn at ${f.toFixed(2)}`).toBeGreaterThanOrEqual(prev);
      if (s.tipGap !== null && s.drawn > 0.3 && s.drawn < 0.7) {
        expect(s.tipGap).toBeLessThan(2);
        tipChecked = true;
      }
      prev = s.drawn;
    }
    expect(tipChecked).toBe(true);
    // Fully written before the quote lands.
    const written = await at((B.write[1] + B.quote0[0]) / 2);
    expect(written).toMatchObject({ drawn: 1, visibleStrokes: BOARD_STROKE_COUNT, q: [0, 0] });
    expect((await at(B.quote0[1])).q[0]).toBeGreaterThan(0.5);
    expect((await at(B.quote0[1])).q[1]).toBeLessThan(0.1); // the second line lands second
    expect(await at(0.9)).toMatchObject({ drawn: 1, q: [1, 1] }); // the hold
    // Scrolling back un-draws it.
    const back = await at(0.3);
    expect(back.drawn).toBeGreaterThan(0);
    expect(back.drawn).toBeLessThan(0.7);
    expect(await at(0)).toMatchObject({ drawn: 0, visibleStrokes: 0 });
  });

  test('ch 12 resolves: failing tests turn green in sequence, the CI line heals, nothing dims, reversible', async ({ page }) => {
    test.setTimeout(90_000);
    await openStory(page);
    const { start, end } = await pinRange(page, 'chapter-12');
    const at = async (f: number) => {
      await page.evaluate((y) => scrollTo(0, y), start + (end - start) * f);
      await settle(page);
      return page.evaluate(() => {
        const svg = document.querySelector('#chapter-12 svg[data-scene-part="field"]')!;
        const count = (k: string) => (svg.querySelector(`[data-dots="${k}"]`)!.getAttribute('d')!.match(/M/g) ?? []).length;
        const off = (k: string) => Number(svg.querySelector(`[data-ci-stop="${k}"]`)!.getAttribute('offset'));
        const ys = [...svg.querySelector('[data-ci-line]')!.getAttribute('d')!.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
        const lit = (sel: string) => {
          const cs = getComputedStyle(svg.querySelector(sel)!);
          return { opacity: Number(cs.opacity), filter: cs.filter, stroke: cs.stroke };
        };
        return {
          pass: count('pass'),
          fail: count('fail') + count('fail-alt'),
          // The green share of the CI line: where the steady mask is fully white.
          green: off('heal-0'),
          jag: Math.max(...ys) - Math.min(...ys),
          passDots: lit('[data-dots="pass"]'),
          steady: lit('[data-ci-steady]'),
        };
      });
    };
    // Failing and unstable when the pin begins.
    const first = await at(0);
    expect(first).toMatchObject({ pass: 0, green: 0 });
    expect(first.fail).toBeGreaterThanOrEqual(600);
    expect(first.jag).toBeGreaterThan(20);
    // Forward: green only ever grows, and it is sequential (a mixed field mid-way).
    let prev = { pass: 0, green: 0 };
    let mixed = false;
    for (let f = 0.05; f <= 1.0001; f += 0.05) {
      const s = await at(f);
      expect(s.pass, `pass at ${f.toFixed(2)}`).toBeGreaterThanOrEqual(prev.pass);
      expect(s.green, `CI green at ${f.toFixed(2)}`).toBeGreaterThanOrEqual(prev.green);
      if (s.pass > 60 && s.fail > 60) mixed = true;
      prev = s;
    }
    expect(mixed).toBe(true);
    // Resolved and held: all green, the line flat and fully steady — and lit, not dimmed.
    const done = await at(1);
    expect(done).toMatchObject({ fail: 0, green: 1, jag: 0 });
    expect(done.pass).toBeGreaterThanOrEqual(600);
    for (const el of [done.passDots, done.steady]) {
      expect(el.opacity).toBe(1);
      expect(el.filter).toContain('drop-shadow');
    }
    expect(done.passDots.stroke).toBe(first.passDots.stroke); // same green throughout, never faded
    // Back: un-resolves in reverse.
    const back = await at(0.4);
    expect(back.fail).toBeGreaterThan(60);
    expect(back.green).toBeLessThan(1);
    expect(back.jag).toBeGreaterThan(10);
    expect(await at(0)).toMatchObject({ pass: 0, green: 0 });
  });
});

test.describe('ch 4: the route to 99 draws from its start inside the pin, and back', () => {
  /** Scroll to progress `t` of the animation (pin.play) and read how far each piece is drawn. */
  const at = async (page: Page, t: number) => {
    const { start, end } = await pinRange(page, 'chapter-4');
    // (Ends before the chapter's quote lands.)
    const [a, b] = quoteTiming('chapter-4', true).play;
    await page.evaluate((y) => scrollTo(0, y), Math.floor(start + (end - start) * (a + (b - a) * t)));
    await settle(page);
    return page.evaluate(() => {
      const svg = [...document.querySelectorAll<SVGSVGElement>('#chapter-4 svg[data-scene-part="waver"]')].find((x) => x.getClientRects().length)!;
      const drawn = (k: string) => {
        const el = svg.querySelector<SVGPathElement>(`[data-waver="${k}"]`)!;
        if (getComputedStyle(el).opacity === '0') return 0;
        return 1 - parseFloat(el.style.strokeDashoffset || '0') / (el.getTotalLength() + 1);
      };
      const op = (k: string) => Number(getComputedStyle(svg.querySelector(`[data-waver="${k}"]`)!).opacity);
      return {
        lead: drawn('lead'),
        b: drawn('b'),
        settled: drawn('settled'),
        figure: Number(getComputedStyle(svg.querySelector('[data-scene-part="figure"]')!).opacity),
        opacity: { lead: op('lead'), a: op('a'), b: op('b'), settled: op('settled') },
      };
    });
  };

  test('nothing drawn as the pin engages; the route draws in order; 99 only at the end; and back', async ({ page }) => {
    await openStory(page);
    expect(await at(page, 0)).toMatchObject({ lead: 0, b: 0, settled: 0, figure: 0 });
    const early = await at(page, 0.1);
    expect(early.lead).toBeGreaterThan(0);
    expect(early.lead).toBeLessThan(1);
    expect(early).toMatchObject({ b: 0, settled: 0, figure: 0 });
    const mid = await at(page, 0.45);
    expect(mid.lead).toBe(1);
    expect(mid.b).toBeGreaterThan(0.2);
    expect(mid.b).toBeLessThan(0.8);
    expect(mid).toMatchObject({ settled: 0, figure: 0 });
    expect((await at(page, 0.8)).figure).toBe(0);
    const done = await at(page, 1);
    expect(done).toMatchObject({ lead: 1, b: 1, settled: 1, figure: 1, opacity: { lead: 1, b: 1, settled: 1 } });
    expect(done.opacity.a).toBe(mid.opacity.a);
    const back = await at(page, 0.2);
    expect(back.figure).toBe(0);
    expect(back.b).toBe(0);
    expect(back.lead).toBeLessThan(1);
  });
});

test.describe('ch 5: the CPU assembles inside its pin, and comes apart on the way back', () => {
  /** Scroll to progress `t` of the assembly (pin.play), and read the parts. */
  const at = async (page: Page, t: number) => {
    const { start, end } = await pinRange(page, 'chapter-5');
    // (Ends before the chapter's quote lands.)
    const [a, b] = quoteTiming('chapter-5', true).play;
    await page.evaluate((y) => scrollTo(0, y), Math.floor(start + (end - start) * (a + (b - a) * t)));
    await settle(page);
    return page.evaluate(() => {
      const svg = document.querySelector<SVGSVGElement>('#chapter-5 svg[data-scene-part="cpu"]')!;
      const parts = [...svg.querySelectorAll<SVGGElement>('g[data-cpu-part][data-cpu-dx]')].map((g) => {
        const m = new DOMMatrix(getComputedStyle(g).transform);
        return { off: Math.hypot(m.e, m.f), opacity: Number(getComputedStyle(g).opacity) };
      });
      const buses = [...svg.querySelectorAll<SVGPathElement>('path[data-cpu-bus]')].map((b) =>
        getComputedStyle(b).opacity === '0' ? 0 : 1 - parseFloat(b.style.strokeDashoffset || '0'),
      );
      return { parts, buses };
    });
  };

  test('parts are off their seats as the pin engages, all seated (and wired) at the end, and it reverses', async ({ page }) => {
    await openStory(page);
    const start = await at(page, 0);
    expect(start.parts.every((p) => p.off > 30 && p.opacity < 0.05), JSON.stringify(start)).toBe(true); // (scroll lands on whole px)
    expect(start.buses.every((b) => b === 0)).toBe(true);
    const mid = await at(page, 0.35);
    expect(mid.parts.some((p) => p.off < 1)).toBe(true); // the first ones are seated…
    expect(mid.parts.some((p) => p.off > 30)).toBe(true); // …the last ones still on their way
    const end = await at(page, 1);
    expect(end.parts.every((p) => p.off < 0.5 && p.opacity === 1)).toBe(true);
    expect(end.buses.every((b) => b > 0.99)).toBe(true);
    const back = await at(page, 0.35);
    expect(back).toEqual(mid);
    expect((await at(page, 0)).parts.every((p) => p.off > 30)).toBe(true);
  });
});

test.describe('ch 6: the chess exchange plays, and un-plays on the way back', () => {
  /** Scroll to progress `t` of the exchange (the pin) and read the moved pieces. */
  const at = async (page: Page, t: number) => {
    const { start, end } = await pinRange(page, 'chapter-6');
    await page.evaluate((y) => scrollTo(0, y), start + t * (end - start));
    await settle(page);
    return page.evaluate(() => {
      const svg = [...document.querySelectorAll<SVGSVGElement>('#chapter-6 svg[data-scene-part="chess"]')].find((x) => x.getClientRects().length)!;
      const pos = (side: string, id: string) => {
        const m = new DOMMatrix(getComputedStyle(svg.querySelector(`g[data-chess-board="${side}"] g[data-chess-piece="${id}"]`)!).transform);
        return [Math.round(m.e), Math.round(m.f)];
      };
      const pieces: Record<string, number[]> = {};
      for (const id of ['w-p-e', 'b-p-e', 'w-n-g', 'b-n-b']) for (const side of ['a', 'b']) pieces[`${side}:${id}`] = pos(side, id);
      const pulses = [...svg.querySelectorAll('circle[data-chess-pulse]')].map((c) => Number(getComputedStyle(c).opacity));
      return { pieces, pulses };
    });
  };
  const squares = (which: 'from' | 'to') => {
    const out: Record<string, number[]> = {};
    for (const m of moves) for (const side of ['a', 'b'] as const) out[`${side}:${m.piece}`] = squareXY(m[which], side).map(Math.round);
    return out;
  };

  test('start squares when it begins, a pulse on the thread mid-move, the synced position at the end, and back', async ({ page }) => {
    await openStory(page);
    expect((await pinRange(page, 'chapter-6')).sticky).toBe(true);
    expect((await at(page, 0)).pieces).toEqual(squares('from'));
    let pulseSeen = false;
    for (let t = 0.02; t < 0.3 && !pulseSeen; t += 0.02) pulseSeen = (await at(page, t)).pulses.some((o) => o > 0.5);
    expect(pulseSeen).toBe(true);
    const end = await at(page, 1);
    expect(end.pieces).toEqual(squares('to'));
    expect(end.pulses.every((o) => o === 0)).toBe(true);
    expect((await at(page, 0)).pieces).toEqual(squares('from'));
  });
});

test.describe('the sun tells the story’s progress', () => {
  const K = motion.story.sun.chapters;
  /** The sun's state (as motion writes it) and what it looks like: the disc's lift above the horizon (px, its centre) and opacity. */
  const sun = (page: Page) =>
    page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-story-sun]')!;
      const disc = document.querySelector('[data-story-sun-full]')!;
      const box = el.getBoundingClientRect();
      const d = disc.getBoundingClientRect();
      const horizon = box.top + box.height * 0.65;
      return {
        h: Number(el.style.getPropertyValue('--sun-h')),
        b: Number(el.style.getPropertyValue('--sun-b')),
        lift: Math.round(horizon - (d.top + d.height / 2)),
        radius: d.height / 2,
        disc: Number(getComputedStyle(disc).opacity),
        flare: Number(getComputedStyle(document.querySelector('[data-story-sun-flare]')!).opacity),
      };
    });
  const to = async (page: Page, y: number) => {
    await page.evaluate((v) => scrollTo(0, v), y);
    await settle(page);
    return sun(page);
  };

  test('the prologue shows the half-sun: its centre on the horizon, warm dusk', async ({ page }) => {
    await openStory(page);
    const s = await sun(page);
    expect(s).toMatchObject({ h: 0, b: K[0]!.b });
    expect(Math.abs(s.lift)).toBeLessThanOrEqual(1); // the horizon cuts it in half
  });

  const anchors = (page: Page) =>
    page.evaluate(() => document.querySelector<HTMLElement>('[data-story-stage]')!.dataset.sunAnchors!.split(' ').map(Number));

  test('each chapter’s keyframe sits at its anchor (inside its pin); dark in ch 7 and 16; up at the end; and back', async ({ page }) => {
    test.setTimeout(120_000);
    await openStory(page);
    const xs = await anchors(page);
    expect(xs).toHaveLength(K.length);
    for (let n = 0; n < K.length; n++) {
      // Anchors are inside the chapter's pin (the prologue: the top; the last chapter: the bottom).
      if (n > 0 && n < K.length - 1 && PINNED.includes(`chapter-${n}`)) {
        const pin = await pinRange(page, `chapter-${n}`);
        expect(xs[n]!, `chapter-${n} anchor`).toBeGreaterThan(pin.start);
        expect(xs[n]!, `chapter-${n} anchor`).toBeLessThan(pin.end);
      }
      const s = await to(page, xs[n]!);
      expect(s.h, `chapter-${n} h`).toBeCloseTo(K[n]!.h, 3);
      expect(s.b, `chapter-${n} b`).toBeCloseTo(K[n]!.b, 3);
      // The sun stays in its place: the half-sun on the horizon, whatever its state.
      expect(Math.abs(s.lift), `chapter-${n} lift`).toBeLessThanOrEqual(1);
      if (n === 7 || n === 16) {
        // The long night / three days left: dull.
        expect(s.disc, `chapter-${n}`).toBeLessThan(0.6);
      }
      if (n >= 17) {
        // The sunrise: bright, the horizon flaring.
        expect(s.disc, `chapter-${n}`).toBeGreaterThan(0.95);
        expect(s.flare, `chapter-${n}`).toBeGreaterThan(0.8);
      }
    }
    expect(await to(page, 1e7)).toMatchObject({ h: 1, b: 1 });
    // And back to the top: the half-sun again.
    expect(await to(page, 0)).toMatchObject({ h: 0, b: K[0]!.b });
  });

  test('the sun never stops while the page scrolls: it changes at every 40px, both ways', async ({ page }) => {
    test.setTimeout(180_000);
    await openStory(page);
    const xs = await anchors(page);
    const samples = await page.evaluate(async () => {
      const stage = document.querySelector<HTMLElement>('[data-story-stage]')!;
      const max = document.documentElement.scrollHeight - innerHeight;
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const out: [number, number, number][] = [];
      const read = async (y: number) => {
        scrollTo(0, y);
        await frame();
        const [h, b] = stage.dataset.sunTarget!.split(' ').map(Number) as [number, number];
        out.push([scrollY, h, b]);
      };
      for (let y = 0; y <= max; y += 40) await read(y);
      await read(max);
      for (let y = max - 20; y >= 0; y -= 40) await read(y);
      await read(0);
      return out;
    });
    const last = xs[xs.length - 1]!;
    for (let i = 1; i < samples.length; i++) {
      const [y0, h0, b0] = samples[i - 1]!;
      const [y1, h1, b1] = samples[i]!;
      if (y0 === y1) continue;
      // Two samples straddling a turning point (the sun sinks, then rises) can read the same
      // either side of its lowest point: that's the turn itself, not a stop.
      const prev = samples[i - 2];
      const next = samples[i + 1];
      const turns = !!prev && !!next && ((h0 - prev[1]) * (next[1] - h1) < 0 || (b0 - prev[2]) * (next[2] - b1) < 0);
      if (!turns) expect(h0 !== h1 || b0 !== b1, `the sun moves between ${y0} and ${y1}`).toBe(true);
      // Within the keyframes' range (a turning point overshoots only slightly).
      expect(h1).toBeGreaterThanOrEqual(Math.min(...K.map((k) => k.h)) - 0.05);
      expect(h1).toBeLessThanOrEqual(1);
    }
    expect(samples.at(-1)![0]).toBe(0);
    expect(last).toBeGreaterThan(0);
  });

  test('it glides: after a scroll step the displayed sun eases to the target, then settles exactly on it', async ({ page }) => {
    await openStory(page);
    const xs = await anchors(page);
    await to(page, xs[6]!);
    await page.evaluate((y) => scrollTo(0, y), xs[6]! + 300);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const mid = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-story-sun]')!;
      return { shown: Number(el.style.getPropertyValue('--sun-h')), target: Number(document.querySelector<HTMLElement>('[data-story-stage]')!.dataset.sunTarget!.split(' ')[0]) };
    });
    expect(mid.shown).not.toBe(mid.target); // still on its way
    await settle(page);
    const done = await page.evaluate(() => ({
      shown: document.querySelector<HTMLElement>('[data-story-sun]')!.style.getPropertyValue('--sun-h'),
      target: document.querySelector<HTMLElement>('[data-story-stage]')!.dataset.sunTarget!.split(' ')[0],
    }));
    expect(done.shown).toBe(done.target);
  });

  test('a deep link lands on the same sun as scrolling there', async ({ page }) => {
    await openStory(page, '#chapter-15');
    await expect.poll(async () => (await sun(page)).b).toBeGreaterThan(0);
    const landed = { y: await page.evaluate(() => scrollY), ...(await sun(page)) };
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(async () => (await sun(page)).h).toBe(0);
    await page.evaluate((y) => scrollTo(0, y), landed.y);
    await expect.poll(async () => (await sun(page)).h).toBeCloseTo(landed.h, 3);
    expect((await sun(page)).b).toBeCloseTo(landed.b, 3);
  });
});

test.describe('anchors land headings fully in view', () => {
  test('deep link to #chapter-12', async ({ page }) => {
    await page.goto('/story#chapter-12');
    await expect(page.getByRole('heading', { level: 2, name: '600+ Failures' })).toBeInViewport({ ratio: 1 });
  });

  test('deep links land where each pin engages (animation at its start), heading in view', async ({ page }) => {
    test.setTimeout(120_000);
    for (const id of PINNED) {
      await openStory(page, `#${id}`);
      await settle(page);
      await expect(page.locator(`#${id} h2`), id).toBeInViewport({ ratio: 1 });
      const { start } = await pinRange(page, id);
      const exact = await page.evaluate((sceneId) => document.getElementById(sceneId)!.style.scrollMarginTop !== '', id);
      const y = await page.evaluate(() => scrollY);
      // Exactly at the pin's start — or, where the pinned frame can't show the heading (ch 3 on
      // phones), just before it, with the heading in view.
      if (exact) expect(Math.abs(y - start), id).toBeLessThanOrEqual(2);
      else expect(y, id).toBeLessThanOrEqual(start);
    }
  });

  test('chapter index jumps to the pinned ch 3 and past it', async ({ page }) => {
    await openStory(page);
    for (const name of [/The First Time I Heard of Computer Science/, /600\+ Failures/, /The Detour/, /Maybe This Wasn/]) {
      await page.locator('[data-chapter-indicator]').click();
      await page.getByRole('dialog', { name: 'Chapters' }).getByRole('link', { name }).click();
      await expect(page.getByRole('heading', { level: 2, name })).toBeInViewport({ ratio: 1 });
    }
  });
});

test.describe('Portfolio ↔ Story transition', () => {
  test('the Story band enters the Story at the Prologue', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /the path here wasn’t exactly straight/i }).click();
    await expect(page).toHaveURL(/\/story$/);
    await expect(page.getByRole('heading', { level: 1, name: 'How I Got Here' })).toBeInViewport({ ratio: 1 });
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('[data-vt-orb]').length)).toBe(0);
  });

  for (const [label, locate] of [
    ['← Portfolio', (p: Page) => p.getByRole('link', { name: 'Back to the portfolio' }).first()],
    ['the K◒ logo', (p: Page) => p.locator('header').getByRole('link').first()],
  ] as const) {
    test(`${label} returns to the Story band (#story), not the top`, async ({ page }) => {
      await page.goto('/story#chapter-5');
      await locate(page).click();
      await expect(page).toHaveURL(/\/#story$/);
      await expect(page.getByRole('heading', { level: 2, name: 'The path here wasn’t exactly straight.' })).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(1000);
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('no pins, and every slice scene shows its final state', async ({ page }) => {
    await openStory(page, '', 'reduced');
    const s = await page.evaluate((counts) => {
      const q = (sel: string) => document.querySelector<HTMLElement | SVGElement>(sel)!;
      const field = q('#chapter-12 svg[data-scene-part="field"]');
      const count = (k: string) => (field.querySelector(`[data-dots="${k}"]`)!.getAttribute('d')!.match(/M/g) ?? []).length;
      const visibleBoard = [...document.querySelectorAll<SVGSVGElement>('#chapter-3 svg[data-scene-part="board"]')].find((x) => x.getClientRects().length)!;
      const strokes = [...visibleBoard.querySelectorAll<SVGGElement>('g[data-stroke]')];
      const parts = [...visibleBoard.querySelectorAll<SVGPathElement>('path[data-stroke-part]')];
      const waver = [...document.querySelectorAll<SVGSVGElement>('#chapter-4 svg[data-scene-part="waver"]')].find((x) => x.getClientRects().length)!;
      return {
        sticky: [...document.querySelectorAll<HTMLElement>('[data-scene-pin]')].filter((el) => getComputedStyle(el).position === 'sticky').length,
        boardWritten:
          strokes.length === counts.strokes &&
          parts.length === counts.parts &&
          parts.every((p) => getComputedStyle(p).opacity === '1' && ['none', ''].includes(p.style.strokeDasharray)),
        // The chalk stays where the markup rests it (boardChalkRest): no motion transform.
        chalkAtRest: visibleBoard.querySelector<SVGGElement>('[data-board-chalk]')!.style.transform === '',
        quote: [...document.querySelectorAll('#chapter-3 [data-quote-line]')].map((el) => getComputedStyle(el).opacity),
        // Finished = fully drawn: nothing dimmed, and the whole route is one gradient (lead, a, b, settled).
        waverOnePath: (() => {
          const paths = [...waver.querySelectorAll<SVGPathElement>('path[data-waver]')];
          const paints = new Set(paths.map((p) => p.getAttribute('stroke')));
          const b = Number(getComputedStyle(waver.querySelector('[data-waver="b"]')!).opacity);
          return paths.length === 4 && paints.size === 1 && b === 1;
        })(),
        waverDrawn: getComputedStyle(waver.querySelector('[data-waver="settled"]')!).strokeDashoffset,
        figure: getComputedStyle(waver.querySelector('[data-scene-part="figure"]')!).opacity,
        cpu: [...document.querySelectorAll<SVGGElement>('#chapter-5 g[data-cpu-part]')].every((g) => getComputedStyle(g).opacity === '1' && g.style.transform === ''),
        // Chess: the synced final position as rendered (no motion transforms), pulses hidden.
        chessFinal: Object.entries(counts.finals).every(([key, [x, y]]) => {
          const [side, id] = key.split(':');
          const svg = [...document.querySelectorAll('#chapter-6 svg[data-scene-part="chess"]')].find((x) => x.getClientRects().length)!;
          return [...svg.querySelectorAll(`g[data-chess-board="${side}"] g[data-chess-piece="${id}"]`)].every((g) => {
            const m = new DOMMatrix(getComputedStyle(g).transform);
            return Math.round(m.e) === x && Math.round(m.f) === y && m.a === 1;
          });
        }),
        pulsesHidden: [...document.querySelectorAll('#chapter-6 circle[data-chess-pulse]')].every((c) => getComputedStyle(c).opacity === '0'),
        field: { fail: count('fail') + count('fail-alt'), pass: count('pass') },
        // Resolved: a steady green line over its whole length, lit (no motion styles), no sweep.
        steady: getComputedStyle(field.querySelector('[data-ci-steady]')!).opacity,
        ciGreen: ['heal-0', 'heal-1', 'fail-0', 'fail-1'].map((k) => Number(field.querySelector(`[data-ci-stop="${k}"]`)!.getAttribute('offset'))),
        passLit: getComputedStyle(field.querySelector('[data-dots="pass"]')!).opacity,
        sweep: field.querySelectorAll('[data-field-sweep]').length,
        scenesHidden: [...document.querySelectorAll('[data-scene] :is(h1, h2, [data-line])')].filter((el) => getComputedStyle(el).opacity !== '1').length,
        // No motion on the sun: the prologue's static state (StoryStage), nothing written inline.
        sunDriven: document.querySelector<HTMLElement>('[data-story-sun]')!.style.getPropertyValue('--sun-h'),
      };
    }, {
      strokes: BOARD_STROKE_COUNT,
      parts: BOARD_PART_COUNT,
      finals: Object.fromEntries(moves.flatMap((m) => (['a', 'b'] as const).map((side) => [`${side}:${m.piece}`, squareXY(m.to, side).map(Math.round)]))),
    });
    expect(s).toMatchObject({
      sticky: 0,
      boardWritten: true,
      chalkAtRest: true,
      quote: ['1', '1'],
      waverOnePath: true,
      figure: '1',
      cpu: true,
      chessFinal: true,
      pulsesHidden: true,
      field: { fail: 0 },
      steady: '1',
      ciGreen: [1, 1, 1, 1],
      passLit: '1',
      sweep: 0,
      scenesHidden: 0,
      sunDriven: '',
    });
    expect(s.field.pass).toBeGreaterThanOrEqual(600);
    expect(['0px', '0', 'none', '']).toContain(s.waverDrawn);
  });

  test('the transition is a plain navigation (no orb)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /the path here wasn’t exactly straight/i }).click();
    await expect(page).toHaveURL(/\/story$/);
    expect(await page.evaluate(() => document.documentElement.dataset.vt ?? null)).toBeNull();
    expect(await page.evaluate(() => document.querySelectorAll('[data-vt-orb]').length)).toBe(0);
  });
});

test.describe('focus and scroll after Portfolio ↔ Story navigation', () => {
  const focused = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement!;
      return { tag: el.tagName, id: el.id, text: el.textContent?.trim().slice(0, 40) ?? '' };
    });

  for (const reduced of [false, true]) {
    test(`focus lands on the Story h1, then back on the Story band link${reduced ? ' (reduced motion)' : ''}`, async ({ browser }) => {
      const context = await browser.newContext({ ...(reduced ? { reducedMotion: 'reduce' as const } : {}), viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      await page.goto('/');
      await page.getByRole('link', { name: /the path here wasn’t exactly straight/i }).click();
      await expect(page).toHaveURL(/\/story$/);
      await expect.poll(() => focused(page)).toMatchObject({ tag: 'H1', text: 'How I Got Here' });

      // Opened from the band: back at the position it was left at (no #story), focus on the band's link.
      await page.getByRole('link', { name: 'Back to the portfolio' }).first().click();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('[data-story-origin="band"]')).toBeFocused();
      await context.close();
    });
  }

  /**
   * scrollY once the page has stopped moving on its own (reveals, pin re-measures
   * and scroll anchoring can still shift it just after a jump): two equal reads
   * 250ms apart, which also outlasts the router's debounced save.
   */
  const settledScrollY = async (page: Page) => {
    let last = await page.evaluate(() => scrollY);
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(250);
      const y = await page.evaluate(() => scrollY);
      if (y === last) return y;
      last = y;
    }
    return last;
  };

  test('back and forward restore the scroll position and move focus', async ({ page }) => {
    await page.goto('/');
    await page.locator('#story').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, -120));
    // The band may still be revealing: wait until the page is still before reading it.
    await expect.poll(() => page.evaluate(() => document.getElementById('story')!.style.transform)).toBe('');
    const portfolioY = await settledScrollY(page);

    // Click without Playwright's actionability scrolling (under load it re-scrolls
    // the link into view with other alignments, which moves the page we just measured).
    await page.getByRole('link', { name: /the path here wasn’t exactly straight/i }).evaluate((a: HTMLElement) => a.click());
    await expect(page).toHaveURL(/\/story$/);
    await expect(page.locator('[data-story][data-motion]')).toBeAttached();
    await page.evaluate(() => document.getElementById('chapter-5')!.scrollIntoView());
    const storyY = await settledScrollY(page);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(portfolioY);
    // Focus returns to the link the Story was opened from (story-return.spec.ts covers the orb).
    await expect(page.locator('[data-story-origin="band"]')).toBeFocused();

    await page.goForward();
    await expect(page).toHaveURL(/\/story$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(storyY);
    await expect.poll(() => focused(page)).toMatchObject({ tag: 'H1' });
  });
});
