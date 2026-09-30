// Build step (after `vite build` + `vite build --ssr`): renders each route to static
// HTML inside dist/, so all content and links exist without JavaScript. The client
// bundle then hydrates it (src/main.tsx). dist-ssr/ is a temporary build artifact.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dist = resolve('dist');
const ssrDir = resolve('dist-ssr');
const { render, routes } = await import(pathToFileURL(resolve(ssrDir, 'entry-server.js')).href);
let template = readFileSync(resolve(dist, 'index.html'), 'utf8');

// Preload both Latin subsets: the hero name and ribbons (the LCP candidates) are
// set in Unbounded and the lead/buttons in Onest; otherwise both are found only
// after CSS, and a late swap re-wraps the hero text (layout shift).
const PRELOAD_FONTS = [/^unbounded-latin-wght-normal-.*\.woff2$/, /^onest-latin-wght-normal-.*\.woff2$/];
const assets = readdirSync(resolve(dist, 'assets'));
const preloads = PRELOAD_FONTS.map((re) => assets.find((f) => re.test(f)))
  .filter(Boolean)
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`)
  .join('\n    ');
template = template.replace('</title>', () => `</title>\n    ${preloads}`);
const ROOT = '<div id="root"></div>';
// data-route lets main.tsx skip hydration if a host serves the wrong page for a path.
if (!template.includes(ROOT)) throw new Error('prerender: #root placeholder not found in dist/index.html');

// Share cards (LinkedIn, Slack, Facebook…) need absolute URLs. The deployed origin isn't
// recorded anywhere, so it comes from the environment: SITE_URL=https://example.com npm run build.
// Without it the share image stays relative (it may not show) and no canonical is written.
const SITE_URL = process.env.SITE_URL?.replace(/\/+$/, '');
if (SITE_URL && !/^https?:\/\/[^/]+$/.test(SITE_URL)) throw new Error(`prerender: SITE_URL must be an origin like https://example.com (got ${SITE_URL})`);
if (!SITE_URL) console.warn('prerender: SITE_URL not set: og:image stays relative, no og:url / canonical.');

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

for (const route of routes) {
  const html = await render(route.path);
  // Replacer functions, never replacement strings: in those `$&`, `$'`, `$1`… are patterns,
  // so a `$` in the rendered HTML or a title would corrupt the page.
  let page = template
    .replace(ROOT, () => `<div id="root" data-route="${route.route}">${html}</div>`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(route.title)}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, (_, a, b) => `${a}${escapeAttr(route.title)}${b}`);
  if (route.description) {
    page = page
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, (_, a, b) => `${a}${escapeAttr(route.description)}${b}`)
      .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, (_, a, b) => `${a}${escapeAttr(route.description)}${b}`);
  }
  if (SITE_URL) {
    const url = escapeAttr(SITE_URL + route.path);
    page = page
      .replace(/(<meta property="og:image" content=")\/([^"]*")/, (_, a, rest) => `${a}${escapeAttr(SITE_URL)}/${rest}`)
      .replace('</title>', () => `</title>\n    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />`);
  }
  for (const file of route.files) {
    const out = resolve(dist, file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, page);
    console.log(`prerendered ${route.path} → dist/${file} (${(page.length / 1024).toFixed(1)} KB)`);
  }
}

rmSync(ssrDir, { recursive: true, force: true });
