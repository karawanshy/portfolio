import { useEffect } from 'react';
import { site, sectionIds } from '@/content';
import { BackgroundLights, SkipLink } from '@/components/primitives';
import { Contact } from '@/components/sections/Contact';
import { Experience } from '@/components/sections/Experience';
import { Footer } from '@/components/sections/Footer';
import { Hero } from '@/components/sections/Hero';
import { Projects } from '@/components/sections/Projects';
import { Skills } from '@/components/sections/Skills';
import { StoryBand } from '@/components/sections/StoryBand';
import { TopBar } from '@/components/sections/TopBar';
import { useInPageLinks } from '@/hooks/useInPageLinks';
import { MotionLayer } from '@/motion/MotionLayer';
import { hashElement } from '@/router/hash';

export function PortfolioPage() {
  // Nav / CTA / logo links scroll within the page; the address stays `/`.
  useInPageLinks();
  useEffect(() => {
    document.title = site.title;
    // Deep link (/#contact). In production the prerendered HTML already has the final
    // layout (the pinned rail's height is reserved in CSS), so the browser's own
    // fragment scroll is right and these calls are no-ops. They're kept for the dev
    // server (client render: the fragment scroll runs before any content exists) and
    // for browsers without scroll anchoring when late fonts re-wrap text above.
    const target = hashElement(location.hash);
    if (!target) return;
    let landedAt = 0;
    const land = () => {
      target.scrollIntoView();
      landedAt = window.scrollY;
    };
    land();
    // Re-land once layout settles (two frames, and again after fonts), unless the
    // reader has scrolled since (or the browser restored a back/forward position).
    let cancelled = false;
    const settle = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled && Math.abs(window.scrollY - landedAt) < 2) land();
        }),
      );
    settle();
    void document.fonts?.ready.then(() => {
      if (!cancelled) settle();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="top" className="relative isolate min-h-screen overflow-clip">
      <SkipLink />
      <BackgroundLights />
      <TopBar />
      <main id={sectionIds.main} tabIndex={-1} className="outline-none">
        <Hero />
        <Experience />
        <Skills />
        <Projects />
        <StoryBand />
        <Contact />
      </main>
      <Footer />
      <MotionLayer />
      {/* Warm "sunrise" rising from below the contact section (decorative). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[460px] left-1/2 -z-[5] h-[760px] w-[1200px] max-w-[250vw] -translate-x-1/2 rounded-full"
        style={{ background: 'var(--gradient-sunrise)' }}
      />
    </div>
  );
}
