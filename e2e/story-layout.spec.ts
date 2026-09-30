import { expect, test, type Page } from '@playwright/test';
import { motion } from '../src/motion/config';

/**
 * /story layout (S5): the chrome's scrims, what a pinned frame holds, and ch 18's ending
 * against the sun. Runs in both projects (1440×900, 390×844); phone-only checks skip on desktop.
 */

const S = motion.story.pin;

async function settle(page: Page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page.locator('[data-story][data-settling-scenes], [data-story][data-settling-stage]')).toHaveCount(0);
}

async function openStory(page: Page) {
  await page.goto('/story');
  await expect(page.locator('[data-story][data-motion="on"]')).toBeAttached();
}

/** Scroll to a fraction of a pinned scene's pin (0 = it engages, 1 = it releases) and settle. */
async function scrollIntoPin(page: Page, id: string, at: number) {
  await page.evaluate(
    ([sceneId, f]) => {
      const s = document.getElementById(sceneId)!;
      const pin = s.querySelector<HTMLElement>('[data-scene-pin]')!;
      const cs = getComputedStyle(s);
      const pad = parseFloat(cs.paddingTop);
      const start = s.getBoundingClientRect().top + scrollY + pad - parseFloat(pin.style.top || '0');
      const length = s.offsetHeight - pin.offsetHeight - pad - parseFloat(cs.paddingBottom);
      scrollTo(0, Math.round(start + length * f));
    },
    [id, at] as const,
  );
  await settle(page);
}

test('the header scrim dims what passes under it and clears where a pinned heading rests', async ({ page }) => {
  await openStory(page);
  const { atPills, atRest } = await page.evaluate(
    ([overlap, margin]) => {
      const header = document.querySelector('header')!;
      const h = header.offsetHeight;
      // The gradient's stops (alpha at a fraction of the header's height), linearly interpolated.
      const stops = [...getComputedStyle(header).backgroundImage.matchAll(/rgba?\(([^)]+)\)\s+([\d.]+)%/g)].map((m) => ({
        a: Number(m[1]!.split(',')[3] ?? 1),
        at: Number(m[2]) / 100,
      }));
      const alpha = (y: number) => {
        const f = y / h;
        for (let i = 1; i < stops.length; i++) {
          const [p, q] = [stops[i - 1]!, stops[i]!];
          if (f <= q.at) return p.a + ((q.a - p.a) * (f - p.at)) / (q.at - p.at || 1);
        }
        return stops.at(-1)!.a;
      };
      const pills = Math.max(...[...header.children].map((c) => c.getBoundingClientRect().bottom));
      return { atPills: alpha(pills + 4), atRest: alpha(h - overlap + margin) };
    },
    [S.safe.headerOverlap, S.safe.margin] as const,
  );
  expect(atPills).toBeGreaterThanOrEqual(0.8);
  expect(atRest).toBeLessThanOrEqual(0.4);
});

test('a pinned scene holds its controls inside the frame, above the progress rail', async ({ page }) => {
  await openStory(page);
  // ch 18 is the page's end: its ending runs on past the frame and scrolls up after the release.
  for (const id of Object.keys(S.length).filter((c) => c !== 'chapter-18')) {
    await scrollIntoPin(page, id, 0.5);
    const { bottom, rail } = await page.evaluate((sceneId) => {
      const c = document.querySelector(`#${sceneId} [data-scene-part="controls"]`)!.getBoundingClientRect();
      return { bottom: c.bottom, rail: document.querySelector('[data-story-progress]')!.getBoundingClientRect().top };
    }, id);
    expect(bottom, id).toBeLessThanOrEqual(rail + S.safe.footerOverlap);
  }
});

test.describe('phones', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 768, 'phone layout');

  test('ch 3: the heading, the board and the quote share one pinned frame', async ({ page }) => {
    await openStory(page);
    await scrollIntoPin(page, 'chapter-3', 0.9);
    const r = await page.evaluate(() => {
      const box = (sel: string) => document.querySelector(`#chapter-3 ${sel}`)!.getBoundingClientRect();
      return {
        heading: box('h2').top,
        quote: box('[data-scene-part="quote"]').bottom,
        header: document.querySelector('header')!.getBoundingClientRect().bottom,
        rail: document.querySelector('[data-story-progress]')!.getBoundingClientRect().top,
      };
    });
    expect(r.heading).toBeGreaterThanOrEqual(r.header - S.safe.headerOverlap);
    expect(r.quote).toBeLessThanOrEqual(r.rail + S.safe.footerOverlap);
  });

  test('ch 18: the ending controls stay left of the sun, pinned and at the end', async ({ page }) => {
    await openStory(page);
    const clear = () =>
      page.evaluate(() => {
        const sun = document.querySelector('[data-story-sun-full]')!.getBoundingClientRect();
        return [...document.querySelectorAll('[data-story-ending] a')].map((a) => ({
          label: a.textContent!.trim(),
          gap: sun.left - a.getBoundingClientRect().right,
        }));
      });
    await scrollIntoPin(page, 'chapter-18', 0.5);
    for (const c of await clear()) expect(c.gap, c.label).toBeGreaterThan(0);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await settle(page);
    for (const c of await clear()) expect(c.gap, c.label).toBeGreaterThan(0);
  });
});

test.describe('header at 320', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('the chapter indicator fits beside the logo and ← Portfolio, with the full accessible name', async ({ page }) => {
    for (const n of [0, 3, 10, 18]) {
      await page.goto(`/story#chapter-${n}`);
      await expect(page.locator('[data-story][data-motion]')).toBeAttached();
      const indicator = page.locator('[data-chapter-indicator]');
      await expect(indicator).toContainText(n === 0 ? 'Ch 00' : `Ch ${String(n).padStart(2, '0')}`);
      await expect(indicator).toHaveAccessibleName(new RegExp(n === 0 ? 'Prologue' : `Chapter ${String(n).padStart(2, '0')}`));
      const r = await page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect();
        const ind = document.querySelector('[data-chapter-indicator]')!;
        const back = document.querySelector('header > :last-child')!;
        const logo = document.querySelector('header > a:first-child')!;
        const overflowing = [...ind.querySelectorAll<HTMLElement>('span:not(.sr-only)')].filter((s) => s.offsetWidth > 1 && s.scrollWidth > s.offsetWidth + 1).length;
        // The tap target: portrait phones draw the pills slimmer (36px) inside a 44px target, an
        // invisible ::before overhanging the pill. Its height is the pill plus that overhang, and
        // a point just inside each end of it must hit the control itself.
        const target = (el: Element) => {
          const r = el.getBoundingClientRect();
          const b = getComputedStyle(el, '::before');
          const up = b.position === 'absolute' ? Math.max(0, -parseFloat(b.top)) : 0;
          const down = b.position === 'absolute' ? Math.max(0, -parseFloat(b.bottom)) : 0;
          const x = (r.left + r.right) / 2;
          const hits = [r.top - up + 1, r.bottom + down - 1].every((y) => document.elementFromPoint(x, y)?.closest('a, button') === el);
          return { height: r.height + up + down, hits };
        };
        const backLink = back.querySelector('a') ?? back;
        return { ind: box(ind), back: box(back), logo: box(logo), overflowing, pageOverflow: document.documentElement.scrollWidth - innerWidth, indTarget: target(ind), backTarget: target(backLink) };
      });
      expect(r.ind.right, `ch ${n}`).toBeLessThanOrEqual(r.back.left);
      expect(r.ind.left, `ch ${n}`).toBeGreaterThanOrEqual(r.logo.right);
      expect(r.indTarget.height, `ch ${n}`).toBeGreaterThanOrEqual(44);
      expect(r.indTarget.hits, `ch ${n}`).toBe(true);
      expect(r.backTarget.height, `ch ${n}`).toBeGreaterThanOrEqual(44);
      expect(r.backTarget.hits, `ch ${n}`).toBe(true);
      expect(r.overflowing, `ch ${n}`).toBe(0);
      expect(r.pageOverflow).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('re-measure', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a 1px resize and back mid-pin leaves every pin as it was (fit, top, art scale)', async ({ page }) => {
    test.setTimeout(120_000);
    await openStory(page);
    await page.evaluate(() => document.fonts.ready);
    await settle(page);
    const snap = () =>
      page.evaluate(() =>
        Object.fromEntries(
          [...document.querySelectorAll<HTMLElement>('[data-pin-fit]')].map((s) => {
            const pin = s.querySelector<HTMLElement>('[data-scene-pin]')!;
            const art = [...s.querySelectorAll<HTMLElement>('[data-scene-visual]')].find((v) => v.getClientRects().length);
            return [s.id, `${s.dataset.pinFit} ${pin.style.top} ${art?.style.transform ?? ''}`];
          }),
        ),
      );
    const ref = await snap();
    const ids = Object.keys(ref);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) {
      await scrollIntoPin(page, id, 0.5);
      await page.setViewportSize({ width: 390, height: 845 });
      await settle(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await settle(page);
      expect(await snap(), `after a resize mid-pin in ${id}`).toEqual(ref);
    }
  });
});
