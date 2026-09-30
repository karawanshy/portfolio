# Karawan — Portfolio ("Afterglow")

My personal portfolio: a single-page Portfolio at `/` and a scroll-driven story,
"How I Got Here", at `/story` (a prologue and 18 chapters, each with its own illustration
and scroll motion).

## Stack

- Vite + React 19 + TypeScript (strict)
- Tailwind CSS v4 (`@tailwindcss/vite`), design tokens in `src/styles/tokens.css`
- Self-hosted Unbounded and Onest variable fonts (`@fontsource-variable`)
- A small History-API router in `src/router/` (no routing library)
- Vitest + React Testing Library + jest-axe for unit tests, Playwright for end-to-end tests
- ESLint (typescript-eslint)

## How I built it with AI

I built this site with [Claude Code](https://claude.com/claude-code) as a pair engineer, inside a
defined process rather than prompting until something looked right. The whole setup is in this
repository, so you can see how the AI was steered and checked.

**Design and facts first.** Before any code there were approved desktop and mobile artboards, a
written handoff for behavior and motion, and a facts document for every claim on the site. They
are the sources of truth, in that order (kept private, so not in this repo). The AI implements
them; it doesn't make them up.

**A written contract: [`CLAUDE.md`](CLAUDE.md).** The conventions the AI follows in every
session: where each kind of value lives (tokens, copy, motion config), what may animate, one
scroll/animation driver, prerender-safe rendering, accessibility rules, and *never invent or
strengthen a fact* (dates, metrics, employers, tech, links).

**Separate roles, not one do-everything prompt ([`.claude/agents/`](.claude/agents)).** An
orchestrator plans and delegates; a frontend implementer and a motion implementer write code; and
three reviewers (design fidelity, quality and accessibility, and a recruiter's 30-second scan) only
review, never edit. Reviewers classify findings as BLOCKER / IMPORTANT / POLISH and return a
status. The orchestrator gets at most two autonomous repair cycles, then must stop and report
what's still open.

**Reusable checklists ([`.claude/skills/`](.claude/skills)).** Implementing a design, motion and
responsive layouts, and running the reviews, each with explicit principles, such as "never approve
visual work from source-code inspection alone" and "if something could not be verified, say so".

**A human in the loop where judgment matters.** A review finding that would change the approved
composition, hierarchy or art direction comes to me as a decision; it isn't applied
automatically. The Story (`/story`), which had no mockup, was built as a vertical slice first,
reviewed, and shown to me in the browser before the rest was built. Copy, facts and design calls
are mine.

**Verified, not assumed.** Changes go through typecheck, ESLint, unit tests (Vitest + React
Testing Library, with jest-axe accessibility checks and content tests that guard the facts) and
Playwright end-to-end tests at desktop and mobile sizes, including a no-JavaScript run and reduced
motion. They're checked in a real browser before they're done.

## Getting started

```sh
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 (client-rendered). |
| `npm run build` | Type-check → client build → SSR build (`src/entry-server.tsx`) → `scripts/prerender.mjs`, which writes full static HTML for `/` (`dist/index.html`) and `/story` (`dist/story.html` and `dist/story/index.html`), injects the font preload and removes `dist-ssr/`. The client hydrates the prerendered HTML. |
| `npm run preview` | Serves the built `dist/` (port 4173). |
| `npm run typecheck` | `tsc -b` only. |
| `npm run lint` | ESLint. |
| `npm test` | Unit tests (Vitest). `npm run test:watch` for watch mode. |
| `npm run test:e2e` | Playwright: builds, serves the preview on 4173 and runs `e2e/` at 1440×900 and 390×844. |

Helper scripts:

- `node scripts/optimize-portrait.mjs <cutout.png>` — regenerate the hero portrait WebPs
- `node scripts/make-og-image.mjs` — regenerate `public/og-image.png` (the share image)

## Project structure

```
src/
  pages/          PortfolioPage, StoryPage (the Story is a lazy-loaded chunk)
  components/     Portfolio sections, primitives, hero, ribbon
  story/          Story page: stage (sky, sun, sea), scenes, header, progress, panels
    scenes/       one illustration per chapter
    motion/       Story scroll motion (stage, pinned scenes, illustration timelines)
  motion/         shared motion: the single rAF/scroll driver, config, hooks
  router/         routes, Link, #fragment helpers (hash.ts), Portfolio ↔ Story transition
  styles/         tokens.css (design tokens), global.css (imports the partials in cascade order),
                  portfolio/ and story/ partials
  content.ts      Portfolio copy, data and links
scripts/          prerender, portrait and OG-image helpers
.claude/          AI workflow: agents (roles) and skills (checklists); see CLAUDE.md
e2e/              Playwright specs
public/           favicon, OG image, robots.txt
```

## Where to tune things

- **Design tokens** (colours, gradients, type scale, radii, shadows, Story stage geometry):
  `src/styles/tokens.css`
- **Copy and data:** `src/content.ts` (Portfolio) and `src/story/storyContent.ts` (Story chapters)
- **Motion** (timings, scroll ranges, pin lengths, per-chapter illustration timelines):
  `src/motion/config.ts` (the Story's under `motion.story`, kept in `src/motion/storyConfig.ts`)
- **Hero composition:** `src/components/hero/heroGeometry.ts`; the portrait: `src/assets/portrait.ts`

`CLAUDE.md` has the full project conventions.

## Accessibility and motion

- All motion is scroll-linked through one driver (`src/motion/driver.ts`) and animates only
  transform, opacity and SVG offsets; Story animations play in reverse when scrolling back up.
- Reduced motion is honoured (`usePrefersReducedMotion`): animations are replaced by their
  final states.
- Content is visible without JavaScript (the pages are prerendered; no-JS fallbacks key off
  `html:not(.js)`).
- Decorative art is `aria-hidden`; one `h1` per page, real links and buttons, 44px targets and
  a visible focus ring. Unit tests include jest-axe checks.

## Deployment

`npm run build` outputs static files in `dist/` that any static host can serve. The site is
deployed as static assets on Cloudflare Workers (`wrangler.jsonc`: it uploads `dist/` as-is and
serves `index.html` for unknown paths). Build with the site's origin so share cards get an
absolute image URL, plus `og:url` and a canonical link:

```sh
SITE_URL=https://your-domain npm run build
```

Without `SITE_URL` the build still works and prints a warning.

## License

The code is shared for reference. The content — text, the portrait and the illustrations —
is © Karawan Youssef; please don't reuse it. The ribbon separator font is under the SIL
Open Font License (`src/assets/fonts/ribbon-separator.LICENSE.txt`).
