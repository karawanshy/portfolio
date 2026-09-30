import { expect, test, type Page } from '@playwright/test';

/**
 * Story → Portfolio return (router/transition.ts): the Portfolio comes back at the exact
 * scroll position it was left at, and the closing orb contracts onto the link the Story was
 * opened from — the top bar's "Story" pill or the Story band — for both the
 * Story's "← Portfolio" link and browser Back. Opened directly: the old landing on #story.
 */

type Origin = 'topbar' | 'band';

/** scrollY once the page has stopped moving on its own (reveals, pins, the router's debounced save). */
async function settledScrollY(page: Page) {
  let last = await page.evaluate(() => scrollY);
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const y = await page.evaluate(() => scrollY);
    if (y === last) return y;
    last = y;
  }
  return last;
}

/**
 * Record every orb the transitions lay down (`[data-vt-orb="story-orb"]`: the old page's
 * start circle, or the new page's end circle) with `html[data-vt]` / `[data-vt-origin]` at
 * that moment. Survives client-side navigation (same document).
 */
function recordOrbs(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __orbs: unknown[] };
    w.__orbs = [];
    new MutationObserver((ms) => {
      for (const m of ms)
        for (const n of m.addedNodes)
          if (n instanceof HTMLElement && n.dataset.vtOrb === 'story-orb') {
            const r = n.getBoundingClientRect();
            const root = document.documentElement;
            w.__orbs.push({ dir: root.dataset.vt, origin: root.dataset.vtOrigin ?? null, x: r.x + r.width / 2, y: r.y + r.height / 2 });
          }
    }).observe(document.body, { childList: true });
  });
}
const orbs = (page: Page) =>
  page.evaluate(() => (window as unknown as { __orbs: { dir: string; origin: string | null; x: number; y: number }[] }).__orbs);

/** Centre of the origin link's orb, as it is on screen now. */
const originOrbCentre = (page: Page, origin: Origin) =>
  page.evaluate((o) => {
    const r = document.querySelector(`[data-story-origin="${o}"] [data-story-orb]`)!.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, origin);

/** Every section's reveal transform (MotionLayer scrubs them from the scroll position). */
const revealState = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main > section')].map((s) => s.style.transform));

const transitionDone = (page: Page) =>
  expect.poll(() => page.evaluate(() => (document.documentElement.dataset.vt ?? null) === null && !document.querySelector('[data-vt-orb]'))).toBe(true);

/** Scroll the Portfolio so the origin link is on screen (at a position that isn't a section top). */
async function scrollToOrigin(page: Page, origin: Origin) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate((o) => {
    if (o === 'band') {
      document.getElementById('story')!.scrollIntoView();
      scrollBy(0, -140);
    } else scrollTo(0, Math.round(document.documentElement.scrollHeight * 0.37));
  }, origin);
  return settledScrollY(page);
}

/** Open the Story from `origin` (a plain DOM click: Playwright's actionability scroll would move the page). */
async function openStory(page: Page, origin: Origin) {
  await page.locator(`[data-story-origin="${origin}"]`).evaluate((a: HTMLElement) => a.click());
  await expect(page).toHaveURL(/\/story$/);
  await expect(page.locator('[data-story][data-motion]')).toBeAttached();
  await transitionDone(page);
  // Read a little of the Story, so returning is a real jump.
  await page.evaluate(() => document.getElementById('chapter-4')!.scrollIntoView());
  await settledScrollY(page);
}

/**
 * The origin link got focus back programmatically, but it's a real link: it must not have
 * picked up tabindex="-1" (that would drop it out of the Tab order), and Tab reaches it.
 */
async function expectStillTabbable(page: Page, origin: Origin) {
  const link = page.locator(`[data-story-origin="${origin}"]`);
  await expect(link).not.toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('Shift+Tab');
  await expect(link).not.toBeFocused();
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
}

for (const origin of ['topbar', 'band'] as const) {
  for (const via of ['the ← Portfolio link', 'browser Back'] as const) {
    test(`${origin}: ${via} restores the position and closes the orb onto the ${origin} link`, async ({ page }) => {
      const y0 = await scrollToOrigin(page, origin);
      const start = await originOrbCentre(page, origin);
      const reveals = await revealState(page);
      await recordOrbs(page);
      await openStory(page, origin);

      if (via === 'browser Back') {
        await page.goBack();
        await expect(page).toHaveURL(/\/$/);
      } else {
        await page.getByRole('link', { name: 'Back to the portfolio' }).first().evaluate((a: HTMLElement) => a.click());
        // A fresh Portfolio entry at the old position: no #story in the address.
        await expect(page).toHaveURL(/\/$/);
      }
      await transitionDone(page);

      expect(Math.abs((await settledScrollY(page)) - y0)).toBeLessThanOrEqual(3);
      // Focus returns to the link the Story was opened from.
      await expect(page.locator(`[data-story-origin="${origin}"]`)).toBeFocused();

      // Opened from, and closed onto, that link's orb.
      const end = await originOrbCentre(page, origin);
      const [open, close] = await orbs(page);
      expect(open).toMatchObject({ dir: 'to-story', origin });
      expect(close).toMatchObject({ dir: 'to-portfolio', origin });
      expect(Math.abs(open.x - start.x) + Math.abs(open.y - start.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(close.x - end.x) + Math.abs(close.y - end.y)).toBeLessThanOrEqual(2);

      // The scroll-driven reveals match where it landed (as they were when it was left), not
      // replayed from the top.
      expect(await revealState(page)).toEqual(reveals);

      await expectStillTabbable(page, origin);
    });
  }
}

/** Inside the pinned Skills rail's slide (1024×768: the rail pins and slides there). */
test.describe('from inside the pinned Skills rail', () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright needs the fixtures object
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'viewport-driven; runs once');
  });

  const railX = (page: Page) =>
    page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-skills-rail]')!).transform).e);

  for (const via of ['the ← Portfolio link', 'browser Back'] as const) {
    test(`${via} lands back mid-slide, the rail where it was`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'pin');
      // Partway through the slide (not a section top).
      await page.evaluate(() => {
        const s = document.getElementById('skills')!;
        let y = 0;
        for (let n: HTMLElement | null = s; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
        scrollTo(0, Math.round(y + 0.45 * parseFloat(s.style.getPropertyValue('--rail-slide'))));
      });
      const y0 = await settledScrollY(page);
      const x0 = await railX(page);
      expect(x0).toBeLessThan(-20);
      await openStory(page, 'topbar');
      if (via === 'browser Back') await page.goBack();
      else await page.getByRole('link', { name: 'Back to the portfolio' }).first().evaluate((a: HTMLElement) => a.click());
      await expect(page).toHaveURL(/\/$/);
      await transitionDone(page);
      expect(Math.abs((await settledScrollY(page)) - y0)).toBeLessThanOrEqual(3);
      await expect(page.locator('#skills')).toHaveAttribute('data-skills-mode', 'pin');
      expect(Math.abs((await railX(page)) - x0)).toBeLessThanOrEqual(4);
      await expect(page.locator('[data-story-origin="topbar"]')).toBeFocused();
      await expectStillTabbable(page, 'topbar');
    });
  }
});

test('opened directly, ← Portfolio falls back to the Story band (#story)', async ({ page }) => {
  await page.goto('/story#chapter-5');
  await expect(page.locator('[data-story][data-motion]')).toBeAttached();
  await recordOrbs(page);
  await page.getByRole('link', { name: 'Back to the portfolio' }).first().evaluate((a: HTMLElement) => a.click());
  await expect(page).toHaveURL(/\/#story$/);
  await transitionDone(page);
  await expect(page.getByRole('heading', { level: 2, name: /the path here/i })).toBeInViewport();
  const [close] = await orbs(page);
  expect(close).toMatchObject({ dir: 'to-portfolio', origin: null });
  const band = await originOrbCentre(page, 'band');
  expect(Math.abs(close.x - band.x) + Math.abs(close.y - band.y)).toBeLessThanOrEqual(2);
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const via of ['the ← Portfolio link', 'browser Back'] as const) {
    test(`${via}: the position is restored without the orb`, async ({ page }) => {
      const y0 = await scrollToOrigin(page, 'topbar');
      await recordOrbs(page);
      await openStory(page, 'topbar');
      if (via === 'browser Back') await page.goBack();
      else await page.getByRole('link', { name: 'Back to the portfolio' }).first().evaluate((a: HTMLElement) => a.click());
      await expect(page).toHaveURL(/\/$/);
      expect(Math.abs((await settledScrollY(page)) - y0)).toBeLessThanOrEqual(3);
      await expect(page.locator('[data-story-origin="topbar"]')).toBeFocused();
      await expectStillTabbable(page, 'topbar');
      expect(await orbs(page)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.dataset.vt ?? null)).toBeNull();
    });
  }
});

/**
 * A second Back while the return is still running (router.ts): it takes over — the page
 * ends on that older entry's own position, not dragged back to the returning one's.
 */
test('a rapid second Back during the return lands on the older entry', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Older Portfolio entry, left at y1 (its position saved in history.state).
  await page.evaluate(() => scrollTo(0, 600));
  const y1 = await settledScrollY(page);
  await page.evaluate((y) => history.replaceState({ ...history.state, scrollY: y }, ''), y1);
  // A newer Portfolio entry, further down, that opens the Story.
  await page.evaluate(() => {
    history.pushState(null, '', '/');
    scrollTo(0, Math.round(document.documentElement.scrollHeight * 0.37));
  });
  const y0 = await settledScrollY(page);
  expect(Math.abs(y0 - y1)).toBeGreaterThan(500);
  await openStory(page, 'topbar');

  // Back (the orb return starts), then Back again before it has finished.
  await page.evaluate(() => {
    history.back();
    setTimeout(() => history.back(), 30);
  });
  await expect.poll(() => page.evaluate(() => history.state?.scrollY ?? null)).toBe(y1);
  await expect(page).toHaveURL(/\/$/);
  await transitionDone(page);
  await expect(page.locator('[data-story]')).toHaveCount(0);
  expect(Math.abs((await settledScrollY(page)) - y1)).toBeLessThanOrEqual(3);
  // Nothing was left holding the Story route, and the link stays tabbable.
  await expect(page.locator('[data-story-origin="topbar"]')).not.toHaveAttribute('tabindex', '-1');
  // Focus lands on the older entry's arrival target (it has no Story origin), never on <body>.
  await expect.poll(() => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)).toMatch(/^(story|main)$/);
});
