/**
 * /story — "The long way to morning". Everything is scroll-linked (no timers),
 * so it pauses when the page doesn't move. Progress values are 0→1.
 * Part of the motion config: config.ts mounts this as `motion.story`, which is how
 * everything reads it. It has its own file only for size.
 */
export const storyMotion = {
  stage: {
    /**
     * Sky crossfade between two consecutive scenes with different skies: runs
     * while the incoming scene's top travels from `from` to `to` (fractions of the
     * viewport height, measured from the top).
     */
    skyBlend: { from: 1.0, to: 0.35 },
    /**
     * Depth: the stars (far sky) drift up by this many px over the whole story while
     * the horizon and sun stay put and the scenes scroll at full speed.
     */
    starsDepth: 180,
  },
  /**
   * The sun tells the story's progress (StoryStage's one sun; useStoryStage drives it).
   * `chapters[n]` is the sun's state at chapter n's ANCHOR:
   *   h  height: −1 sunk below the horizon · 0 a half-sun on the horizon · 1 fully risen
   *      (how far that is on screen: tokens.css --story-sun-sink / --story-sun-rise, per breakpoint)
   *   b  brightness 0 (dull, dim) → 1 (radiant): the disc, its halo, glow and the horizon flare
   * Anchors: the prologue at the top of the page, the last chapter at the bottom, every
   * other chapter `anchor` of the way through its pin (`anchors` per chapter; a chapter that
   * doesn't pin, ch 8: where its scene is centred in the viewport). Between anchors the sun
   * follows a monotone cubic through ALL the scroll (gaps and pins alike: C1, no overshoot, no
   * flat holds), so it moves whenever the page does — slower through a quiet stretch, faster
   * through a turning point — and the sky crossfades on the same timeline. Everything on the
   * stage follows the smoothed scroll (`smoothing`). Reduced motion / no JS: the current
   * chapter's state, static (StoryStage; no JS = the prologue).
   */
  sun: {
    chapters: [
      { h: 0, b: 0.6 }, // 0  prologue: the half-sun, warm dusk
      { h: -0.03, b: 0.5 }, // 1  never knew why: quiet (the faintest dip, so the sun never stands still)
      { h: 0.1, b: 0.65 }, // 2  always starting something
      { h: 0.15, b: 0.7 }, // 3  a door into CS
      { h: 0.05, b: 0.5 }, // 4  maybe not for me (then 99)
      { h: 0.25, b: 0.8 }, // 5  I loved it
      { h: 0.3, b: 0.82 }, // 6  start before you're ready: holds (a touch brighter)
      { h: -0.35, b: 0.3 }, // 7  the door won't open: sinks, dark
      { h: -0.3, b: 0.38 }, // 8  teaching while waiting: a faint, steady glow (still low)
      { h: 0, b: 0.75 }, // 9  a door opened: lights up
      { h: 0.2, b: 0.8 }, // 10 six days: starts rising
      { h: 0.5, b: 0.9 }, // 11 finally a software engineer
      { h: 0.55, b: 0.95 }, // 12 600+ failures fixed: high and bright
      { h: 0.05, b: 0.5 }, // 13 layoffs: drops
      { h: -0.1, b: 0.4 }, // 14 the detour: lower, dimmer
      { h: 0.05, b: 0.55 }, // 15 engineering the workflow: slight recovery
      { h: -0.4, b: 0.25 }, // 16 three days left: the lowest point
      { h: 0.9, b: 0.97 }, // 17 the sunrise (up, as its pin ends)
      { h: 1, b: 1 }, // 18 fully up and radiant, at the very end (it keeps climbing a little through ch 18)
    ] as ReadonlyArray<{ readonly h: number; readonly b: number }>,
    /** Where in its pin a chapter's keyframe sits (default)… */
    anchor: 0.5,
    /**
     * …and per chapter: ch 9 lights up with the door; ch 16 holds its low late (the news comes
     * at the end); ch 17 is up as the door stands open, just before its pin releases.
     */
    anchors: { 'chapter-9': 0.26, 'chapter-16': 0.8, 'chapter-17': 0.92 } as Record<string, number>,
    /**
     * Extra keyframes inside a chapter's pin (`at` of its progress), to shape the pace between
     * two anchors: ch 17 stays low (barely lifting since ch 16) until its door is open, then
     * the sunrise is the fast, dramatic climb to its anchor.
     */
    knots: [{ chapter: 17, at: 0.5, h: -0.28, b: 0.38 }] as ReadonlyArray<{ chapter: number; at: number; h: number; b: number }>,
  },
  /**
   * Scroll smoothing for everything scroll-scrubbed on /story (the scene timelines, the sun and
   * the sky): the displayed scroll position eases toward the real one, critically damped
   * (exponential, time constant `tauMs`), every frame until it is within `settlePx`, then snaps
   * exactly onto it and the frame loop stops. Jumps of more than `jumpVh` × vh (deep links, the
   * chapter index) snap at once. The page itself scrolls natively: nothing waits on this.
   */
  smoothing: { tauMs: 160, settlePx: 0.5, jumpVh: 1.5 },
  /** Generic scene entry: header, lines and controls rise into place. */
  enter: {
    rise: 18,
    /** An element is fully in once its top is this far above the viewport bottom (fraction of vh). */
    span: 0.32,
    /** Extra delay per successive element (fraction of vh). */
    stagger: 0.035,
  },
  /**
   * Every chapter with an animation pins while it plays (motion allowed, every width): the
   * scene sticks once it is framed, its pin progress (0→1) scrubs the animation, and it
   * releases after a short hold. Reduced motion and no JS: no pins.
   */
  pin: {
    /**
     * Pin length (scroll distance while stuck) as a multiple of the viewport height, per
     * chapter: quiet ones short, the major beats (3, 6, 12, 17) long. No entry = no pin.
     * Chapters with a quote (scene.quote) are longer by about the quote's share (`quote`
     * below), so their art keeps its scroll distance.
     */
    length: {
      'chapter-1': 0.8,
      'chapter-2': 1.72,
      'chapter-3': 1.6,
      'chapter-4': 1.93,
      'chapter-5': 2.35,
      'chapter-6': 2.6,
      'chapter-7': 1.7,
      'chapter-8': 1.85,
      'chapter-9': 1.72,
      'chapter-10': 1.8,
      'chapter-11': 1.3,
      'chapter-12': 1.25,
      'chapter-13': 1.5,
      'chapter-14': 1.4,
      'chapter-15': 1.81,
      'chapter-16': 2.1,
      'chapter-17': 2.3,
      'chapter-18': 1.8,
    } as Record<string, number>,
    /**
     * Where the animation plays within the pin (fractions of its progress) for chapters that
     * take one 0→1 timeline (the illustrations, ch 4, ch 5): it is at its start as the pin
     * engages and complete by `play[1]`; the rest is the hold before release. ch 3, 6, 12 and 17
     * lay out their own timelines over the whole pin (below).
     */
    play: [0.03, 0.84] as const,
    /**
     * The pinned block is placed centred in the viewport, then moved so its CORE — the
     * heading, the art and (ch 3) the quote — stays inside the safe area: below the fixed
     * header (its height minus `headerOverlap`, the transparent end of its fade) and above
     * the progress rail (its height minus `footerOverlap`), `margin` inside both — and, where
     * the sun shares its columns (phones, tablets), `sun` px above the sun at the heights it
     * reaches in that chapter (motion.story.sun). If the core
     * is taller than that (phones), the art scales down (from its top, never below
     * `minArtScale`) and what follows it in the core moves up to close the gap; if it still
     * doesn't fit, the animated parts win and the heading may sit above the frame.
     */
    safe: { headerOverlap: 24, footerOverlap: 30, margin: 8, sun: 18, headerGap: 6 },
    /**
     * Portrait phones (narrower than `below`, taller than wide): instead of centring, a pinned
     * block is placed so its topmost label (the act marker, else the chapter label) sits
     * `labelTop` of the viewport height from the top (ch 9's spacing at 390×844: 131px) —
     * independent of the header's height. If the core doesn't fit there (the limits above),
     * the block may sit up to `maxRise` px higher, and the art may shrink down to
     * `minArtScale`; past that the usual fit applies. The quote also stays `horizonAir` px
     * above the horizon line (the water), never on it. Whatever the fit, the block's
     * top never sits above `minLabelTop` px (where the old, taller header's safe area began),
     * or `minLabelTopVh` of the viewport height on short phones.
     * `keepArt`: chapters whose phone art size is set in CSS (global.css) — they never shrink it
     * to sit lower; they sit as low as they fit at that size.
     */
    phone: {
      below: 768,
      labelTop: 0.155,
      minLabelTop: 90,
      minLabelTopVh: 0.12,
      maxRise: 20,
      minArtScale: 0.7,
      horizonAir: 20,
      /** More air for a quote on the sunrise glow (ch 17: its gradient washes out near the sun). */
      horizonAirFor: { 'chapter-17': 40 } as Record<string, number>,
      /** Chapters whose whole quote clears the sun once any line shares its columns (ch 15's last lines end just left of it). */
      quoteBlockSun: ['chapter-15'] as readonly string[],
      keepArt: ['chapter-2', 'chapter-6', 'chapter-7', 'chapter-10', 'chapter-12', 'chapter-14', 'chapter-15'] as readonly string[],
    },
    minArtScale: 0.55,
    /** Short screens: the art may go this small to keep the heading in the frame. */
    minArtScaleShort: 0.4,
    /** …a little smaller, but only to keep the art clear of the sun (before letting it pass over the sun's path). */
    minArtScaleTight: 0.36,
    /** The smallest screens (landscape phones), when even the art alone doesn't fit otherwise. */
    minArtScaleLast: 0.3,
    /**
     * Chapters that never pin without their heading and words (ch 18: the closing line and the
     * ending links): any scene art shrinks as far as it must, and below `dropBelow` it is dropped
     * (ch 18 has none: its boat is on the stage).
     */
    keepHeading: ['chapter-18'] as readonly string[],
    dropBelow: 0.15,
    /** Art-only pins: the words above the frame fade out over this many px as they pass under the header. */
    wordsFade: 40,
  },
  /**
   * ch 3 timeline (fractions of the pin progress): the board is written by hand in
   * `write`, then the quote lands (`quote0`, `quote1`), then it holds until the pin releases.
   */
  /**
   * The chapters' typographic beats (scene.quote; ch 3's is timed by `board` below). Each lands
   * like ch 3's, at the end of its chapter's pin: the art finishes, then after `gapVh` the lines
   * rise in one after another over `linesVh`, and the finished quote holds for `holdVh` before
   * the pin releases (scroll distances × vh). The art's timeline is compressed to end before
   * the quote (`pin.play` ends there; whole-pin timelines like ch 6's scale into it). ch 17
   * keeps its own pacing (its door and sunrise are timed to the pin): its quote lands in
   * `windows` instead, as the sun comes up.
   */
  quote: {
    gapVh: 0.03,
    linesVh: 0.3,
    /** A long hold: a couple of wheel scrolls to stay with the finished quote before moving on. */
    holdVh: 0.5,
    rise: 22,
    windows: { 'chapter-17': [0.58, 0.78] } as Record<string, readonly [number, number]>,
  },
  board: {
    // Pin 1.6 vh: writing ≈ 0.70 vh of scroll, quote lines ≈ 0.13 / 0.15 vh, hold ≈ 0.56 vh.
    write: [0.025, 0.464] as const,
    quote0: [0.477, 0.557] as const,
    quote1: [0.557, 0.65] as const,
    /** 0.65 → 1 holds the finished quote before the pin releases (a couple of wheel scrolls). */
    quoteRise: 22,
    /**
     * Pacing, in units of the total drawing time (all strokes together = 1; each stroke
     * takes its `data-stroke-weight`, each part its share of the stroke). Pauses are where
     * the chalk is off the board, travelling to the next start: `lead` from the hover to
     * the first stroke, `stroke` between strokes, `lift` across a pen-lift inside a word,
     * `fragment` before each new piece of writing, `end` to the rest position once the
     * board is written. Kept short: about 3/4 of the window is spent drawing.
     */
    pace: { lead: 0.025, stroke: 0.01, lift: 0.003, fragment: 0.035, end: 0.025 },
    /** How far the chalk lifts (× boardData's CHALK_LIFT) between strokes and across a pen-lift inside a word. */
    lift: { stroke: 1, word: 0.45 },
    /** Chalk glow opacity while drawing and while lifted. */
    glow: { drawing: 1, lifted: 0.35 },
  },
  /**
   * ch 12 timeline (fractions of the pin progress): failing → being fixed → passing.
   * Nothing dims as it resolves: passing dots and the healed line are lit green.
   */
  field: {
    /** Dots flip to green across this window, suite by suite (fieldData's flip order; stubborn ones last). */
    flip: [0.06, 0.74] as const,
    /** Blend of linear and ease-in-out for the flip and the healing: 0 = linear (steady fixing), 1 = slow start and finish. */
    flipEase: 0.35,
    /** How many of the latest flips bloom (the batch that just passed), as a fraction of all dots. */
    fresh: 0.035,
    /** The CI line heals left → right (jagged pink → steady green), in step with the fixes. */
    steady: [0.06, 0.76] as const,
    /** Payoff: a pale green light sweeps the field once everything passes (peak opacity)… */
    sweep: [0.76, 0.9] as const,
    sweepOpacity: 0.45,
    /** …and a "green build" glint runs along the healed line once. Then a calm, lit hold. */
    pulse: [0.8, 0.94] as const,
    /** Redraw the dots only in steps this fine (≈ how many field updates in total). */
    steps: 120,
  },
  /**
   * ch 4: the whole route to 99 draws while the chapter is pinned (progress t: `pin.play`):
   * - `route`: the drawing head travels the route at a constant pace (along the
   *   chapter's "along" axis): the lead, then both alternatives a/b side by side
   *   (b dash-drawn, the dotted a revealed by a soft-edged mask window following the
   *   head), then the settled line into the 99;
   * - `figure`: the 99 glows in, only at the very end.
   * Nothing dims as it completes: the finished state is the fully drawn route.
   */
  waver: {
    route: [0, 0.86] as const,
    figure: [0.86, 1] as const,
    /** Soft edge of the dotted alternative's reveal window (route units; the route is 470 long). */
    revealSoft: 36,
  },
  /**
   * ch 5: the CPU assembles while the chapter is pinned (progress t: `pin.play`). Within t:
   * - parts arrive in `data-cpu-order`, each over `partSpan`, starts spread across
   *   `parts` (so neighbours overlap): they translate in from their offset with their small
   *   rotation, ease into the seat with a slight `overshoot` (fraction of the offset), and
   *   fade up over the first `fadeIn` of their own span (opacity only assists);
   * - the slot guide under each part (drawn in --cpu-line while motion runs, so it can
   *   brighten past its static dim tone; values are that colour's opacity) waits at
   *   `slot.waiting` (≈ the static dim guide), brightens to `slot.peak` as its part seats
   *   (`slot.flash`, part-local) — the "seat" moment — then fades over `slot.fade` (t) to
   *   `slot.seated`;
   * - each bus draws over `busSpan` as soon as both parts it joins are seated;
   * - the signals come alive (a small pop) across `signals`.
   */
  cpu: {
    parts: [0, 0.7] as const,
    partSpan: 0.24,
    overshoot: 0.06,
    fadeIn: 0.35,
    slot: { waiting: 0.26, peak: 0.9, flash: [0.5, 1] as const, seated: 0.22, fade: 0.16 },
    busSpan: 0.1,
    signals: [0.84, 1] as const,
    signalPop: 0.5,
  },
  /**
   * ch 6: the chess exchange (pinned). `play` is the window of the pin progress for the four moves; the rest
   * holds the synced position. Each move gets an equal slot; within it (move-local):
   * `lift` the mover's piece lifts, `travel` it crosses to its square and lands,
   * `pulse` the pulse runs the thread (the hub glows as it passes), `receive` the
   * mirrored piece moves on the other board. The thread brightens from `thread.dim`
   * to 1 (glow: `thread.glowDim` → its resting 0.35) as the exchange runs.
   */
  chess: {
    play: [0.04, 0.88] as const,
    lift: [0, 0.1] as const,
    travel: [0.05, 0.3] as const,
    /** The thread is short (≈140 units on desktop): the pulse gets half of each move's slot. */
    pulse: [0.26, 0.78] as const,
    receive: [0.72, 0.97] as const,
    /** Piece lift while it's up (scale), and a small rise (board-local units). */
    liftScale: 0.2,
    liftRise: 2,
    /** The pulse's tail follows its heading; its opacity relative to the pulse. */
    tail: 0.85,
    /** The hub swells (scale) and its outer ring brightens (stroke opacity 0.3 → `ring`) as a pulse passes (within `width` of the middle, in thread fractions). */
    hubGlow: { scale: 0.09, ring: 0.95, width: 0.3 },
    thread: { dim: 0.35, glowDim: 0.08 },
    /**
     * Lane art (desktop, where the boards sit beside the text): while the scene scrolls in,
     * the art rises toward its pinned pose — offset −lift·(1 − e^(−d/lift)) for d px still
     * to go — so it enters close to where it pins and comes to rest exactly as the pin
     * engages. Not where the art sits in the flow under the lines (it would ride over them).
     */
    entryLift: 120,
  },
  /**
   * The chapter illustrations (S4). Each plays while its chapter is pinned (progress t over
   * `pin.play`), so it is at its start as the pin engages, finishes before the release and
   * reverses exactly. Every range below is a fraction of t. The finished state is the markup (what
   * no-JS and reduced motion show), except ch 16, whose closed trunk reduced motion applies.
   */
  illus: {
    /** ch 1 (quiet): the five glows appear one by one, each switching on its spotlight on the girl. */
    spark: {
      glows: [0.04, 0.86] as const,
      /** Each glow's own fade (t). */
      glowSpan: 0.28,
      /** A glow grows from this scale as it appears. */
      fromScale: 0.82,
      /** A glow's spotlight fades on this much (t) after the glow starts. */
      beamDelay: 0.06,
      /** Where their light meets (round her and on the pedestal) and her lit side: brighten with the glows (the pool's opacity 0.5 at the end). */
      pool: [0.3, 1] as const,
      /** Her lit side's opacity before any light reaches her. */
      litFrom: 0,
    },
    /** ch 2: the curtains part, the spotlight switches on, the spark lands in the light. */
    stage: {
      /** Curtains drawn across the opening at t 0 (horizontal scale from their outer edges), gathered back by the end. */
      curtains: [0, 0.36] as const,
      closedScale: 2.1,
      /** The lamp and its cone and pool fade up. */
      spot: [0.4, 0.56] as const,
      /** The spark drops into the light (px, art units) and settles, its glow blooming. */
      spark: [0.6, 0.82] as const,
      sparkDrop: 34,
      overshoot: 0.08,
      bloomFrom: 0.35,
      /** The sound marks: a small rise and fade, last. */
      marks: [0.84, 1] as const,
      markRise: 6,
    },
    /** ch 7: the applications fly in from the upper left and land on the pile one by one (their path is never drawn); the certificate lands last. */
    applications: {
      /**
       * Each sheet's flight takes `sheetSpan`; starts spread across `sheets`, bottom course first.
       * It reaches the door's foot at `land` of its span, then settles into its place on the pile.
       * Far off it is `farScale` of its size and `farOpacity` opaque; it sheds `tumble` degrees of turn.
       */
      sheets: [0, 0.8] as const,
      sheetSpan: 0.3,
      land: 0.8,
      farScale: 0.5,
      farOpacity: 0.5,
      tumble: 22,
      /** How far (art units) each sheet's own line strays above or below the shared path mid-flight. */
      scatter: 10,
      cert: [0.8, 1] as const,
      certDrop: 24,
      certTurn: -14,
    },
    /**
     * ch 8: the builds come together in turn. The robot's four parts (wheels, body, antenna) drop into place
     * (`pieceDrop` art units, a small `overshoot`) and its eyes light; then the board and breadboard settle, two wires draw,
     * the LED lights; then the house's outline appears and the house rises out of it.
     */
    workbench: {
      pieces: [0.02, 0.3] as const,
      pieceSpan: 0.12,
      pieceDrop: 22,
      overshoot: 0.08,
      robotEyes: [0.3, 0.38] as const,
      board: [0.36, 0.44] as const,
      /** The breadboard and its (unlit) LED settle just after the board, before the wires. */
      ledPart: [0.4, 0.47] as const,
      boardDrop: 10,
      wires: [0.42, 0.6] as const,
      wireSpan: 0.12,
      led: [0.58, 0.68] as const,
      outline: [0.64, 0.72] as const,
      rise: [0.7, 0.92] as const,
      shapePool: [0.86, 0.96] as const,
    },
    /** ch 9: one after another (a `pickSpan` each, spread over `picks`), a few people in the crowd light up. */
    crowd: {
      picks: [0.06, 0.94] as const,
      pickSpan: 0.3,
    },
    /** ch 10: day 1–5 layers seat one by one (bottom up), each layer's check ticking in with it as day 6's rail draws up beside them. */
    days: {
      /** Each layer seats over `layerSpan`; starts spread across `layers` (bottom up). */
      layers: [0, 0.82] as const,
      layerSpan: 0.22,
      overshoot: 0.05,
      fadeIn: 0.35,
      /** Each layer's check ticks in with it: over the last `checkFrom`…1 of that layer's span. */
      checkFrom: 0.55,
      /** Day 6's rail draws up alongside the layers (reaching each check as it ticks). */
      rail: [0.08, 0.82] as const,
    },
    /** ch 11: the sign comes on, rooms light floor by floor (bottom up), hers last and brightest, then the date. */
    windowLit: {
      sign: [0, 0.14] as const,
      floors: [0.16, 0.6] as const,
      floorSpan: 0.14,
      kept: [0.62, 0.78] as const,
      date: [0.82, 1] as const,
      dateRise: 8,
    },
    /** ch 13: the sign flickers off, then the rooms go dark one by one (the fading ones last); hers stays lit. */
    windowsDark: {
      sign: [0, 0.22] as const,
      /** Sign opacity keys across `sign`: on, a flicker, off. */
      flicker: [1, 0.25, 0.85, 0.1, 0.55, 0] as readonly number[],
      rooms: [0.26, 1] as const,
      roomSpan: 0.12,
    },
    /**
     * ch 14 (restrained): the road draws to the horizon over [0, split] of t, then the lit
     * bend peels off.
     */
    fork: {
      split: 0.45,
      /** Within the road half: surface + edges + dashes reveal toward the horizon (soft edge, art units). */
      soft: 34,
      /** Within the bend half: the branch surface reveals, and its lit centre line draws (slightly behind). */
      branch: [0, 0.85] as const,
      bend: [0.12, 1] as const,
    },
    /** ch 15: per lane, a task travels in along its strand into the hub (a small pulse), and done tasks come out. */
    hub: {
      lanes: [0.04, 0.96] as const,
      /** One lane's beat (t): travel in, then the done tasks emerge. */
      beat: 0.34,
      travel: [0, 0.55] as const,
      emerge: [0.5, 1] as const,
      pulse: { scale: 0.06, ring: 0.8, width: 0.2 },
      /** A travelling task is drawn larger (and filled) than the queued ones. */
      travellerScale: 1.45,
    },
    /** ch 16 (quiet, tense): the box settles, the lid closes about its hinge, the tail lights come on, the days fade. */
    trunk: {
      box: [0, 0.2] as const,
      boxDrop: 16,
      lid: [0.24, 0.56] as const,
      /** The closed lid: its vertical scale about the hinge line (negative = folded down over the opening). */
      lidClosed: -0.74,
      /** How much the box shows through the closed lid. */
      boxBehindLid: 0.12,
      lights: [0.6, 0.74] as const,
      /** Day markers start bright and fade to their resting tones, one by one (the last day first). */
      days: [0.78, 1] as const,
    },
  },
  /**
   * Ch 18's paper boat on the stage's sea (StoryStage [data-story-boat]; useStoryStage drives it).
   * It only shows during ch 18: it fades in as the chapter's top comes up the viewport, from
   * `appear[0]` to `appear[1]` × vh from the top. It rests near the viewer (`nearDx` × vw left of
   * where it ends, tokens.css --story-boat-depth of the way down the water) and, from the moment the chapter's top
   * reaches `driftFrom` × vh until the very end of the page, drifts slowly out to its far resting
   * place (tokens.css --story-boat-x, on the horizon, --story-boat-far-scale), with a gentle
   * `rock` (deg) as it's nudged off and a `bob` (deg) on the way.
   */
  boat: {
    appear: [0.7, 0.45] as const,
    nearDx: -0.2,
    driftFrom: 0.5,
    rock: 5,
    bob: 2.5,
  },
  /**
   * ch 17, the climax (pinned; `motion.story.pin.length`). Fractions of the pin progress:
   * - the plain wall is there from the start (its bricks settle `settle` px over `bricks`);
   * - `draw`: the construction lines and the outlined bricks around the opening draw (soft-edged
   *   reveals) and the casing's outline dash-draws (`outline`); the door (casing and closed
   *   leaf) doesn't exist until `appear`, as the drawing completes;
   * - `door`: then it swings from closed to fully open; `light`: its glow and spill come up;
   * - the sunrise: the stage's sun climbs from its lowest point (ch 16) to up, as the door
   *   stands open (motion.story.sun, anchored late in this pin), the sky warming with it.
   */
  doorway: {
    draw: [0, 0.3] as const,
    bricks: [0.02, 0.26] as const,
    settle: 5,
    outline: [0.04, 0.28] as const,
    /** The door (casing and closed leaf) appears as the drawing completes… */
    appear: [0.22, 0.34] as const,
    /** …then opens. */
    door: [0.36, 0.56] as const,
    light: [0.4, 0.6] as const,
  },
  /**
   * "Explore the story" journal page: on open the scrim fades in and the card (sheet
   * below lg) rises + fades in; prev / next crossfades the page body. Reduced motion:
   * opacity only, no rise (global.css).
   */
  journal: {
    durationMs: 320,
    /** How far below its resting place the card starts (px). */
    rise: 16,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    crossfadeMs: 220,
    /**
     * Prev / next moves the page behind to the chapter's finished state, as late in its hold as
     * keeps the next scene out of the frame: this many px of margin (lane art can rise a
     * little above its scene).
     */
    nextClearance: 24,
  },
  /** Portfolio ↔ Story transition (View Transitions; cross-fade elsewhere). */
  transition: {
    /** Orb expand / contract. */
    orbMs: 900,
    /** Page cross-fade (runs under the orb; also the fallback). */
    fadeMs: 520,
    /** Fallback cross-fade (no View Transitions): dip to dusk and back. */
    fallbackMs: 260,
  },
} as const;
