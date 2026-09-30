import { expect, test, type Locator, type Page } from '@playwright/test';

const overflowX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/**
 * Wait until the Story is hydrated (its motion layer marks `[data-story][data-motion]`
 * from an effect). The panel / chapter-index buttons are prerendered, so they're visible
 * and focusable before React attaches their handlers; under parallel load a click or
 * Enter could land in that gap and be dropped (the page's JS hadn't run yet).
 */
const hydrated = (page: Page) => expect(page.locator('[data-story][data-motion]')).toBeAttached();

/** Wait for the journal page's entry animation (rise + fade) to finish before measuring it. */
const settled = (dialog: Locator) =>
  dialog.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));

test('/story renders all 19 chapters in order with one h1', async ({ page }) => {
  await page.goto('/story');
  await expect(page).toHaveTitle('How I Got Here · Karawan');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(['How I Got Here']);
  const ids = await page.locator('[data-scene]').evaluateAll((els) => els.map((el) => el.id));
  expect(ids).toEqual(Array.from({ length: 19 }, (_, i) => `chapter-${i}`));
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(18);
});

test('deep links to a chapter land on it', async ({ page }) => {
  await page.goto('/story#chapter-12');
  await expect(page.getByRole('heading', { level: 2, name: '600+ Failures' })).toBeInViewport();
  await expect(page.locator('[data-chapter-indicator]')).toContainText('600+ Failures');
});

test('story panel opens as a dialog, closes with Esc and returns focus', async ({ page }) => {
  await page.goto('/story#chapter-10');
  await hydrated(page);
  const trigger = page.locator('#chapter-10').getByRole('button', { name: /explore the story/i });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Six Days' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await dialog.getByRole('tab', { name: /dive into the engineering/i }).click();
  await expect(dialog.getByRole('heading', { name: 'The System' })).toBeVisible();
  await expect(dialog.getByRole('link', { name: /Habit Tracker API on GitHub/ })).toHaveAttribute(
    'href',
    'https://github.com/karawanshy/habit-tracker-api',
  );

  // Panel geometry: bottom sheet on phones, a centred journal card on desktop.
  await settled(dialog);
  const box = (await dialog.boundingBox())!;
  const vp = page.viewportSize()!;
  if (vp.width < 1024) {
    expect(Math.round(box.y + box.height)).toBe(vp.height);
    expect(box.width).toBe(vp.width);
  } else {
    expect(Math.round(box.x + box.width / 2)).toBe(vp.width / 2);
    expect(Math.round(box.y + box.height / 2)).toBe(vp.height / 2);
    expect(box.width).toBe(640);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('journal page: centred card at 1440×720, bottom sheet at 390×844', async ({ page }, info) => {
  const desktop = info.project.name.startsWith('desktop');
  await page.setViewportSize(desktop ? { width: 1440, height: 720 } : { width: 390, height: 844 });
  await page.goto('/story#chapter-5');
  await hydrated(page);
  await page.locator('#chapter-5').getByRole('button', { name: /explore the story/i }).click();
  const dialog = page.getByRole('dialog', { name: 'I Didn’t Just Like It' });
  await expect(dialog).toBeVisible();
  await settled(dialog);
  const box = (await dialog.boundingBox())!;
  if (desktop) {
    expect(box.width).toBe(640);
    expect(Math.round(box.height)).toBe(652);
    expect(Math.round(box.x)).toBe((1440 - 640) / 2);
    expect(Math.round(box.y)).toBe(Math.round((720 - 652) / 2));
  } else {
    expect(box.width).toBe(390);
    expect(Math.round(box.y + box.height)).toBe(844);
    expect(box.height).toBeLessThanOrEqual(844 * 0.88 + 1);
  }
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
  // The closing line repeats the scene quote: set like it, line by line, with no box.
  const quote = dialog.locator('[data-journal-quote]');
  await expect(quote.locator('span')).toHaveText(['I didn’t just like Computer Science.', 'I loved it.']);
  expect(await quote.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  // Footer arrows are real ≥ 44px targets.
  for (const name of [/previous chapter/i, /next chapter/i]) {
    const b = (await dialog.getByRole('button', { name }).boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThanOrEqual(44);
  }
  // The body scrolls inside the card, not the page.
  const body = dialog.locator('[data-panel-scroll]');
  expect(await body.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
});

test('journal page: prev / next switch the chapter and move the page behind to it', async ({ page }) => {
  await page.goto('/story#chapter-5');
  await hydrated(page);
  const trigger = page.locator('#chapter-5').getByRole('button', { name: /explore the story/i });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName('I Didn’t Just Like It');
  const body = dialog.locator('[data-panel-scroll]');
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));

  const next = dialog.getByRole('button', { name: 'Ch 06, Next chapter: Start Before You’re Ready', exact: true });
  await expect(next).toHaveAccessibleName('Ch 06, Next chapter: Start Before You’re Ready');
  await expect(next.locator('[aria-hidden="true"]')).toHaveText('Ch 06→');
  await next.click();
  await expect(dialog).toHaveAccessibleName('Start Before You’re Ready');
  await expect(dialog.getByText('Chapter 06')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /next chapter/i })).toBeFocused();
  expect(await body.evaluate((el) => el.scrollTop)).toBe(0);
  // The page behind shows ch 6 finished (its quote landed) with nothing of ch 7 in the frame yet.
  const behind = await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 800));
    const lines = [...document.querySelectorAll('#chapter-6 [data-quote-line]')].map((el) => +getComputedStyle(el).opacity);
    return { lines, next: document.getElementById('chapter-7')!.getBoundingClientRect().top, vh: innerHeight };
  });
  for (const o of behind.lines) expect(o).toBeGreaterThan(0.98);
  expect(behind.next).toBeGreaterThanOrEqual(behind.vh);

  await dialog.getByRole('button', { name: 'Ch 05, Previous chapter: I Didn’t Just Like It', exact: true }).click();
  await dialog.getByRole('button', { name: 'Ch 04, Previous chapter: Maybe This Wasn’t for Me', exact: true }).click();
  await expect(dialog).toHaveAccessibleName('Maybe This Wasn’t for Me');

  // Closing lands on the chapter now shown; focus returns to the original opener without a jump.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('#chapter-4').getByRole('heading', { level: 2 })).toBeInViewport();
});

test('journal page: every Tab stop on ch 18 shows a visible focus ring inside the card', async ({ page }) => {
  await page.goto('/story#chapter-18');
  await hydrated(page);
  await page.locator('#chapter-18').getByRole('button', { name: /explore the story/i }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await settled(dialog);
  const card = (await dialog.boundingBox())!;
  const seen: string[] = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const off = parseFloat(cs.outlineOffset) || 0;
      const w = parseFloat(cs.outlineWidth) || 0;
      const out = Math.max(0, off + w); // how far the ring reaches outside the box
      return {
        key: el.getAttribute('aria-label') ?? el.getAttribute('role') ?? el.textContent!.trim().slice(0, 24),
        style: cs.outlineStyle,
        width: w,
        ring: { x: r.x - out, y: r.y - out, right: r.right + out, bottom: r.bottom + out },
      };
    });
    if (seen.includes(info.key)) break; // wrapped around
    seen.push(info.key);
    expect(info.style, info.key).not.toBe('none');
    expect(info.width, info.key).toBeGreaterThan(0);
    expect(info.ring.x, info.key).toBeGreaterThanOrEqual(card.x);
    expect(info.ring.y, info.key).toBeGreaterThanOrEqual(card.y);
    expect(info.ring.right, info.key).toBeLessThanOrEqual(card.x + card.width + 0.5);
    expect(info.ring.bottom, info.key).toBeLessThanOrEqual(card.y + card.height + 0.5);
  }
  // close, the scroll region and the previous arrow (ch 18 is the last chapter).
  expect(seen.length).toBeGreaterThanOrEqual(3);
});

test('chapter index jumps to a chapter', async ({ page }) => {
  await page.goto('/story');
  await hydrated(page);
  await page.locator('[data-chapter-indicator]').click();
  const index = page.getByRole('dialog', { name: 'Chapters' });
  await expect(index).toBeVisible();
  await index.getByRole('link', { name: 'The Detour' }).click();
  await expect(index).toBeHidden();
  await expect(page).toHaveURL(/\/story#chapter-14$/);
  await expect(page.getByRole('heading', { level: 2, name: 'The Detour' })).toBeInViewport();
  await expect(page.locator('#chapter-14')).toBeFocused();
});

test('"← Portfolio" returns to the Story band on the portfolio', async ({ page }) => {
  await page.goto('/story#chapter-5');
  await page.getByRole('link', { name: 'Back to the portfolio' }).first().click();
  await expect(page).toHaveURL(/\/#story$/);
  await expect(page.getByRole('heading', { level: 2, name: 'The path here wasn’t exactly straight.' })).toBeInViewport();
});

test('the portfolio never loads the Story chunk', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(scripts.some((u) => /StoryPage/.test(u))).toBe(false);
});

test('/story has no horizontal scroll from 320 to 1920', async ({ page }) => {
  await page.goto('/story');
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const y of [0, 0.5, 1]) {
      await page.evaluate((f) => scrollTo(0, f * document.documentElement.scrollHeight), y);
      expect(await overflowX(page), `overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

/** Every chapter with lane art on desktop: the slice (3, 5, 12) and the chapter illustrations (ch 18's boat is on the stage). */
const LANE_ART = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((n) => `chapter-${n}`);

test('scene art never covers the chapter text on desktop', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'desktop composition');
  for (const [width, height] of [
    [1024, 768],
    [1280, 800],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/story');
    // Measure with the real fonts (fallback metrics wrap lines differently).
    await page.evaluate(() => document.fonts.ready);
    for (const id of LANE_ART) {
      const hits = await page.evaluate((sceneId) => {
        const scene = document.getElementById(sceneId)!;
        const art = scene.querySelector('[data-scene-visual]')!.getBoundingClientRect();
        return [...scene.querySelectorAll<HTMLElement>('h2, [data-line], [data-scene-part="quote"]')]
          .filter((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return [...range.getClientRects()].some(
              (t) => t.right > art.left && t.left < art.right && t.bottom > art.top && t.top < art.bottom,
            );
          })
          .map((el) => el.textContent);
      }, id);
      expect(hits, `${id} at ${width}px`).toEqual([]);
    }
  }
});

/**
 * The sun rises and sinks through the story: at every pinned chapter's start and end (where the
 * sun holds its previous and its own state while the scene is stuck on screen), the visible
 * part of the disc never sits on the chapter's art, heading or lines.
 */
test('the sun never collides with scene art or text, at every height it reaches', async ({ page }) => {
  test.setTimeout(180_000);
  const sizes = page.viewportSize()!.width >= 1024 ? [[1440, 900], [1280, 800], [1024, 768]] : [[390, 844], [768, 1024]];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto('/story');
    await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    for (const id of [...LANE_ART, 'chapter-18']) {
      for (const phase of [0, 1]) {
        const hit = await page.evaluate(
          async ([sceneId, phase]) => {
            const s = document.getElementById(sceneId as string)!;
            const pin = s.querySelector<HTMLElement>('[data-scene-pin]')!;
            if (pin.style.position !== 'sticky') return 0;
            // Kept its heading in the frame at the cost of sitting over the sun's path (a tall phone core).
            if (s.dataset.pinFit === 'over-sun') return 0;
            const cs = getComputedStyle(s);
            const pad = parseFloat(cs.paddingTop);
            const start = s.getBoundingClientRect().top + scrollY + pad - parseFloat(pin.style.top);
            const len = s.offsetHeight - pin.offsetHeight - pad - parseFloat(cs.paddingBottom);
            scrollTo(0, phase ? start + len - 1 : start + 1);
            // Let the smoothed sun settle on this position (a glide from the last one is transient).
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            for (let i = 0; i < 200 && document.querySelector('[data-story][data-settling-stage]'); i++) await new Promise((r) => setTimeout(r, 20));
            const d = document.querySelector('[data-story-sun-full]')!.getBoundingClientRect();
            const clip = document.querySelector('[data-story-sun-clip]')!.getBoundingClientRect();
            const sun = { left: d.left, right: d.right, top: Math.max(d.top, clip.top), bottom: Math.min(d.bottom, clip.bottom) };
            const area = (r: DOMRect) =>
              Math.max(0, Math.min(r.right, sun.right) - Math.max(r.left, sun.left)) * Math.max(0, Math.min(r.bottom, sun.bottom) - Math.max(r.top, sun.top));
            const art = [...s.querySelectorAll('[data-scene-visual]')].find((e) => e.getClientRects().length);
            let total = art ? area(art.getBoundingClientRect()) : 0;
            // Text by its ink, where it shows (the quote lines land late in ch 3).
            for (const el of s.querySelectorAll('h2, [data-line], [data-quote-line]')) {
              if (Number(getComputedStyle(el).opacity) < 0.05) continue;
              const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
              for (let t = walk.nextNode(); t; t = walk.nextNode()) {
                const range = document.createRange();
                range.selectNodeContents(t);
                for (const r of range.getClientRects()) total += area(r);
              }
            }
            return Math.round(total);
          },
          [id, phase] as const,
        );
        expect(hit, `${id} ${phase ? 'end' : 'start'} at ${width}×${height}`).toBe(0);
      }
    }
  }
});

/**
 * Edge viewports: every pin keeps its heading in the frame (below the fixed header) with a
 * sensible art scale — on screens at least 700px tall. Shorter ones (320×568, landscape
 * phones) can't hold a heading, lines and art under the 104px header: there some chapters
 * pin the art alone (heading above the frame) and anchors land just before, heading in view.
 */
test('pins on edge viewports: heading in view while pinned, sensible scales, and anchors work', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'viewport sizes are set by the test');
  test.setTimeout(360_000);
  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [768, 1024],
    [390, 844],
    [360, 740],
    [320, 568],
    [568, 320],
    [844, 390],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/story');
    await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const pins = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-scene]')]
        .filter((s) => s.querySelector<HTMLElement>('[data-scene-pin]')!.style.position === 'sticky')
        .map((s) => {
          const v = [...s.querySelectorAll<HTMLElement>('[data-scene-visual]')].find((e) => e.getClientRects().length);
          const m = /scale\(([\d.]+)\)/.exec(v?.style.transform ?? '');
          return { id: s.id, fit: s.dataset.pinFit!, scale: m ? Number(m[1]) : 1 };
        }),
    );
    expect(pins, `${width}×${height}`).toHaveLength(18);
    const landscape = height < 480;
    for (const p of pins) {
      // ch 18 holds its heading, lines AND the ending links: under ~800px tall the links win.
      if (height >= 700 && !(p.id === 'chapter-18' && height < 800)) expect(p.fit, `${p.id} at ${width}×${height}`).not.toBe('art-only');
      // Landscape phones may go to the last-resort scale (0.3) to keep the controls reachable.
      // ch 18 keeps its words at any cost (motion.story.pin.keepHeading); it has no scene art.
      if (p.id !== 'chapter-18') expect(p.scale, `${p.id} at ${width}×${height}`).toBeGreaterThanOrEqual(landscape ? 0.3 - 1e-4 : 0.36 - 1e-4);
      else expect(p.fit, `${p.id} at ${width}×${height}`).not.toBe('art-only');
    }
    // Controls reachable while pinned: above the progress rail at the release (ch 18's ending: its own test).
    for (const p of pins.filter((q) => q.id !== 'chapter-18')) {
      const low = await page.evaluate(async (id) => {
        const s = document.getElementById(id)!;
        const pin = s.querySelector<HTMLElement>('[data-scene-pin]')!;
        const cs = getComputedStyle(s);
        const pad = parseFloat(cs.paddingTop);
        const start = s.getBoundingClientRect().top + scrollY + pad - parseFloat(pin.style.top);
        scrollTo(0, start + s.offsetHeight - pin.offsetHeight - pad - parseFloat(cs.paddingBottom) - 2);
        await new Promise((r) => setTimeout(r, 700)); // entry reveals and smoothing settle
        const pills = [...s.querySelectorAll('[data-scene-part="controls"] a, [data-scene-part="controls"] button, [data-story-ending] a')]
          .filter((b) => b.getClientRects().length)
          .map((b) => b.getBoundingClientRect().bottom);
        return { bottom: Math.max(0, ...pills), rail: document.querySelector('[data-story-progress]')!.getBoundingClientRect().top + 30 };
      }, p.id);
      expect(low.bottom, `${p.id} controls at ${width}×${height}`).toBeLessThanOrEqual(low.rail);
    }
    // Headings in the frame while pinned (checked at each pin's start).
    for (const p of pins.filter((q) => q.fit !== 'art-only')) {
      const top = await page.evaluate(async (id) => {
        const s = document.getElementById(id)!;
        const pin = s.querySelector<HTMLElement>('[data-scene-pin]')!;
        const cs = getComputedStyle(s);
        scrollTo(0, s.getBoundingClientRect().top + scrollY + parseFloat(cs.paddingTop) - parseFloat(pin.style.top) + 1);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const h = s.querySelector('h2')!.getBoundingClientRect();
        return { top: h.top, bottom: h.bottom, header: document.querySelector('[data-story] header')!.getBoundingClientRect().bottom };
      }, p.id);
      expect(top.top, `${p.id} heading at ${width}×${height}`).toBeGreaterThanOrEqual(top.header - 40);
      expect(top.bottom, `${p.id} heading at ${width}×${height}`).toBeLessThanOrEqual(height);
    }
    // Deep links land with the heading in view (landscape: the heading may be partly under the header).
    for (const id of ['chapter-6', 'chapter-12', 'chapter-17']) {
      await page.goto(`/story#${id}`);
      await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
      await page.waitForTimeout(200);
      await expect(page.locator(`#${id} h2`), `${id} at ${width}×${height}`).toBeInViewport({ ratio: landscape ? 0.5 : 1 });
    }
  }
});

/**
 * The closing frame: ch 18's heading ("To Be Continued"), its lines and the ending links share the
 * frame while it is pinned, and the page ends there (the last reachable scroll shows them all).
 * Where the words and links are taller than the frame (320×568, landscape phones — a layout
 * limit), the heading and lines show during the pin and the links are on screen at the very end.
 */
test('ch 18: heading, lines and ending links in the frame during the pin and at the end of the page', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, 'viewport sizes are set by the test');
  test.setTimeout(240_000);
  for (const [width, height, fits] of [
    [1440, 900, true],
    [1024, 768, true],
    [768, 1024, true],
    [390, 844, true],
    [360, 740, true],
    [320, 568, false],
    [844, 390, false],
    [667, 375, false],
    [568, 320, false],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/story');
    await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const at = (where: 'pin' | 'end') =>
      page.evaluate(async (w) => {
        const s = document.getElementById('chapter-18')!;
        const pin = s.querySelector<HTMLElement>('[data-scene-pin]')!;
        if (w === 'pin') {
          const cs = getComputedStyle(s);
          const pad = parseFloat(cs.paddingTop);
          const start = s.getBoundingClientRect().top + scrollY + pad - parseFloat(pin.style.top);
          scrollTo(0, start + (s.offsetHeight - pin.offsetHeight - pad - parseFloat(cs.paddingBottom)) * 0.9);
        } else scrollTo(0, 1e7);
        await new Promise((r) => setTimeout(r, 700));
        const box = (sel: string) => {
          const rs = [...s.querySelectorAll(sel)].filter((e) => e.getClientRects().length).map((e) => e.getBoundingClientRect());
          return { top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)) };
        };
        return {
          fit: s.dataset.pinFit,
          sticky: pin.style.position,
          heading: box('h2'),
          lines: box('[data-line]'),
          links: box('[data-story-ending] a'),
          header: document.querySelector('[data-story] header')!.getBoundingClientRect().bottom,
          rail: document.querySelector('[data-story-progress]')!.getBoundingClientRect().top + 30,
        };
      }, where);
    const label = `${width}×${height}`;
    const pinned = await at('pin');
    expect(pinned.fit, label).not.toBe('art-only');
    // During the pin: the closing line and its words, clear of the header.
    expect(pinned.heading.top, label).toBeGreaterThanOrEqual(pinned.header - 48);
    expect(pinned.lines.bottom, label).toBeLessThanOrEqual(pinned.rail);
    const end = await at('end');
    // The last reachable frame: every ending link on screen, above the rail.
    expect(end.links.bottom, label).toBeLessThanOrEqual(end.rail);
    if (fits) {
      expect(pinned.links.bottom, label).toBeLessThanOrEqual(pinned.rail);
      expect(end.heading.top, label).toBeGreaterThanOrEqual(end.header - 48);
    }
  }
});

test.describe('a reload starts over at the top', () => {
  test('/story: a reload lands on the prologue, the chapter hash dropped', async ({ page }) => {
    await page.goto('/story#chapter-7');
    await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
    await page.reload();
    await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
    await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
    expect(await page.evaluate(() => ({ y: scrollY, hash: location.hash }))).toEqual({ y: 0, hash: '' });
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  });

  test('/story: a reload after scrolling (no hash) is back at the top too', async ({ page }) => {
    await page.goto('/story');
    await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
    await page.evaluate(() => scrollTo(0, 5000));
    await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
    await page.reload();
    await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
    await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('/: a reload is back at the top of the portfolio, the hash dropped', async ({ page }) => {
    await page.goto('/#contact');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
    await page.reload();
    await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
    expect(await page.evaluate(() => ({ y: scrollY, hash: location.hash }))).toEqual({ y: 0, hash: '' });
  });
});
