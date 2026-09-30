import { expect, test, type Page } from '@playwright/test';

/**
 * Motion layer: pinned project rail, reduced-motion fallbacks, hero parallax
 * safety. Tests set their own viewport sizes, so they run in one project only.
 */
// eslint-disable-next-line no-empty-pattern -- Playwright needs the fixtures object
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'viewport-driven; runs once');
});

const progress = (page: Page) => page.locator('[data-project-progress]');

/**
 * Page scrollY where the pinned slide starts (the section top, layout coordinates),
 * where it ends (+ --rail-slide), and where the stage releases (after the end hold).
 */
async function pinRange(page: Page) {
  return page.evaluate(() => {
    const s = document.getElementById('projects')!;
    const stage = s.querySelector<HTMLElement>('[data-rail-stage]')!;
    let top = 0;
    for (let el: HTMLElement | null = s; el; el = el.offsetParent as HTMLElement | null) top += el.offsetTop;
    const pinTop = parseFloat(getComputedStyle(stage).top);
    const slide = parseFloat(s.style.getPropertyValue('--rail-slide'));
    return { start: top, end: top + slide, release: top + s.offsetHeight - stage.offsetHeight - pinTop, pinTop };
  });
}

/** Right edge of the last card vs the right gutter, and the stage's top (viewport px). */
const railEnd = (page: Page) =>
  page.evaluate(() => {
    const rail = document.querySelector<HTMLElement>('[data-project-rail]')!;
    const stage = document.querySelector<HTMLElement>('[data-rail-stage]')!;
    return {
      gap: rail.lastElementChild!.getBoundingClientRect().right - (document.documentElement.clientWidth - parseFloat(getComputedStyle(rail).paddingRight)),
      stageTop: stage.getBoundingClientRect().top,
    };
  });

const overflowX = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** Wide enough (≥ 2117px) that the three design-width cards barely overflow: no slide. */
const FIT_WIDTH = 2200;

/** All three cards sit fully between the gutters, with no slide UI. */
async function expectFitted(page: Page, width: number) {
  await expect(page.locator('#projects')).toHaveAttribute('data-rail-mode', 'fit');
  const gutter = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')));
  const cards = await page
    .locator('[data-project-rail] > li > article')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
  expect(cards).toHaveLength(3);
  expect(cards[0].left).toBeGreaterThanOrEqual(gutter - 1);
  expect(cards[2].right).toBeLessThanOrEqual(width - gutter + 1);
  expect(cards[2].top).toBeLessThan(cards[0].bottom); // side by side
  // Hasoub leads and stays the widest (840 : 720 : 640).
  expect(cards[0].width / cards[1].width).toBeCloseTo(840 / 720, 1);
  expect(cards[1].width / cards[2].width).toBeCloseTo(720 / 640, 1);
  await expect(progress(page)).toBeHidden();
  expect(await overflowX(page)).toBeLessThanOrEqual(0);
}

test.describe('project rail', () => {
  test(`fits all three cards without pinning at ${FIT_WIDTH}px (travel too short to slide)`, async ({ page }) => {
    await page.setViewportSize({ width: FIT_WIDTH, height: 1000 });
    await page.goto('/');
    await expectFitted(page, FIT_WIDTH);
  });

  for (const [width, height] of [
    [1024, 800],
    [1100, 900],
    [1280, 800],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`pins, slides, updates the counter and never overflows at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page.locator('#projects')).toHaveAttribute('data-rail-mode', 'pin');
      const { start, end } = await pinRange(page);
      expect(end).toBeGreaterThan(start);

      await page.evaluate((y) => scrollTo(0, y), start);
      await expect(progress(page)).toHaveText('01 / 03');
      // Hasoub leads the rail and is the widest card.
      const widths = await page
        .locator('[data-project-rail] > li > article')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      expect(widths[0]).toBeGreaterThan(Math.max(widths[1], widths[2]));

      await page.evaluate((y) => scrollTo(0, y), start + (end - start) / 2);
      await expect(progress(page)).toHaveText('02 / 03');

      for (let i = 0; i <= 10; i++) {
        await page.evaluate((y) => scrollTo(0, y), start - 200 + ((end - start + 400) * i) / 10);
        await page.waitForTimeout(40);
        expect(await overflowX(page), `overflow at step ${i}`).toBeLessThanOrEqual(0);
      }

      await page.evaluate((y) => scrollTo(0, y), end);
      await expect(progress(page)).toHaveText('03 / 03');
      // The slide ends with the last card exactly on the right gutter, while still
      // pinned; it holds there until the stage releases.
      const { release, pinTop } = await pinRange(page);
      expect(release - end, 'end hold').toBeGreaterThanOrEqual(60);
      for (const y of [end, Math.floor(release) - 1]) {
        await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const { gap, stageTop } = await railEnd(page);
        expect(Math.abs(gap), `last card on the gutter at scrollY ${y}`).toBeLessThanOrEqual(1);
        expect(Math.abs(stageTop - pinTop), `still pinned at scrollY ${y}`).toBeLessThanOrEqual(1);
      }

      // Scrolling back up returns to card 1 (never trapped either way).
      await page.evaluate((y) => scrollTo(0, y), start - 300);
      await expect(progress(page)).toHaveText('01 / 03');
    });
  }

  test('keyboard focus on an off-screen card brings it into view', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.getByRole('link', { name: /View on GitHub.*Habit Tracker/ }).focus();
    await page.keyboard.press('Tab');
    const chess = page.getByRole('link', { name: /View on GitHub.*Multiplayer Chess/ });
    await expect(chess).toBeFocused();
    await expect(chess).toBeInViewport({ ratio: 1 });
    await expect(progress(page)).toHaveText('03 / 03');
  });

  test('the slide still ends on the gutter when fonts arrive late', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.route(/\.woff2$/, async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    const { end } = await pinRange(page);
    await page.evaluate((y) => scrollTo(0, y), end);
    await page.waitForTimeout(100);
    expect(Math.abs((await railEnd(page)).gap)).toBeLessThanOrEqual(1);
  });

  for (const width of [1024, 1440, FIT_WIDTH]) {
    test(`prerendered rail already matches the hydrated layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const cards = () =>
        page
          .locator('[data-project-rail] > li > article')
          .evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width)]; }));
      // Block the app bundle: the prerendered HTML as first painted (html.js set, no hydration).
      await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort());
      await page.goto('/');
      const before = await cards();
      await page.unroute(/\/assets\/index-.*\.js$/);
      await page.goto('/');
      await expect(page.locator('#projects')).toHaveAttribute('data-rail-mode', width >= 2117 ? 'fit' : 'pin');
      expect(await cards()).toEqual(before);
    });
  }

  for (const [width, height] of [
    [1024, 800],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`prerendered page already reserves the pinned height at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const geometry = () =>
        page.evaluate(() => {
          const s = document.getElementById('projects')!;
          const stage = s.querySelector<HTMLElement>('[data-rail-stage]')!;
          return {
            section: Math.round(s.offsetHeight),
            stageTop: Math.round(parseFloat(getComputedStyle(stage).top)),
            position: getComputedStyle(stage).position,
          };
        });
      await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort());
      await page.goto('/');
      const before = await geometry();
      await page.unroute(/\/assets\/index-.*\.js$/);
      await page.goto('/');
      await expect(page.locator('#projects')).toHaveAttribute('data-rail-mode', 'pin');
      const after = await geometry();
      expect(after.position).toBe('sticky');
      // The CSS estimate of the stage height (--rail-stage-h in global.css) is close
      // enough that nothing below the rail moves on hydration.
      expect(Math.abs(after.section - before.section), 'section height').toBeLessThanOrEqual(3);
      expect(Math.abs(after.stageTop - before.stageTop), 'stage top').toBeLessThanOrEqual(3);
      expect(before.position).toBe('sticky');
    });
  }

  test('prerendered pin estimate matches JS at the fit edge (stage + fitMargin vs the viewport)', async ({ page }) => {
    // Does the section reserve a pin (taller than its stage), and how tall is it?
    const geometry = () =>
      page.evaluate(() => {
        const s = document.getElementById('projects')!;
        const stage = s.querySelector<HTMLElement>('[data-rail-stage]')!;
        return { pinned: s.offsetHeight > stage.offsetHeight + 50, height: Math.round(s.offsetHeight) };
      });
    // Stage ≈ 688.6px at 1024 wide, 695.7px at 1440 (+ 24px fitMargin).
    for (const [width, vh, mode] of [
      [1024, 711, 'row'],
      [1024, 714, 'pin'],
      [1024, 768, 'pin'],
      [1440, 718, 'row'],
      [1440, 721, 'pin'],
    ] as const) {
      await page.setViewportSize({ width, height: vh });
      await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort());
      await page.goto('/');
      const before = await geometry();
      await page.unroute(/\/assets\/index-.*\.js$/);
      await page.goto('/');
      await expect(page.locator('#projects'), `${width}×${vh}`).toHaveAttribute('data-rail-mode', mode);
      const after = await geometry();
      expect(before.pinned, `${width}×${vh}`).toBe(mode === 'pin');
      expect(after.pinned, `${width}×${vh}`).toBe(mode === 'pin');
      // (Row mode adds its prev/next buttons after hydration, so only the pin height must match.)
      if (mode === 'pin') expect(Math.abs(after.height - before.height), `${width}×${vh}`).toBeLessThanOrEqual(3);
    }
  });

  for (const hash of ['#projects', '#contact']) {
    test(`deep link to ${hash} doesn't shift the layout`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.addInitScript(() => {
        (window as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[])
            if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(`/${hash}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(800);
      expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.05);
      await expect(page.locator(hash)).toBeInViewport();
    });
  }

  test('anchor jumps land on the rail start and past it', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('/');
    await expect(page.locator('#projects')).toHaveAttribute('data-rail-mode', 'pin');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Projects' }).click();
    await expect(progress(page)).toHaveText('01 / 03');
    await expect(page.getByRole('heading', { name: 'Featured projects' })).toBeInViewport();

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Contact' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /let’s talk/i })).toBeInViewport();
  });

  test('deep link to #contact resolves after the page renders', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#contact');
    await expect(page.getByRole('heading', { level: 2, name: /let’s talk/i })).toBeInViewport();
  });

  test('768px uses a snap row with prev/next controls', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('#projects')).toHaveAttribute('data-rail-mode', 'row');
    await page.locator('#projects').scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Previous project' })).toBeDisabled();
    const next = page.getByRole('button', { name: 'Next project' });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(progress(page)).toHaveText('02 / 03');
    await page.keyboard.press('Enter');
    await expect(progress(page)).toHaveText('03 / 03');
    // At the end it's aria-disabled, not `disabled`: keyboard focus stays on it.
    await expect(next).toBeDisabled();
    await expect(next).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(progress(page)).toHaveText('03 / 03');
    const [a, b, c] = await page
      .locator('[data-project-rail] > li > article')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('lg+ with a short travel uses the same fitted layout', async ({ page }) => {
    await page.setViewportSize({ width: FIT_WIDTH, height: 1000 });
    await page.goto('/');
    await expectFitted(page, FIT_WIDTH);
  });

  for (const width of [768, 1024, 1440]) {
    test(`project cards stack and nothing is hidden at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(page.locator('#projects')).toHaveAttribute('data-rail-mode', 'stack');
      const [a, b, c] = await page
        .locator('[data-project-rail] > li > article')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
      expect(b.top).toBeGreaterThanOrEqual(a.bottom);
      expect(c.top).toBeGreaterThanOrEqual(b.bottom);
      for (const card of [a, b, c]) expect(card.right).toBeLessThanOrEqual(width);
      if (width < 1024) expect([b.width, c.width]).toEqual([a.width, a.width]); // tablet: one shared card width
      else expect(a.width).toBeGreaterThan(b.width); // lg: Hasoub is the widest
      expect(await overflowX(page)).toBeLessThanOrEqual(0);

      const state = await page.evaluate(() => ({
        motion: document.documentElement.dataset.motion ?? null,
        cursor: document.querySelectorAll('.cursor-orb').length,
        hidden: [...document.querySelectorAll<HTMLElement>('main section, [data-sun-node]')].filter(
          (el) => getComputedStyle(el).opacity === '0',
        ).length,
      }));
      expect(state).toEqual({ motion: null, cursor: 0, hidden: 0 });
    });
  }

  test('the experience path shows fully lit', async ({ page }) => {
    await page.goto('/');
    await page.locator('#work').scrollIntoViewIfNeeded();
    const path = await page.evaluate(() => ({
      base: getComputedStyle(document.querySelector('[data-timeline-base]')!).opacity,
      lit: getComputedStyle(document.querySelector('[data-timeline-lit]')!).transform,
      closing: getComputedStyle(document.querySelector('#work > [data-horizon]')!).transform,
    }));
    expect(path).toEqual({ base: '1', lit: 'none', closing: 'none' });
  });

  test('the hero stays still', async ({ page }) => {
    await page.goto('/');
    // Hero: no parallax on any layer after scrolling.
    await page.evaluate(() => scrollTo(0, 400));
    await page.waitForTimeout(200);
    const hero = await page.evaluate(() => ({
      layers: [...new Set([...document.querySelectorAll<HTMLElement>('.hero [data-parallax]')].map((el) => getComputedStyle(el).transform))],
    }));
    expect(hero).toEqual({ layers: ['none'] });
  });
});

test('hero glow moves with the portrait, and the parallax reverses when scrolling back up', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  // One parallax layer: the portrait wrapper, holding both the glow and the photo.
  const layer = page.locator('.hero [data-parallax]');
  await expect(layer).toHaveCount(1);
  await expect(layer).toHaveAttribute('data-parallax', 'photo');
  await expect(layer.locator('[data-hero-glow]')).toHaveCount(1);
  await expect(layer.locator('[data-hero-photo]')).toHaveCount(1);
  const shift = () => layer.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(shift).toBe(0);
  await page.evaluate(() => scrollTo(0, 300));
  await expect.poll(shift).toBeGreaterThan(5);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(shift).toBe(0);
});

test('experience path lights chapter by chapter and drains on the way back up', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const state = () =>
    page.evaluate(() => {
      const clip = document.querySelector<HTMLElement>('[data-timeline-lit]')!;
      return {
        hidden: Math.abs(Math.round(new DOMMatrix(getComputedStyle(clip).transform).m42)),
        height: clip.offsetHeight,
        base: Number(getComputedStyle(document.querySelector('[data-timeline-base]')!).opacity),
        // The section's closing line: drawn (scaleX) only after the path is fully lit.
        closing: new DOMMatrix(getComputedStyle(document.querySelector('#work > [data-horizon]')!).transform).a,
      };
    });
  const workTop = await page.evaluate(() => document.getElementById('work')!.getBoundingClientRect().top + scrollY);
  // Before the first sun: the path rests dimmed, nothing lit.
  await page.evaluate((y) => scrollTo(0, y), workTop - 900);
  await expect.poll(async () => { const s = await state(); return s.hidden === s.height && s.base < 0.5 && s.closing === 0; }).toBe(true);
  // Mid-way: partly lit.
  await page.evaluate((y) => scrollTo(0, y), workTop + 200);
  await expect.poll(async () => { const s = await state(); return s.hidden > 0 && s.hidden < s.height && s.closing === 0; }).toBe(true);
  // Past the last sun: fully lit.
  await page.evaluate((y) => scrollTo(0, y), workTop + 2000);
  await expect.poll(async () => (await state()).hidden).toBe(0);
  await expect.poll(async () => (await state()).closing).toBe(1);
  // Back up: drained again, closing line undrawn.
  await page.evaluate((y) => scrollTo(0, y), workTop - 900);
  await expect.poll(async () => { const s = await state(); return s.hidden === s.height && s.closing === 0; }).toBe(true);
});

test('a pinned section waits for the line above it to scroll away, and draws its own line last', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  for (const id of ['skills']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('data-seq-mode', 'pin');
    const at = (f: number) =>
      page.evaluate(
        async ([id, f]) => {
          const sec = document.getElementById(id as string)!;
          const stage = sec.querySelector<HTMLElement>('[data-seq-stage]')!;
          const track = stage.parentElement!;
          const pinAt = track.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(stage).top);
          scrollTo(0, Math.round(pinAt + (f as number) * (track.offsetHeight - stage.offsetHeight)));
          await new Promise((r) => setTimeout(r, 150));
          const above = sec.previousElementSibling!.querySelectorAll<HTMLElement>('[data-horizon]');
          const prev = [...above].reverse().find((el) => el.getClientRects().length)!;
          const bar = document.querySelector('header[data-topbar]')!.getBoundingClientRect().bottom;
          const line = sec.querySelector<HTMLElement>('[data-seq-line]')!;
          return {
            prevGone: prev.getBoundingClientRect().bottom <= bar + 1,
            lineScale: new DOMMatrix(getComputedStyle(line).transform).a,
            boxesIn: [...sec.querySelectorAll<HTMLElement>('[data-seq-item]')]
              .filter((el) => el.getClientRects().length)
              .every((el) => getComputedStyle(el).opacity === '1'),
          };
        },
        [id, f] as const,
      );
    // Pin start: the previous section's line is already under the top bar.
    expect((await at(0)).prevGone, `${id}: previous line gone when the pin starts`).toBe(true);
    // Before the end: boxes still arriving, closing line not drawn.
    const early = await at(0.2);
    expect(early.lineScale).toBeLessThan(0.5);
    // Released: every box in, then the line fully drawn.
    const done = await at(1);
    expect(done).toMatchObject({ boxesIn: true, lineScale: 1 });
  }
});

test('jumping from the top via the nav shows the top bar backdrop at once (no line flashes under it)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const label of ['Work', 'Projects', 'Contact']) {
    await page.goto('/');
    // Record the backdrop's opacity right after the page has jumped.
    await page.evaluate(() => {
      const w = window as unknown as { firstJumpFrame?: string };
      // One frame after the jump is seen: the scroll driver has run by then; a fade would
      // still be near 0 (it takes 250ms).
      const tick = () => {
        if (scrollY > 8)
          requestAnimationFrame(() => {
            w.firstJumpFrame = getComputedStyle(document.querySelector('[data-topbar-backdrop]')!).opacity;
          });
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.locator('nav[aria-label="Primary"] a', { hasText: label }).click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { firstJumpFrame?: string }).firstJumpFrame))
      .toBe('1');
  }
});

/** Let the landing settle (smooth scroll, late layout) before measuring; reveals are scroll-scrubbed. */
const settled = (page: Page) => page.waitForTimeout(900);

test.describe('nav anchor jumps land sections fully in view (motion on)', () => {
  const headings = [
    ['Work', 'Experience'],
    ['Skills', 'Skills'],
    ['Projects', 'Featured projects'],
  ] as const;

  test('desktop nav at 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    for (const [link, heading] of headings) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: link }).click();
      await settled(page);
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeInViewport({ ratio: 1 });
    }
  });

  test('mobile menu at 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    for (const [link, heading] of headings) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.getByRole('button', { name: /open menu/i }).click();
      await page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: link }).click();
      await settled(page);
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeInViewport({ ratio: 1 });
    }
  });
});

/**
 * Skills rail (useRail + motion.skillsRail): wherever the five cards don't fit between the
 * gutters (md–1279), page scroll slides the rail while the stage is pinned, like Projects.
 */
test.describe('Skills rail', () => {
  /** Slide start (later of the section top and the pin start), slide end, release, sticky top. */
  const skillsPin = (page: Page) =>
    page.evaluate(() => {
      const s = document.getElementById('skills')!;
      const stage = s.querySelector<HTMLElement>('[data-seq-stage]')!;
      const track = s.querySelector<HTMLElement>('[data-seq-track]')!;
      const top = (el: HTMLElement) => {
        let y = 0;
        for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
        return y;
      };
      const pinTop = parseFloat(getComputedStyle(stage).top);
      const start = Math.max(top(s), top(track) - pinTop);
      const slide = parseFloat(s.style.getPropertyValue('--rail-slide'));
      return { start, end: start + slide, release: top(track) + track.offsetHeight - stage.offsetHeight - pinTop, pinTop };
    });
  /** Rail offset, last card vs the right gutter, stage top, and the page's horizontal overflow. */
  const skillsRail = (page: Page) =>
    page.evaluate(() => {
      const rail = document.querySelector<HTMLElement>('[data-skills-rail]')!;
      const stage = document.querySelector<HTMLElement>('#skills [data-seq-stage]')!;
      return {
        x: new DOMMatrix(getComputedStyle(rail).transform).e,
        gap: rail.lastElementChild!.getBoundingClientRect().right - (document.documentElement.clientWidth - parseFloat(getComputedStyle(rail).paddingRight)),
        stageTop: stage.getBoundingClientRect().top,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
  const at = async (page: Page, y: number) => {
    await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), Math.round(y));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    return skillsRail(page);
  };

  for (const [width, height] of [
    [768, 1024],
    [1024, 768],
    [1100, 900],
    [1279, 800],
  ] as const) {
    test(`pins and slides at ${width}×${height}, holds on the gutter, and reverses`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'pin');
      // The reveal sequence doesn't pin here (the rail does); the cards are in before the slide.
      await expect(page.locator('#skills')).toHaveAttribute('data-seq-mode', 'scrub');
      await page.evaluate(() => document.fonts.ready);
      const { start, end, release, pinTop } = await skillsPin(page);
      expect(end - start).toBeGreaterThan(100);
      expect(release - end, 'end hold').toBeGreaterThanOrEqual(60);
      // The pinned stage stays clear of the top bar.
      const bar = await page.locator('header[data-topbar]').evaluate((el) => el.getBoundingClientRect().bottom);
      expect(pinTop).toBeGreaterThanOrEqual(bar - 1);

      const ys = [start - 300, start, (start + end) / 2, end, Math.floor(release) - 1, release + 300];
      const down = [];
      for (const y of ys) down.push(await at(page, y));
      expect(down[1]!.x).toBe(0);
      const boxes = await page.locator('[data-skills-rail] > li').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
      expect(boxes.every((o) => o === '1'), 'cards in when the slide starts').toBe(true);
      expect(down[2]!.x).toBeLessThan(0);
      expect(down[2]!.x).toBeGreaterThan(down[4]!.x);
      // Slide done: the last card on the right gutter while still pinned, through the hold.
      for (const s of [down[3]!, down[4]!]) {
        expect(Math.abs(s.gap)).toBeLessThanOrEqual(1);
        expect(Math.abs(s.stageTop - pinTop)).toBeLessThanOrEqual(1);
      }
      expect(Math.abs(down[1]!.stageTop - pinTop)).toBeLessThanOrEqual(1);
      // Released: the stage scrolls away with the rail still at its end.
      expect(down[5]!.stageTop).toBeLessThan(pinTop - 100);
      expect(Math.abs(down[5]!.gap)).toBeLessThanOrEqual(1);
      for (const s of down) expect(s.overflow).toBeLessThanOrEqual(0);
      // Back up: the same positions give the same states (never trapped).
      for (let i = ys.length - 1; i >= 0; i--) {
        const s = await at(page, ys[i]!);
        expect(s.x, `x at step ${i} on the way back`).toBeCloseTo(down[i]!.x, 0);
      }
    });
  }

  for (const [width, height] of [
    [1280, 800],
    [1440, 900],
  ] as const) {
    test(`all five cards fit at ${width}px: no slide, the reveal sequence pins`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'fit');
      await expect(page.locator('#skills')).toHaveAttribute('data-seq-mode', 'pin');
      const gutter = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')));
      const cards = await page
        .locator('[data-skills-rail] > li')
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
      expect(cards).toHaveLength(5);
      expect(cards[0]!.left).toBeGreaterThanOrEqual(gutter - 1);
      expect(cards[4]!.right).toBeLessThanOrEqual(width - gutter + 1);
      expect(Math.abs(cards[4]!.top - cards[0]!.top)).toBeLessThan(1);
      expect(await page.locator('[data-skills-rail]').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    });
  }

  test('a short viewport that cannot pin gets a snap row with prev/next controls', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 480 });
    await page.goto('/');
    await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'row');
    const rail = page.locator('[data-skills-rail]');
    await expect(rail).toHaveAttribute('tabindex', '0');
    expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.locator('#skills [data-seq-spacer]').evaluate((el) => el.getBoundingClientRect().height)).toBe(0);

    // The row's scrollbar is hidden: pointer users page it with the buttons (as in Projects).
    const prev = page.getByRole('button', { name: 'Previous skill group' });
    const next = page.getByRole('button', { name: 'Next skill group' });
    await expect(prev).toHaveAttribute('aria-controls', 'skills-rail');
    await expect(next).toHaveAttribute('aria-controls', 'skills-rail');
    await expect(prev).toBeDisabled();
    const box = await next.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    const last = page.locator('[data-skills-card]').last();
    await expect(last).not.toBeInViewport({ ratio: 1 });
    for (let i = 0; i < 6 && (await next.getAttribute('aria-disabled')) !== 'true'; i++) {
      await next.click();
      await page.waitForTimeout(450); // smooth scroll + snap
    }
    await expect(next).toBeDisabled();
    await expect(prev).toBeEnabled();
    expect(await rail.evaluate((el) => el.scrollLeft >= el.scrollWidth - el.clientWidth - 2)).toBe(true);
    const r = await last.boundingBox();
    expect(r!.x + r!.width).toBeLessThanOrEqual(1024);
    await prev.click();
    await expect(next).toBeEnabled();
  });

  test('no prev/next controls where the rail pins (page scroll slides it)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'pin');
    await expect(page.locator('[data-skills-controls]')).toHaveCount(0);
  });

  for (const [width, height] of [
    [1024, 768],
    [768, 1024],
  ] as const) {
    test(`prerendered page already reserves the rail pin at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const geometry = () =>
        page.evaluate(() => {
          const s = document.getElementById('skills')!;
          const stage = s.querySelector<HTMLElement>('[data-seq-stage]')!;
          return {
            section: Math.round(s.offsetHeight),
            stageTop: Math.round(parseFloat(getComputedStyle(stage).top)),
            position: getComputedStyle(stage).position,
            below: Math.round(document.getElementById('projects')!.getBoundingClientRect().top + scrollY),
          };
        });
      await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort());
      await page.goto('/');
      const before = await geometry();
      await page.unroute(/\/assets\/index-.*\.js$/);
      await page.goto('/');
      await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'pin');
      const after = await geometry();
      expect(before.position).toBe('sticky');
      expect(after.position).toBe('sticky');
      expect(Math.abs(after.section - before.section), 'section height').toBeLessThanOrEqual(3);
      expect(Math.abs(after.stageTop - before.stageTop), 'stage top').toBeLessThanOrEqual(3);
      expect(Math.abs(after.below - before.below), 'Projects below it').toBeLessThanOrEqual(3);
    });
  }

  test('a nav jump to Skills lands on card 1 with the heading in view', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'pin');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Skills' }).click();
    await settled(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Skills' })).toBeInViewport({ ratio: 1 });
    expect((await skillsRail(page)).x).toBe(0);
    const boxes = await page.locator('[data-skills-rail] > li').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(boxes.every((o) => o === '1')).toBe(true);
  });

  test('reduced motion (md+): the cards wrap, all visible, nothing pins', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'stack');
    await expect(page.locator('#skills')).toHaveAttribute('data-seq-mode', 'static');
    const cards = await page
      .locator('[data-skills-rail] > li')
      .evaluateAll((els) => els.map((el) => ({ ...(el.getBoundingClientRect().toJSON() as DOMRect), o: getComputedStyle(el).opacity })));
    for (const c of cards) {
      expect(c.left).toBeGreaterThanOrEqual(0);
      expect(c.right).toBeLessThanOrEqual(1024);
      expect(c.o).toBe('1');
    }
    expect(await page.locator('#skills [data-seq-stage]').evaluate((el) => getComputedStyle(el).position)).toBe('static');
  });
});

test.describe('Skills reveal sequence', () => {
  /** Opacity of each visible box, and the stage's viewport top. */
  const seqState = (page: Page, id: string) =>
    page.evaluate((id) => {
      const s = document.getElementById(id)!;
      return {
        mode: s.dataset.seqMode,
        stageTop: Math.round(s.querySelector('[data-seq-stage]')!.getBoundingClientRect().top),
        boxes: [...s.querySelectorAll<HTMLElement>('[data-seq-item]')]
          .filter((el) => el.getClientRects().length)
          .map((el) => Number(getComputedStyle(el).opacity)),
      };
    }, id);
  /** scrollY where the stage pins (track top − sticky top). */
  const pinAt = (page: Page, id: string) =>
    page.evaluate((id) => {
      const s = document.getElementById(id)!;
      const track = s.querySelector<HTMLElement>('[data-seq-track]')!;
      let y = 0;
      for (let el: HTMLElement | null = track; el; el = el.offsetParent as HTMLElement | null) y += el.offsetTop;
      return y - parseFloat(getComputedStyle(s.querySelector('[data-seq-stage]')!).top);
    }, id);
  const scrollToY = async (page: Page, y: number) => {
    await page.evaluate((top) => scrollTo(0, top), y);
    await page.waitForTimeout(80);
  };

  for (const id of ['skills']) {
    test(`${id}: pins at 1440, boxes enter in order, and reverse on the way back`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/');
      await expect(page.locator(`#${id}`)).toHaveAttribute('data-seq-mode', 'pin');
      await page.evaluate(() => document.fonts.ready);
      const pin = await pinAt(page, id);
      const n = (await seqState(page, id)).boxes.length;
      // Before the lead-in (motion.sequence.leadIn × vh = 450px here): nothing in yet.
      const ys = [pin - 520, pin, pin + (n * 130) / 3, pin + (n * 130 * 2) / 3, pin + n * 130 + 40];
      const down = [];
      for (const y of ys) {
        await scrollToY(page, y);
        down.push(await seqState(page, id));
      }
      expect(down[0]!.boxes.every((o) => o === 0)).toBe(true);
      expect(down.at(-1)!.boxes.every((o) => o === 1)).toBe(true);
      // Pinned throughout: the stage doesn't move.
      const tops = down.slice(1).map((s) => s.stageTop);
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
      // Mid-sequence: earlier boxes are further along, and some are still hidden.
      for (const s of down.slice(2, 4)) {
        for (let i = 1; i < s.boxes.length; i++) expect(s.boxes[i - 1]!).toBeGreaterThanOrEqual(s.boxes[i]!);
        expect(s.boxes.some((o) => o < 1)).toBe(true);
      }
      // The top bar never covers the pinned stage.
      const bar = await page.locator('header').first().evaluate((el) => el.getBoundingClientRect().bottom);
      expect(tops[0]!).toBeGreaterThanOrEqual(bar - 1);
      // Back up: the same positions give the same states.
      for (let i = ys.length - 1; i >= 0; i--) {
        await scrollToY(page, ys[i]!);
        expect((await seqState(page, id)).boxes).toEqual(down[i]!.boxes);
      }
    });
  }

  test('390: no pin — a swipe row whose cards scrub in left to right, reversibly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'swipe');
    await expect(page.locator('#skills')).toHaveAttribute('data-seq-mode', 'scrub');
    expect(await page.locator('#skills [data-seq-spacer]').evaluate((el) => el.getBoundingClientRect().height)).toBe(0);
    // One snap row: the first card on the gutter, the next one peeking in.
    const row = await page.locator('[data-skills-rail]').evaluate((rail) => {
      const [a, b] = [...rail.children].map((li) => li.getBoundingClientRect());
      return { scrolls: rail.scrollWidth > rail.clientWidth, aLeft: a!.left, peek: innerWidth - b!.left, sameRow: Math.abs(a!.top - b!.top) < 1 };
    });
    expect(row).toMatchObject({ scrolls: true, aLeft: 16, sameRow: true });
    expect(row.peek).toBeGreaterThanOrEqual(16);
    expect(row.peek).toBeLessThanOrEqual(24);
    // Mid-entry: the row's first card is in, later ones still arriving (left to right).
    const rowTop = await page
      .locator('[data-skills-rail] > li')
      .first()
      .evaluate((el) => { let y = 0; for (let n: HTMLElement | null = el as HTMLElement; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop; return y; });
    const midY = Math.round(rowTop - 0.72 * 844 + 20);
    await scrollToY(page, midY);
    const mid = (await seqState(page, 'skills')).boxes;
    expect(mid).toHaveLength(5);
    expect(mid[0]).toBe(1);
    expect(mid.at(-1)!).toBeLessThan(1);
    for (let i = 1; i < mid.length; i++) expect(mid[i - 1]!).toBeGreaterThanOrEqual(mid[i]!);
    await scrollToY(page, midY + 3000);
    expect((await seqState(page, 'skills')).boxes.every((o) => o === 1)).toBe(true);
    // Back up: the same position gives the same state.
    await scrollToY(page, midY);
    expect((await seqState(page, 'skills')).boxes).toEqual(mid);
    // Swiping to the end puts the last card on the right gutter; nothing overflows the page.
    await scrollToY(page, midY + 600);
    const end = await page.locator('[data-skills-rail]').evaluate((rail) => {
      rail.scrollTo({ left: rail.scrollWidth, behavior: 'instant' });
      return Math.round(rail.lastElementChild!.getBoundingClientRect().right);
    });
    expect(end).toBe(390 - 16);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });

  test('prerendered page already reserves the pins at 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const heights = () =>
      page.evaluate(() => ['skills'].map((id) => Math.round(document.getElementById(id)!.offsetHeight)));
    await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort());
    await page.goto('/');
    const before = await heights();
    await page.unroute(/\/assets\/index-.*\.js$/);
    await page.goto('/');
    await expect(page.locator('#skills')).toHaveAttribute('data-seq-mode', 'pin');
    const after = await heights();
    for (let i = 0; i < before.length; i++) expect(Math.abs(after[i]! - before[i]!)).toBeLessThanOrEqual(3);
  });

  test('a nav jump to Skills lands on the finished, pinned state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Skills' }).click();
    await page.waitForTimeout(600);
    const s = await seqState(page, 'skills');
    expect(s.boxes.every((o) => o === 1)).toBe(true);
    await expect(page.getByRole('heading', { level: 2, name: 'Skills' })).toBeInViewport({ ratio: 1 });
    // Still pinned: scrolling a little further doesn't move the stage.
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(200);
    expect(Math.abs((await seqState(page, 'skills')).stageTop - s.stageTop)).toBeLessThanOrEqual(1);
  });

  test('prerendered pin estimate matches JS in the narrow bands', async ({ page }) => {
    const spacers = () =>
      page.evaluate(() => ['skills'].map((id) => document.querySelector(`#${id} [data-seq-spacer]`)!.getBoundingClientRect().height > 0));
    // Both pins: the Skills rail (md–1279) and the reveal sequence (≥ 1280), each side of its fit edge.
    for (const [width, height] of [
      [1000, 780], [1200, 680], [1440, 600], [1100, 560], [820, 760], [1440, 440],
      [768, 1024], [1279, 800], [1280, 800], [1024, 586], [1024, 584], [1440, 586], [1440, 584],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort());
      await page.goto('/');
      const before = await spacers();
      await page.unroute(/\/assets\/index-.*\.js$/);
      await page.goto('/');
      await page.waitForFunction(() => document.getElementById('skills')!.dataset.seqMode !== 'auto');
      expect(await spacers(), `${width}×${height}`).toEqual(before);
    }
  });

  test('scrub mode: boxes on screen on load, or after an anchor jump, are fully in', async ({ page }) => {
    // Too short to pin Skills (stage + top bar + fit margin > 480).
    await page.setViewportSize({ width: 1024, height: 480 });
    await page.goto('/#skills');
    await expect(page.locator('#skills')).toHaveAttribute('data-seq-mode', 'scrub');
    await page.waitForTimeout(150);
    const onScreen = () =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('#skills [data-seq-item]')]
          .filter((el) => el.getClientRects().length && el.getBoundingClientRect().top < innerHeight)
          .map((el) => Number(getComputedStyle(el).opacity)),
      );
    const landed = await onScreen();
    expect(landed.length).toBeGreaterThan(1);
    expect(landed.every((o) => o === 1)).toBe(true);
    // Scrolling back up still reverses the lower boxes.
    await page.evaluate(() => scrollBy(0, -500));
    await page.waitForTimeout(80);
    expect((await seqState(page, 'skills')).boxes.some((o) => o < 1)).toBe(true);
  });

  test('reduced motion: no pin and every box visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    for (const id of ['skills']) {
      await expect(page.locator(`#${id}`)).toHaveAttribute('data-seq-mode', 'static');
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      const s = await seqState(page, id);
      expect(s.boxes.every((o) => o === 1)).toBe(true);
      expect(await page.locator(`#${id} [data-seq-stage]`).evaluate((el) => getComputedStyle(el).position)).toBe('static');
    }
  });
});

test('Experience title and sun nodes reveal, and reverse when scrolling back up', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  // Experience reveals its title + company pill itself ([data-exp-head]), not as one section.
  const read = () =>
    page.evaluate(() => {
      const head = document.querySelector<HTMLElement>('#work [data-exp-head]')!;
      const node = document.querySelector<HTMLElement>('[data-sun-node]')!;
      return { section: Number(getComputedStyle(head).opacity), node: Number(getComputedStyle(node).opacity) };
    });
  const top = await page.locator('#work').evaluate((el) => {
    let y = 0;
    for (let n: HTMLElement | null = el as HTMLElement; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
    return y;
  });
  await page.evaluate((y) => scrollTo(0, y - 1200), top);
  await page.waitForTimeout(100);
  expect(await read()).toEqual({ section: 0, node: 0 });
  await page.evaluate((y) => scrollTo(0, y), top);
  await page.waitForTimeout(100);
  expect(await read()).toEqual({ section: 1, node: 1 });
  await page.evaluate((y) => scrollTo(0, y - 1200), top);
  await page.waitForTimeout(100);
  expect(await read()).toEqual({ section: 0, node: 0 });
});
