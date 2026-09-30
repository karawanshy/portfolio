/**
 * Hero geometry — the one place to tune the hero composition (numbers in px).
 *
 * One hero holds the intro (name, about paragraph, CTAs, proof strip), the
 * portrait on its sunrise glow and the closing horizon line. Layouts switch in CSS only
 * (.hero-* in global.css); there is ONE portrait element at every width.
 *
 * - Desktop (≥1024): the intro sits left; the portrait stands free on the right. It's
 *   anchored to the group's right edge and to the intro's top (its box starts
 *   `headTop` × her height above it, so the top of her head is level with the name); the hero reserves
 *   room for her full height, so the space under the proof strip is breathing room she
 *   fades into. Her width scales from `minWidth` at 1024 to `width` at 1440 and up, and the
 *   intro column narrows to stay `textGap` clear of her. On wide screens intro + portrait
 *   stay one group (intro.maxWidth + `groupGap` + portrait), centred, instead of
 *   drifting apart to the gutters.
 * - Tablet (768–1023): stacked. Intro → portrait (centred, `gapAbove` below the intro).
 * - Phone (<768): "Karawan" and the paragraph in the left column
 *   with the portrait beside them on the right (the paragraph wraps into more lines to fit);
 *   then the CTAs and the proof strip at full width. The name keeps its size: the portrait
 *   column takes what's left beside it (at most `width`), `gap` px from the text.
 * - Every layout: her lower `fade` px fade out (alpha mask on the img), fully transparent at
 *   the box bottom, so the photo's cut-off edge never shows (also while the parallax,
 *   motion.parallax, drifts her down: the hero's bottom padding + `horizonGap` stay larger
 *   than the drift).
 *
 * Key knobs:
 * - name size ........ tokens.css --hero-name-min/max (+ --ls-hero-name, --lh-hero-name)
 * - proof strip ...... proof.primarySize / secondarySize / captionSize / divider
 * - intro ............ introTop (below the top bar; desktop: see `desktopBand`) · intro.maxWidth / bodyMaxWidth · intro gaps · proofGap
 * - desktop vertical . desktopBand.room (min space above the content) · desktopBand.lift (optical centre)
 * - portrait ......... photo.<layout>.width / headTop / gapAbove / gap / fade
 * - wide-screen group  photo.desktop.groupGap (intro column → portrait)
 * - closing line ..... horizonGap (portrait / intro → horizon line)
 * - glow ............. glow.size (× photo width) · glow.centreY (fraction of photo height);
 *                      look: tokens.css --gradient-hero-glow
 */
export const heroGeometry = {
  /** Intro top: px below the fixed top bar. */
  introTop: { phone: 28, tablet: 48 },
  /**
   * Desktop (≥1024): the content block (name → proof strip) is centred in the band
   * between the top bar and the horizon line, `lift` px above the geometric centre (optical
   * centre: a little more room below than above). `room` is the minimum space above it
   * (and below it: room + 2 × lift) when the viewport is short. Scales with the viewport
   * height (the hero is at least one screen tall).
   */
  desktopBand: { room: 24, lift: 30 },
  intro: {
    /** Desktop intro column (it also narrows to stay clear of the portrait). */
    maxWidth: 720,
    /** The about paragraph's measure. */
    bodyMaxWidth: 700,
    /** Row gap (name → paragraph → CTA row): phone, md+. */
    gap: { phone: 16, wide: 24 },
    /** Extra space above the proof strip (on top of the row gap): phone, md+. */
    proofGap: { phone: 8, wide: 16 },
  },
  /**
   * Proof strip (under the CTAs): value over caption per item, the first item leading.
   * md+ where the intro column is wide (768–1023, ≥1280): one row, a hairline between the
   * items (`divider` px each side of it); the leading value never wraps and is sized so the
   * second caption fits in two lines beside it (it wraps only after a middot). Phones and
   * the 1024–1279 band (narrow column beside the portrait): stacked. See .hero-proof.
   */
  proof: {
    /** Leading value (the role): phone, md+. */
    primarySize: { phone: 22, wide: 26 },
    /** Second value. */
    secondarySize: 17,
    /** Captions. */
    captionSize: 14,
    /** Row layout: space each side of the hairline. */
    divider: 24,
  },
  /** Last content (desktop: the portrait's faded end) → the closing horizon line (md+). */
  horizonGap: 32,
  photo: {
    desktop: {
      /** Width at 1440 and up (height follows the photo: 300 → 386). */
      width: 300,
      /** Width at 1024 (scales linearly between 1024 and 1440). */
      minWidth: 228,
      /**
       * Where the top of her head is in the photo (fraction of its height; measured from the
       * cutout's alpha). Her box starts that far above the intro's top, so her head is level
       * with the name.
       */
      headTop: 0.011,
      /** Soft alpha fade over her lower edge (px up from the box bottom). */
      fade: 115,
      /** Minimum space between the intro column and the portrait box. */
      textGap: 40,
      /**
       * Intro column box → portrait box in the centred group: the group is intro.maxWidth +
       * groupGap + width (1040 at 1440), its edges the text column's left and her right.
       */
      groupGap: 20,
    },
    tablet: { width: 193, gapAbove: 24, fade: 74 },
    /**
     * Phone: beside the name + paragraph, at most `width` px; `gap` px from the text column.
     * `nameEm`: the name's width (with its sun mark) in ems of the name size, so the
     * portrait column never squeezes it.
     */
    phone: { width: 160, gap: 12, nameEm: 5.85, fade: 60 },
    /** Soft pink edge glow on the cutout. */
    glow: 'drop-shadow(0 0 22px rgb(255 61 139 / 0.35))',
  },
  /** Sunrise glow behind her: a circle `size` × the photo width, centred on her chest. */
  glow: { size: 1.4, centreY: 0.45 },
} as const;
