import { expect, test } from '@playwright/test';

// Runs against the production preview (prerendered HTML) with JavaScript disabled.
test.use({ javaScriptEnabled: false });

test('portfolio content is complete and visible without JavaScript', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /karawan/i })).toBeVisible();
  // The about content sits in the hero under a visually hidden h2.
  await expect(page.getByRole('heading', { level: 2, name: 'About me' })).toBeAttached();
  for (const name of ['Experience', 'Skills', 'Featured projects', 'The path here wasn’t exactly straight.', /let’s talk/i]) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  }
  // Hero: intro paragraph and the proof strip (role, education) show without JS.
  await expect(page.getByText(/drawn to infrastructure/).filter({ visible: true })).toHaveCount(1);
  await expect(page.locator('.hero-proof').getByText('Software Engineer', { exact: true })).toBeVisible();
  await expect(page.locator('.hero-proof').getByText('B.Sc. Computer Science', { exact: true })).toBeVisible();
  for (const name of ['Hasoub Talent Bridge', 'Habit Tracker API', 'Multiplayer Chess', 'Frontend infrastructure & development standards']) {
    await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
  }
  await expect(page.getByAltText(/Karawan, smiling/).filter({ visible: true })).toHaveCount(1);

  const hrefs = await page.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  for (const href of [
    'mailto:karawan.sh.y@gmail.com',
    'https://www.linkedin.com/in/karawanshy/',
    'https://github.com/karawanshy',
    'https://github.com/karawanshy/habit-tracker-api',
    'https://github.com/karawanshy/ChessGame',
    '/story',
  ]) {
    expect(hrefs).toContain(href);
  }

  // Nothing is stuck hidden, and all three project cards are fully inside the viewport width.
  const state = await page.evaluate(() => ({
    hiddenSections: [...document.querySelectorAll('main section')].filter((s) => getComputedStyle(s).opacity === '0')
      .length,
    cards: [...document.querySelectorAll('[data-project-rail] article')].map((a) => {
      const r = a.getBoundingClientRect();
      return { left: r.left, right: r.right };
    }),
    skills: [...document.querySelectorAll('[data-skills-rail] > li')].map((li) => {
      const r = li.getBoundingClientRect();
      return { left: r.left, right: r.right };
    }),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  expect(state.hiddenSections).toBe(0);
  expect(state.cards).toHaveLength(3);
  const vw = page.viewportSize()!.width;
  for (const c of state.cards) {
    expect(c.left).toBeGreaterThanOrEqual(0);
    expect(c.right).toBeLessThanOrEqual(vw);
  }
  // Every Skills card too (the rail wraps without JS: nothing hides off to the side).
  expect(state.skills).toHaveLength(5);
  for (const c of state.skills) {
    expect(c.left).toBeGreaterThanOrEqual(0);
    expect(c.right).toBeLessThanOrEqual(vw);
  }
  expect(state.overflow).toBeLessThanOrEqual(0);
});

test('/story is prerendered and fully readable without JavaScript', async ({ page }) => {
  await page.goto('/story');
  await expect(page).toHaveTitle('How I Got Here · Karawan');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /18 chapters/);
  await expect(page.getByRole('heading', { level: 1, name: 'How I Got Here' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(18);
  await expect(page.locator('[data-scene]')).toHaveCount(19);
  // JS-only controls are hidden; each chapter's story is an inline disclosure instead.
  await expect(page.getByRole('button', { name: /explore the story/i })).toHaveCount(0);
  // The stage: the prologue's half-sun (its disc centred on the horizon, the horizon cutting it in half).
  const sun = await page.evaluate(() => {
    const box = document.querySelector('[data-story-sun]')!.getBoundingClientRect();
    const d = document.querySelector('[data-story-sun-full]')!.getBoundingClientRect();
    return Math.round(box.top + box.height * 0.65 - (d.top + d.height / 2));
  });
  expect(Math.abs(sun)).toBeLessThanOrEqual(1);
  // ch 12 shows its resolved state: every test passing, the CI line steady green.
  const field = page.locator('#chapter-12 svg[data-scene-part="field"]');
  const dots = async (k: string) => ((await field.locator(`[data-dots="${k}"]`).getAttribute('d')) ?? '').split('M').length - 1;
  expect(await dots('pass')).toBeGreaterThanOrEqual(600);
  expect((await dots('fail')) + (await dots('fail-alt'))).toBe(0);
  await expect(field.locator('[data-ci-stop="heal-0"]')).toHaveAttribute('offset', '1');
  const details = page.locator('#chapter-12 details');
  await details.locator('summary').click();
  await expect(details.getByText(/Selenium testing-infrastructure side of our migration to AG Grid/)).toBeVisible();
  await expect(details.getByRole('heading', { name: 'What I Learned' })).toBeVisible();
  // The chapter index is a :target overlay.
  await page.getByRole('link', { name: 'Chapters' }).click();
  const index = page.locator('#chapters');
  await expect(index).toBeVisible();
  await index.getByRole('link', { name: 'Six Days' }).click();
  await expect(index).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: 'Six Days' })).toBeInViewport();
  await expect(page.getByRole('link', { name: /back to the portfolio/i }).first()).toHaveAttribute('href', '/#story');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('phone menu opens without JavaScript', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('navigation', { name: 'Sections' });
  await expect(menu).toBeHidden();
  await page.getByRole('link', { name: /open menu/i }).click();
  await expect(menu).toBeVisible();
  await menu.getByRole('link', { name: 'Work' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Experience' })).toBeInViewport();
});

test('wide screens get the fitted project row without JavaScript', async ({ page }) => {
  await page.setViewportSize({ width: 2200, height: 1000 });
  await page.goto('/');
  const [a, b, c] = await page
    .locator('[data-project-rail] > li > article')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
  expect(b.top).toBeLessThan(a.bottom); // side by side
  expect(c.top).toBeLessThan(a.bottom);
  expect(c.right).toBeLessThanOrEqual(2200 - 64 + 1);
  expect(a.width).toBeGreaterThan(b.width);
});

test('project cards stack without JavaScript, Hasoub first and widest on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const [a, b, c] = await page
    .locator('[data-project-rail] > li > article')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
  expect(b.top).toBeGreaterThanOrEqual(a.bottom);
  expect(c.top).toBeGreaterThanOrEqual(b.bottom);
  expect(a.width).toBeGreaterThan(b.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('Hasoub details open inline without JavaScript; no fake link', async ({ page }) => {
  await page.goto('/');
  const hasoub = page.locator('[data-project-rail] > li > article').first();
  await expect(hasoub.locator('a')).toHaveCount(0);
  await expect(hasoub.locator('[data-private-marker]')).toHaveText('Private client project');
  await expect(hasoub.locator('[data-private-marker]')).toBeVisible();
  // The JS dialog button is hidden; the <details> disclosure stands in.
  await expect(page.getByRole('button', { name: /more about the project/i })).toHaveCount(0);
  const details = hasoub.locator('details');
  await expect(details.getByRole('heading', { name: 'The platform' })).toBeHidden();
  await details.locator('summary').click();
  await expect(details.getByRole('heading', { name: 'The platform' })).toBeVisible();
  await expect(details.getByText(/Helping define technical direction/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
