# Karawan — Portfolio ("Afterglow")

Personal portfolio: `/` Portfolio (single page) and `/story`, the scroll-driven Story (a prologue + 18 chapters, lazy chunk).

## Stack
Vite + React 19 + TypeScript (strict) · Tailwind CSS v4 (`@tailwindcss/vite`, tokens via `@theme`) ·
self-hosted Unbounded + Onest variable fonts (`@fontsource-variable`) · Vitest + React Testing Library + jest-axe ·
Playwright · ESLint (typescript-eslint). Routing is a tiny History-API router (`src/router/`), no library.

## Commands
- `npm run dev` — dev server on :5173 (`.claude/launch.json` → `dev`)
- `npm run build` — typecheck → client build → SSR build (`src/entry-server.tsx`) → `scripts/prerender.mjs`,
  which writes full static HTML for `/` (`dist/index.html`) and `/story` (`dist/story.html` + `dist/story/index.html`),
  injects the Unbounded + Onest font preloads, and deletes `dist-ssr/`. `src/main.tsx` hydrates prerendered HTML (dev: client render).
  Set `SITE_URL=https://<origin>` for absolute `og:image` + `og:url` + canonical (unset → warning, relative image).
- `npm run lint` · `npm test` · `npm run test:e2e` (builds, serves preview on :4173)
- `node scripts/optimize-portrait.mjs <cutout.png>` — regenerate the hero portrait WebPs
- `node scripts/make-og-image.mjs` — regenerate `public/og-image.png` (share image)

## Structure
- `src/styles/tokens.css` — ALL design tokens (colors, gradients, fluid type scale, radii, shadows, surfaces)
- `src/styles/global.css` — Tailwind + font imports, then the partials in cascade order (append, don't reorder):
  `fonts.css`, `base.css`, `components.css` (skip link, focus ring, `.label` / `.statement`, cursor), `portfolio/*.css`,
  `story/*.css`, `transition.css`
- `src/content.ts` — ALL copy, data and links
- `src/components/primitives/` — SunMark, SectionTitle, Button, Chip, HorizonLine, BackgroundLights, SkipLink
- `src/components/sections/` — TopBar, Hero, Experience, Skills, Projects, StoryBand, Contact, Footer
- `src/components/hero/heroGeometry.ts` — hero composition (intro, proof strip gap, portrait width/inset/rise/fade, horizon gap, glow); ONE portrait element, layouts switch in CSS only (`.hero`/`.hero-main`/`.hero-intro`/`.hero-portrait`/`.hero-photo` in global.css).
- `src/components/ribbon/SatinRibbon.tsx` — SVG satin ribbon (used by the Story); animate `startOffset` on `[data-ribbon-text]`
- `src/assets/portrait.ts` — the only import of the hero photo
- `src/motion/config.ts` — tunable motion parameters (`motion.story` lives in `storyConfig.ts`) · `src/motion/usePrefersReducedMotion.ts`
- `src/motion/driver.ts` — the ONE rAF loop + scroll source (`onScroll` / `onFrame`); never add another scroll listener or loop
- `src/motion/` hooks: ribbon drift, hero parallax, project rail (pin/row/swipe/stack), time of day, scroll-spy; `MotionLayer` (reveals, sun nodes, card tilt, `Cursor`)
- `src/story/motion/` — Story motion (lazy chunk): `useStoryStage` (sky crossfade, stars, sun, path growth), `useStoryScenes`
  (entries, pins, layout), `sceneArt.ts` (each chapter's art timeline + the `Writer` / easing helpers); tunables in `motion.story` · `src/router/transition.ts` — Portfolio ↔ Story
  View Transition (orb), used by `Link` for cross-route links; CSS under `html[data-vt]` in global.css
- `src/pages/` — PortfolioPage, StoryPage (lazy chunk) · `src/router/` — routes + `Link`; `hash.ts` decodes every `#fragment`
  (never call `decodeURIComponent` on a hash directly: a malformed one throws)
- `src/components/AppErrorBoundary.tsx` — wraps the routes (keyed by route): fallback page, one auto-reload for a failed chunk
- `e2e/` — Playwright

## Source of truth (in order)
These live outside this public repository (kept private); ask Karawan when a task needs them.
1. The approved design artboards (desktop + mobile) — visuals, with exact CSS/SVG values
2. The design handoff — behavior and intent
3. The approved facts document — facts; overrides any copy in 1 or 2

## Rules
- Never invent or strengthen facts (dates, metrics, employers, tech, links). Missing → visible placeholder.
- Tune values in one place: tokens → `tokens.css`, copy → `content.ts`, motion → `motion/config.ts`,
  photo → `assets/portrait.ts`, hero composition → `heroGeometry.ts`. No hardcoded hex colors or copy in components.
  Font sizes: the fluid roles (`text-h2`, `text-body`…) or the fixed UI scale `text-(length:--fs-ui-*)`, never `text-[Npx]`.
  Breakpoints beyond Tailwind's: `2xs` 340, `xs` 380, `rail` 2117 (tokens.css).
- Reduced motion is checked in one place: `usePrefersReducedMotion()`. Content must be visible without JS/animation.
- Prerender-safe: never read `window`/`matchMedia` during render. `useMediaQuery` returns the server value during
  hydration and updates after mount; markup that must be right on first paint switches with CSS media queries.
  No-JS fallbacks key off `html:not(.js)` (class set by an inline script in `index.html`). `e2e/no-js.spec.ts` guards it.
- Head/meta (title, description, OG/Twitter, theme-color) live in `index.html`; per-route titles in `entry-server.tsx`.
- Decorative elements (ribbons, sun marks, light pools, grain, section numbers) are `aria-hidden`.
- One `h1` (the name), one `h2` per section, real `<a>`/`<button>`, targets ≥ 44px, pink focus ring.
- No monospace anywhere, except the chess phone's clock digits (`--font-clock`, JetBrains Mono).
- Scroll-driven, entrance and looping motion animates only transform, opacity and SVG offsets. Short (≤ 200ms)
  hover/focus state fades may also transition color, background, filter or box-shadow.
- Page scroll and continuous per-frame work go through `motion/driver.ts` only. One-shot `requestAnimationFrame`
  deferrals, per-pointermove rAF throttles and an element's own `scroll` event (the project rail) are fine.
- Don't commit unless asked.
