import { storyMotion } from './storyConfig';

/**
 * Tunable motion parameters — the single place to adjust timing and intensity.
 * All motion is disabled when usePrefersReducedMotion() returns true.
 * Distances are CSS px unless noted; ribbon speeds are in path units (≈ px at the artboard width).
 */
export const motion = {
  /** Media query for devices that get the custom cursor, hover tilt and ribbon hover slow-down. */
  finePointerQuery: '(hover: hover) and (pointer: fine)',

  /** The shared scroll/frame driver. */
  driver: {
    /** Time constant (s) for smoothing scroll velocity; larger = smoother, laggier. */
    velocitySmoothingS: 0.12,
  },

  /**
   * Section reveals: rise + fade, scrubbed by scroll (so scrolling back plays them in
   * reverse). An element starts entering when its top crosses `from` × vh (from the
   * viewport top) and is fully in once its top reaches `to` × vh. `ease` is a
   * cubic-bezier applied to that progress.
   */
  reveal: {
    distance: 28,
    ease: [0.22, 1, 0.36, 1] as const,
    from: 0.96,
    to: 0.72,
    /**
     * Sections also wait for the first scroll: nothing below the hero shows before the visitor
     * starts scrolling (phones, where Experience's top is already on screen at load). Fully
     * gated in after this much scroll (fraction of vh).
     */
    startScroll: 0.12,
  },

  /**
   * Experience title + company pill: a later window than `reveal`, so they stay fully hidden
   * until well in view (top at `from` × vh from the top), in by `to`. The dimmed timeline
   * path fades in with the pill. Also waits for the first scroll (reveal.startScroll).
   */
  experienceHead: { from: 0.78, to: 0.58 },

  /**
   * Featured projects (MotionLayer projectsReveal): the head fades/rises in once Skills'
   * closing line has drawn (and it's on screen), over `headSpan` px of scroll; then the cards
   * fade in left to right (opacity only — the rail's own sideways motion is untouched), each
   * over `cardSpan` px, `cardStagger` px apart; the hint/progress row comes with the last card.
   */
  projects: {
    headSpan: 120,
    cardSpan: 140,
    cardStagger: 90,
  },

  /**
   * Top bar Story pill: a glass reflection sweeps across it (CSS, transform only; global.css
   * `story-sheen` — its keyframe stops mirror these, checked by storySheen.test.ts). Held
   * off-pill until `holdUntil` of the cycle, sweeping across by `sweepEnd`, then held. Off
   * with reduced motion.
   */
  storySheen: { cycleS: 3.2, holdUntil: 0.45, sweepEnd: 0.75 },

  /** Timeline sun nodes "set" onto the line as each item scrolls in (scrubbed, like `reveal`). */
  sunNodes: {
    /** Starting offset above the line (px) and scale. */
    fromY: -22,
    fromScale: 0.55,
    ease: [0.22, 1, 0.36, 1] as const,
    from: 0.86,
    to: 0.64,
    /** Experience item text: rises this far (px) while fading in with its node. */
    contentRise: 18,
  },

  /**
   * Experience timeline path: with motion, the line rests dimmed and a lit copy follows
   * the scroll down it (and back up), 1:1 with the page: its leading edge sits at `front`
   * × vh, so it reaches each sun node just as the node finishes entering (sunNodes.to).
   * The edge is a soft `fade`-px tail into the dimmed line, not a hard cut.
   */
  timeline: {
    /** Opacity of the resting (unlit) line. */
    dim: 0.22,
    /** Viewport fraction (from the top) where the lit edge sits. Lower value = the colour lags further behind. */
    front: 0.64,
    /** Length (px) of the soft tail from full colour to the dimmed line. */
    fade: 180,
    /**
     * Then the section's closing horizon line draws out from its centre over this much
     * scroll (px), starting as soon as the last item has fully entered.
     */
    closingDraw: 160,
  },

  /**
   * Skills: the boxes enter one after another (the `reveal` rise + fade), scrubbed.
   * - Pinned (≥ pinMinWidth, motion allowed, and the block fits under the top bar): the
   *   section's stage sticks (centred below the top bar) for `count × perBox + endHold` px
   *   of scroll. The sequence starts `leadIn` × vh before the pin engages (the first box is
   *   already rising as the stage arrives) and the last box is fully in `endHold` px before
   *   the release. Anchor jumps land on that finished state.
   * - Unpinned (below pinMinWidth, or a block too tall for the viewport): no pin; each box enters over
   *   its own position with the `reveal` window, boxes in the same row `rowStagger` px apart.
   * `perBox`, `endHold` and `fitMargin` are mirrored in global.css (pre-hydration pin; sequence.test.ts).
   */
  sequence: {
    /** Scroll px of pin per box. */
    perBox: 130,
    /** Scroll px the finished block stays pinned before release. */
    endHold: 180,
    /**
     * The sequence starts this far (fraction of vh) before the stage pins, so the first box
     * is already rising as the heading comes up through the lower part of the viewport.
     */
    leadIn: 0.5,
    /** How much consecutive boxes overlap (0 = strictly one after another, 0.5 = next starts halfway). */
    overlap: 0.45,
    /**
     * The section heading ([data-seq-head]) is the sequence's first step: it fades/rises in
     * over this much scroll (px) once the line closing the previous section has drawn; the
     * boxes start after it.
     */
    headSpan: 110,
    /**
     * Pin only at this width and up: where all five Skills cards fit one row. Below it
     * (md–1279) the Skills rail pins and slides instead (motion.skillsRail) and the
     * sequence scrubs unpinned.
     */
    pinMinWidth: 1280,
    /** The pinned stage must fit the viewport below the top bar minus this margin (px). */
    fitMargin: 24,
    /** Unpinned: extra scroll (px) between boxes that share a row. */
    rowStagger: 36,
    /**
     * Unpinned: boxes already in view on load, or when an anchor jump lands on the section,
     * show fully in. Scrolling back up from there eases them back onto the normal scrub
     * over this many px (fraction of vh).
     */
    settleSpan: 0.24,
  },

  /**
   * Hero parallax: translateY = factor × scrollY (px), clamped to ±maxShift. A pure
   * function of scrollY, so scrolling back up reverses it exactly.
   * Positive factor = lags the page (moves down relative to it), negative = leads.
   */
  parallax: {
    /** md and up: the photo (+ its glow) lags a touch, sinking into its faded lower edge. */
    wide: { photo: 0.03, maxShift: 56 },
    /** Phones: the same, gentler (she sits under the proof strip, above the next section). */
    phone: { photo: 0.02, maxShift: 36 },
  },

  /** Ribbon text drift along its path. */
  ribbons: {
    /** Base drift speed (path units per second). */
    driftSpeed: 26,
    /** Extra speed per px/s of scroll velocity (multiplier added to 1). */
    scrollBoost: 0.0012,
    /** Cap on the scroll boost multiplier. */
    maxBoost: 0.8,
    /** Speed multiplier while the cursor is over the ribbon (fine pointers only). */
    hoverSlowdown: 0.2,
    /** Time constant (s) for easing into/out of the hover speed. */
    hoverEaseS: 0.35,
    /** Extra px around the stroke that still counts as "over" the ribbon. */
    hoverSlop: 6,
  },

  /** Background: light pools drift + time-of-day overlays. */
  lights: {
    /** Pool drift amplitude (px at desktop; halved with the pools on small screens). */
    driftAmplitude: 70,
    /** Pool scale "breathing" at the far end of the drift. */
    driftScale: 1.08,
    /** One drift leg (s); each pool varies from this so they never sync up. */
    driftDurationS: 26,
    /** Max opacity of the late-night overlay (peaks at Projects). */
    nightMax: 1,
    /** Max opacity of the sunrise overlay (peaks at Contact). */
    dawnMax: 1,
  },

  /** Custom cursor (fine pointers only, never with reduced motion). */
  cursor: {
    /** Follow lag time constant (s); larger = lazier. */
    lagS: 0.09,
    /** Orb diameter (px). */
    size: 26,
    /** Padding (px) of the glowing pill around a hovered link/button's box. */
    pillPadding: 5,
    /** Morph/fade duration (ms) between orb and pill. */
    morphMs: 220,
    /** Elements the pill wraps. */
    targets: 'a[href], button:not(:disabled), [role="button"], summary',
    /** Elements that keep the plain native pointer (no orb, no pill), e.g. the K logo, as on the Story. */
    plain: '[data-cursor-plain]',
    /** Hide the native pointer over targets (the pill marks the hit area). Text and inputs keep it. */
    hideNativeOverTargets: true,
    /** Width (px) of the light that runs along a panel's top edge. */
    panelLightWidth: 280,
  },

  /** Project cards hover tilt and gloss. */
  projectCard: {
    maxTiltDeg: 3.5,
    perspectivePx: 1100,
    /** Tilt settle transition (ms) when the cursor leaves. */
    settleMs: 450,
    /** Gloss sweep duration (ms). */
    glossMs: 900,
  },

  /**
   * Pinned project rail (lg+, motion allowed). The pinned section is `100vh + slide +
   * endHold` tall and the stage sticks vertically centred, so the scroll is: a hold while
   * the stage settles to centre (half the free viewport height), the slide (scrollPerPx ×
   * travel, from the section top), then a hold with the last card on the gutter (half the
   * free height + endHold) before the stage releases. `scrollPerPx` and `endHold` are
   * mirrored in global.css (pre-hydration pin height); rail.test.ts keeps them in sync.
   */
  rail: {
    /** The cards (keyboard focus inside an off-screen one scrolls it into view). */
    cardSelector: '[data-project-rail] > li',
    /** Pins from lg (below: a snap row with prev/next, or the phone swipe row). */
    pinMinWidth: 1024,
    /** Vertical scroll px per px of horizontal travel while pinned. */
    scrollPerPx: 1.3,
    /** Extra scroll (px) the finished rail stays pinned, last card on the gutter, before release. */
    endHold: 64,
    /**
     * Below this much horizontal travel (px, at the design card widths) the rail
     * doesn't pin; the cards flex to fit between the gutters instead.
     */
    minTravel: 260, // ↔ the 2117px fitted-row breakpoint in Projects.tsx + global.css (2376 − 2117 < 260)
    /** Viewport height the pinned block must fit into, minus this margin (px). */
    fitMargin: 24,
  },

  /**
   * Skills rail: the same scroll-driven slide as the Projects rail (useRail), wherever the
   * five cards don't fit between the gutters (md up to 1279px: 5 × 248 + 4 × 16 + 2 gutters
   * > the viewport). The stage sticks centred below the top bar; the cards have already
   * entered (the reveal sequence, unpinned there) by the time it pins. Where all five fit
   * (≥ 1280px) nothing slides (`fit`) and the reveal sequence pins instead. Phones: a swipe
   * row. `scrollPerPx`, `endHold` and `pinMinWidth` are mirrored in global.css ("Skills
   * rail pin", pre-hydration); rail.test.ts keeps them in sync.
   */
  skillsRail: {
    cardSelector: '[data-skills-rail] > li',
    /** Pins from md (the stage is short enough to pin on tablets too). */
    pinMinWidth: 768,
    /** Vertical scroll px per px of horizontal travel while pinned. */
    scrollPerPx: 1.3,
    /** Extra scroll (px) the finished rail stays pinned, last card on the gutter, before release. */
    endHold: 64,
    /** Any overflow slides (the cards otherwise grow to share the row). */
    minTravel: 1,
    /** The stage must fit the viewport below the top bar minus this margin (px). */
    fitMargin: 24,
  },

  /** Project details dialog: a short fade + rise in, fade + sink out (backdrop fades with it). */
  dialog: {
    durationMs: 180,
    /** How far below its resting place the sheet starts / ends (px). */
    rise: 10,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },

  /** Nav scroll-spy: a section is "current" once its top passes this fraction of the viewport. */
  scrollSpy: { line: 0.4 },

  /** /story: see storyConfig.ts. */
  story: storyMotion,
} as const;

export type MotionConfig = typeof motion;
