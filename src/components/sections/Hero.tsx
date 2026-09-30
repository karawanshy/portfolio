import { useRef, type CSSProperties } from 'react';
import { about, accentColor, hero } from '@/content';
import { portrait } from '@/assets/portrait';
import { Button, HorizonLine, Rich, SunMark, middotText } from '@/components/primitives';
import { heroGeometry as g } from '@/components/hero/heroGeometry';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useHeroParallax } from '@/motion/useHeroParallax';

const px = (n: number) => `${n}px`;
const d = g.photo.desktop;

/*
 * Layout switching is pure CSS (.hero / .hero-intro / .hero-portrait / .hero-photo in
 * global.css), driven by these custom properties, so prerendered HTML paints correctly
 * at every width: phone (<768), tablet (768–1023), desktop (≥1024).
 */
const heroVars = {
  '--hero-top-m': px(g.introTop.phone),
  '--hero-top-t': px(g.introTop.tablet),
  '--hero-room-d': px(g.desktopBand.room),
  '--hero-lift-d': px(g.desktopBand.lift),
  '--intro-max': px(g.intro.maxWidth),
  '--body-max': px(g.intro.bodyMaxWidth),
  '--intro-gap-m': px(g.intro.gap.phone),
  '--intro-gap': px(g.intro.gap.wide),
  '--proof-gap-m': px(g.intro.proofGap.phone),
  '--proof-gap': px(g.intro.proofGap.wide),
  '--horizon-gap-base': px(g.horizonGap),
  '--proof-primary-m': px(g.proof.primarySize.phone),
  '--proof-primary': px(g.proof.primarySize.wide),
  '--proof-secondary': px(g.proof.secondarySize),
  '--proof-caption': px(g.proof.captionSize),
  '--proof-divider': px(g.proof.divider),
  '--photo-ratio': String(portrait.height / portrait.width),
  // Desktop portrait: minWidth at 1024 → width at 1440 and up.
  '--photo-d-w': `clamp(${px(d.minWidth)}, ${px(d.minWidth)} + ${d.width - d.minWidth} * (100vw - 1024px) / 416, ${px(d.width)})`,
  // Box top above the intro top = her head's offset inside the photo (scales with her width).
  '--photo-d-rise': `calc(var(--photo-d-w) * var(--photo-ratio) * ${d.headTop})`,
  '--photo-d-fade': px(d.fade),
  '--photo-text-gap': px(d.textGap),
  '--photo-group-gap': px(d.groupGap),
  '--photo-t-w': px(g.photo.tablet.width),
  '--photo-t-gap': px(g.photo.tablet.gapAbove),
  '--photo-t-fade': px(g.photo.tablet.fade),
  // Phone: the portrait column takes what's left beside the full-size name.
  '--photo-m-col': `min(${px(g.photo.phone.width)}, 100% - var(--fs-hero-name) * ${g.photo.phone.nameEm} - ${px(g.photo.phone.gap)})`,
  '--photo-m-gap': px(g.photo.phone.gap),
  '--photo-m-fade': px(g.photo.phone.fade),
} as CSSProperties;

/** Middot list, each segment kept whole (even across a hyphen): lines break only after a "·". */
function Segments({ text }: { text: string }) {
  const parts = text.split(' · ');
  return parts.map((part, i) => (
    <span key={i}>
      <span className="whitespace-nowrap">
        {part}
        {i < parts.length - 1 && '\u00a0·'}
      </span>
      {i < parts.length - 1 && ' '}
    </span>
  ));
}

/**
 * Proof strip: two short signals under the CTAs (hero.proof), the first one leading (larger
 * value: the role, then education). Plain text, no card surfaces. Sizes: heroGeometry.proof; layout: .hero-proof in
 * global.css (one row with a hairline between where the column is wide, stacked where it's
 * narrow).
 */
function Proof() {
  return (
    <ul className="hero-proof m-0 mt-(--proof-gap-m) list-none p-0 md:mt-(--proof-gap)">
      {hero.proof.map((item) => (
        <li key={item.value} data-primary={item.primary || undefined}>
          <span
            className="hero-proof-value stat-glow font-display leading-[1.05] font-extrabold tracking-[-0.04em]"
            style={{ color: accentColor[item.accent], ['--glow-color' as string]: accentColor[item.accent] }}
          >
            {item.value.includes(' · ') ? middotText(item.value) : item.value}
          </span>
          {item.label && (
            <span className="hero-proof-caption leading-[1.45] text-balance text-text-2">
              <Segments text={item.label} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

const WIDE = '(min-width: 768px)';

/**
 * Home: intro (name, the about paragraph, CTAs, proof strip) with the portrait on
 * its sunrise glow, then the horizon line that closes the hero. See heroGeometry.ts for
 * the composition.
 */
export function Hero() {
  // Only picks motion settings (after mount); markup never depends on it.
  const wide = useMediaQuery(WIDE);
  const sectionRef = useRef<HTMLElement>(null);
  useHeroParallax(sectionRef, wide ? 'wide' : 'phone');
  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-name"
      className="hero relative overflow-hidden px-gutter pb-9 md:pb-11"
      style={heroVars}
    >
      <div className="hero-main relative">
        <div className="hero-intro relative z-[3] flex flex-col items-start gap-[var(--intro-gap-m)] max-md:contents md:gap-[var(--intro-gap)]">
          <h1 id="hero-name" className="statement ml-[-0.0625em] text-hero whitespace-nowrap leading-(--lh-hero-name) tracking-(--ls-hero-name)">
            {hero.name}
            <SunMark size="0.3em" />
          </h1>
          <h2 className="sr-only">{about.title}</h2>
          <p className="hero-body max-w-(--body-max) text-lead leading-[1.6] text-pretty md:leading-[1.65]">
            <Rich text={about.intro.body} />
          </p>
          {/* Content-width button at every size. */}
          <div className="hero-ctas flex flex-wrap items-center gap-2.5 sm:gap-x-4 sm:gap-y-3">
            <Button variant="primary" href={hero.primaryCta.href} trailing="→">
              {hero.primaryCta.label}
            </Button>
          </div>
          <Proof />
        </div>

        {/*
          Portrait on its sunrise glow: one element at every width (CSS places it), so the
          photo downloads once. The glow shares the photo's parallax layer (the wrapper);
          the mirror flip is on the image itself.
        */}
        <div className="hero-portrait pointer-events-none" data-parallax="photo">
          <div
            aria-hidden="true"
            data-hero-glow
            className="absolute top-(--glow-y) left-1/2 aspect-square w-(--glow-w) -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              ['--glow-w' as string]: `${g.glow.size * 100}%`,
              ['--glow-y' as string]: `${g.glow.centreY * 100}%`,
              background: 'var(--gradient-hero-glow)',
            }}
          />
          <div data-hero-photo className="hero-photo relative" style={{ filter: g.photo.glow }}>
            <img
              src={portrait.src}
              srcSet={portrait.srcSet}
              sizes={portrait.sizes}
              width={portrait.width}
              height={portrait.height}
              alt={hero.portraitAlt}
              fetchPriority="high"
              className="block h-auto w-full"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
        </div>
      </div>

      <HorizonLine variant="tangerine-pink" className="relative z-[3] mt-(--horizon-gap)" />
    </section>
  );
}
