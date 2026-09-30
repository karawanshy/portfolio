import { expect, test } from '@playwright/test';

test('portfolio renders every section without horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /karawan/i })).toBeVisible();
  for (const id of ['work', 'skills', 'projects', 'contact']) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('/story renders', async ({ page }) => {
  await page.goto('/story');
  await expect(page.getByRole('link', { name: /back to the portfolio/i }).first()).toBeVisible();
});

test('no horizontal page scroll from 320 to 2560', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 390, 768, 1024, 1100, 1280, 1440, 1920, 2200, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

/**
 * The portrait stands right of the intro (desktop), below it (tablet) or above it with the
 * intro starting inside her faded lower edge (phone); its transparent box edge and glow may
 * run under the text, so this checks the visible silhouette, not the box: no intro text may
 * sit on portrait pixels that render above `maxAlpha` (cutout alpha × the bottom-fade mask;
 * the image is mirrored).
 */
test('hero text never sits on the visible portrait', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 390, 430, 768, 900, 1024, 1100, 1280, 1440, 1920])
  for (const scrollY of [0, 150]) {
    await page.setViewportSize({ width, height: 900 });
    // Scrolled a little too: the parallax moves the photo against the text.
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(150);
    const hits = await page.evaluate(async () => {
      const maxAlpha = 0.2;
      const img = document.querySelector<HTMLImageElement>('[data-hero-photo] img')!;
      await img.decode();
      const pr = img.getBoundingClientRect();
      const mirrored = new DOMMatrix(getComputedStyle(img).transform).a < 0;
      // Bottom fade (global.css .hero-photo > img): opaque until `fade` px above the bottom,
      // 0.55 at 0.55 × fade, transparent at the bottom.
      const fade = parseFloat(getComputedStyle(document.querySelector('.hero')!).getPropertyValue('--photo-fade'));
      const maskAt = (y: number) => {
        const up = pr.bottom - y;
        if (up >= fade) return 1;
        const k = 0.55 * fade;
        return up >= k ? 0.55 + (0.45 * (up - k)) / (fade - k) : (0.55 * up) / k;
      };
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(pr.width);
      canvas.height = Math.round(pr.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const alphaAt = (x: number, y: number) => {
        let cx = Math.floor(x - pr.left);
        const cy = Math.floor(y - pr.top);
        if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) return 0;
        if (mirrored) cx = canvas.width - 1 - cx;
        return (px[(cy * canvas.width + cx) * 4 + 3] / 255) * maskAt(y);
      };
      const col = document.getElementById('hero-name')!.parentElement!;
      const walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
      const found: string[] = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim() || !(n.parentElement as HTMLElement).offsetParent) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) {
          let hit = false;
          for (let y = r.top; y < r.bottom && !hit; y += 2)
            for (let x = r.left; x < r.right && !hit; x += 2) hit = alphaAt(x, y) > maxAlpha;
          if (hit) found.push(n.textContent.trim());
        }
      }
      return found;
    });
    expect(hits, `text on the portrait at ${width}px, scroll ${scrollY}`).toEqual([]);
  }
});

/**
 * Desktop: the portrait stands on the right, inside the content and clear of the intro column
 * (paragraph, CTAs, proof strip). Tablet: she stands centred below the intro. Phone: she stands
 * right of the name (which keeps its full size) and the paragraph, top-aligned with the name. Every
 * layout fades her lower edge out with an alpha mask (heroGeometry photo.<layout>.fade) that is
 * fully transparent at her box bottom, and the box never runs past the hero's (clipped) bottom,
 * also while the parallax drifts her down, so no hard photo edge shows.
 */
test('hero portrait: clear of the intro, its lower edge faded out', async ({ page }) => {
  await page.goto('/');
  for (const [width, height] of [[320, 700], [390, 844], [768, 1024], [820, 1180], [1024, 768], [1280, 800], [1440, 900], [1891, 957], [1920, 1080], [2560, 1440]] as const) {
    await page.setViewportSize({ width, height });
    for (const scrollY of [0, 300]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(150);
      const m = await page.evaluate(async () => {
        await document.fonts.ready;
        const img = document.querySelector('[data-hero-photo] img')!;
        const photo = img.getBoundingClientRect();
        const heroEl = document.querySelector('.hero')!;
        const hero = getComputedStyle(heroEl);
        const intro = document.querySelector('.hero-intro')!;
        const introRight = Math.max(
          ...[...intro.querySelectorAll('p, a, li > span')].map((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return range.getBoundingClientRect().right;
          }),
        );
        const mask = getComputedStyle(img).maskImage;
        return {
          fadesOut: mask !== 'none' && /(transparent|rgba\(0, 0, 0, 0\))\)$/.test(mask.trim()),
          heroBottom: heroEl.getBoundingClientRect().bottom,
          photoTop: photo.top,
          photoBottom: photo.bottom,
          photoLeft: photo.left,
          photoRight: photo.right,
          photoCentre: photo.left + photo.width / 2,
          introBottom: intro.getBoundingClientRect().bottom,
          name: (() => {
            const range = document.createRange();
            range.selectNodeContents(document.getElementById('hero-name')!);
            const r = range.getBoundingClientRect();
            return { top: document.getElementById('hero-name')!.getBoundingClientRect().top, right: r.right };
          })(),
          introRight,
          contentRight: innerWidth - parseFloat(hero.paddingRight),
        };
      });
      const at = `${width}px, scroll ${scrollY}`;
      expect(m.fadesOut, `lower edge faded out at ${at}`).toBe(true);
      expect(m.photoBottom, `photo box inside the hero at ${at}`).toBeLessThanOrEqual(m.heroBottom);
      expect(m.photoRight, `portrait inside the content at ${at}`).toBeLessThanOrEqual(m.contentRight + 1);
      if (width >= 1024) {
        expect(m.introRight, `intro left of the portrait at ${at}`).toBeLessThanOrEqual(m.photoLeft);
      } else if (width >= 768 && scrollY === 0) {
        expect(m.photoTop, `portrait below the intro at ${at}`).toBeGreaterThanOrEqual(m.introBottom);
        expect(Math.abs(m.photoCentre - width / 2), `portrait centred at ${at}`).toBeLessThanOrEqual(2);
      } else if (scrollY === 0) {
        // Phone: beside the name, at the right edge, top-aligned with the name row.
        expect(m.contentRight - m.photoRight, `portrait at the right edge at ${at}`).toBeLessThanOrEqual(1);
        expect(m.photoLeft, `portrait right of the name at ${at}`).toBeGreaterThanOrEqual(m.name.right);
        expect(Math.abs(m.photoTop - m.name.top), `portrait level with the name at ${at}`).toBeLessThanOrEqual(2);
      }
    }
  }
});

/**
 * Quiet hero: the sunrise glow sits behind the portrait, centred on her; the proof strip shows
 * two signals (no stat tiles); md+ the horizon line closes the hero, clear of the proof strip and
 * of the portrait's faded end. No scroll cue.
 */
test('hero glow, proof strip and closing horizon line', async ({ page }) => {
  await page.goto('/');
  for (const width of [390, 768, 1024, 1280, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const m = await page.evaluate(async () => {
      await document.fonts.ready;
      const photo = document.querySelector('[data-hero-photo]')!;
      const p = photo.getBoundingClientRect();
      const glow = document.querySelector('[data-hero-glow]')!;
      const g = glow.getBoundingClientRect();
      const horizon = document.querySelector('.hero > [data-horizon]')!.getBoundingClientRect();
      const proof = [...document.querySelectorAll('.hero-proof > li')].filter((el) => el.getClientRects().length);
      return {
        glowBehind: glow.compareDocumentPosition(photo) & Node.DOCUMENT_POSITION_FOLLOWING,
        glowCentre: g.left + g.width / 2 - (p.left + p.width / 2),
        proofGap: horizon.top - Math.max(...proof.map((el) => el.getBoundingClientRect().bottom)),
        photoGap: horizon.top - p.bottom,
        horizonShown: horizon.height > 0,
        proof: proof.length,
        lit: document.querySelectorAll('.hero [data-lit]').length,
      };
    });
    expect(m.glowBehind, `glow painted before the photo at ${width}px`).toBeTruthy();
    expect(Math.abs(m.glowCentre), `glow centred on the photo at ${width}px`).toBeLessThanOrEqual(2);
    expect(m.proof, `two proof signals at ${width}px`).toBe(2);
    expect(m.lit, `no lit tiles or cards in the hero at ${width}px`).toBe(0);
    if (width >= 768) {
      expect(m.horizonShown).toBe(true);
      expect(m.proofGap, `horizon below the proof strip at ${width}px`).toBeGreaterThanOrEqual(24);
      expect(m.photoGap, `horizon below the portrait at ${width}px`).toBeGreaterThanOrEqual(24);
    } else expect(m.horizonShown).toBe(false);
  }
  await expect(page.locator('.hero').getByRole('link', { name: /scroll/i })).toHaveCount(0);
});

test('top bar stays fixed while scrolling, and anchor jumps land below it', async ({ page }) => {
  for (const [width, height] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const header = page.locator('header[data-topbar]');
    await expect(header).not.toHaveAttribute('data-scrolled', 'true');
    await page.mouse.wheel(0, 1600);
    await expect(header).toHaveAttribute('data-scrolled', 'true');
    expect((await header.boundingBox())!.y).toBe(0);
    await expect(page.locator('[data-topbar-backdrop]')).toHaveCSS('opacity', '1');
    await page.goto('/#work');
    await page.waitForTimeout(300);
    const [barBottom, headingTop] = await page.evaluate(() => [
      document.querySelector('header[data-topbar]')!.getBoundingClientRect().bottom,
      document.querySelector('#work h2')!.getBoundingClientRect().top,
    ]);
    expect(headingTop, `#work heading below the bar at ${width}px`).toBeGreaterThanOrEqual(barBottom);
  }
});

test.describe('featured projects', () => {
  const cards = '[data-project-rail] > li > article';

  test('three projects in order: Hasoub (private, no link), Habit Tracker, Chess', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(`${cards} h3`)).toHaveText(['Hasoub Talent Bridge', 'Habit Tracker API', 'Multiplayer Chess']);
    await expect(page.locator('[data-project-progress]')).toHaveText('01 / 03');
    const hasoub = page.locator(cards).first();
    // No fake / placeholder / disabled link: the private marker stands in for one.
    await expect(hasoub.locator('a')).toHaveCount(0);
    await expect(hasoub.locator('[data-private-marker]')).toHaveText('Private client project');
    await expect(hasoub.locator('p').filter({ hasText: /^Team Lead \/ Software Engineer$/ })).toBeVisible();
    await expect(hasoub.locator('details')).toBeHidden(); // no-JS fallback only
  });

  test('"More about the project" opens an accessible dialog that Esc closes', async ({ page }) => {
    await page.goto('/');
    const more = page.getByRole('button', { name: /more about the project/i });
    await more.scrollIntoViewIfNeeded();
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    const dialog = page.getByRole('dialog', { name: 'Hasoub Talent Bridge' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'The platform' })).toBeVisible();
    // The leadership beats moved off the card face into the details.
    await expect(dialog.getByText('Technical & architectural direction')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /close project details/i })).toBeFocused();
    // The dialog fits the viewport; its body scrolls, not the page.
    const box = (await dialog.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more).toBeFocused();
    // The close button works too.
    await more.click();
    await dialog.getByRole('button', { name: /close project details/i }).click();
    await expect(dialog).toBeHidden();
    await expect(more).toBeFocused();
  });

  test('phones: the next card peeks in, and the hint counts and names it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'viewport-driven; runs once');
    for (const width of [390, 360, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      await expect(page.locator('#projects')).toHaveAttribute('data-rail-mode', 'swipe');
      const hint = page.locator('[data-project-hint]');
      await expect(hint).toHaveText('01 / 03 · Swipe for Habit Tracker API →');
      const rects = () =>
        page.locator(cards).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
      const [a, b] = await rects();
      const peek = width - b.left;
      expect(peek, `peek at ${width}px`).toBeGreaterThanOrEqual(16);
      expect(peek, `peek at ${width}px`).toBeLessThanOrEqual(24);
      expect(a.left).toBe(16);
      // Swipe to the end: the last card sits on the right gutter, the previous one peeks.
      await page.locator('[data-project-rail]').evaluate((r) => r.scrollTo({ left: r.scrollWidth, behavior: 'instant' }));
      await expect(hint).toHaveText('03 / 03 · ← Swipe back to Habit Tracker API');
      const [, b2, c] = await rects();
      expect(Math.round(c.right)).toBe(width - 16);
      expect(b2.right).toBeGreaterThan(16);
      // Natural heights: no card is stretched to the tallest card's height (the cards'
      // content differs, so stretched cards would all measure the same).
      const heights = await page.locator(cards).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      const tallest = Math.max(...heights);
      expect(heights.filter((h) => h < tallest - 8).length, `heights at ${width}px: ${heights.join(', ')}`).toBeGreaterThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
  });
});

test('reloading the Portfolio starts over at Home', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  // After a nav jump (the address stays `/`) …
  await page.locator('nav[aria-label="Primary"] a', { hasText: 'Projects' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // … after arriving from a shared deep link (/#projects) …
  await page.goto('/#projects');
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // … and after plain scrolling (the router saves the position).
  await page.evaluate(() => scrollTo(0, 2500));
  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('in-page links scroll within the page and keep the address at /', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const entries = await page.evaluate(() => history.length);
  for (const [name, id] of [['Work', 'work'], ['Skills', 'skills'], ['Projects', 'projects'], ['Home', 'top']] as const) {
    await page.locator('nav[aria-label="Primary"] a', { hasText: name }).click();
    await expect(page).toHaveURL(/\/$/);
    // Focus moves to the section, like a fragment jump; its heading sits below the fixed bar.
    await expect(page.locator(`#${id}`)).toBeFocused();
    if (id !== 'top') {
      const [bar, heading] = await page.evaluate(
        (id) => [
          document.querySelector('header[data-topbar]')!.getBoundingClientRect().bottom,
          document.querySelector(`#${id} h2`)!.getBoundingClientRect().top,
        ],
        id,
      );
      expect(heading, `${name} heading below the bar`).toBeGreaterThanOrEqual(bar);
    }
  }
  expect(await page.evaluate(() => history.length), 'no history entries').toBe(entries);
  // A shared deep link still lands on its section; the next in-page click cleans the address.
  await page.goto('/#projects');
  await expect(page.locator('#projects h2')).toBeInViewport();
  await page.getByRole('link', { name: /see my work/i }).click();
  await expect(page).toHaveURL(/\/$/);
});
