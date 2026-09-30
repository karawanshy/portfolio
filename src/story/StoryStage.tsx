import type { CSSProperties } from 'react';
import { GRAIN } from '@/components/primitives/grain';
import { motion } from '@/motion/config';
import { stageGeometry as g } from './stageGeometry';
import { chapters, skyKeyframes, type SkyKeyframeId } from './storyContent';

const fade = 'transition-opacity duration-[900ms] ease-out motion-reduce:transition-none';

/**
 * The fixed stage behind the whole Story (decorative, aria-hidden): sky layers
 * (one per act keyframe, each with its own horizon haze and sun reflection), a
 * star field, ground, horizon line and THE SUN, whose state tells the story's progress.
 *
 * The active act's sky is shown (opacity swap, softened by a CSS transition
 * unless reduced motion). With motion, useStoryStage (src/story/motion/) takes over
 * through CSS variables that override the React values — `--sky-w` per layer,
 * `--stars-o`, and the sun's `--sun-h` / `--sun-b` — so a re-render never fights the
 * scroll-driven values. Motion hooks, all on this element tree:
 *   [data-story-stage]           root; `data-active-sky` = current keyframe id
 *   [data-sky-layer="<id>"]      one layer per keyframe (crossfade their opacity)
 *   [data-story-stars]           star field (opacity follows the sky's --sky-<id>-stars)
 *   [data-story-horizon]         horizon line
 *   [data-story-sun]             the sun (its box sits on the horizon at --story-sun-x). Its state is
 *                                two numbers (motion.story.sun): height --sun-h (−1 sunk · 0 half-sun
 *                                on the horizon · 1 risen) and brightness --sun-b (0 dull · 1 radiant),
 *                                written by motion; otherwise the current chapter's static values
 *                                (--sun-h0 / --sun-b0, set here: reduced motion; no JS = the prologue).
 *                                global.css maps them onto the parts (transform / opacity only):
 *     [data-story-sun-halo]      its light (follows the disc, blooms when risen and bright)
 *     [data-story-sun-flare]     the horizon glow where the sun meets it (bright and up)
 *     [data-story-sun-clip]      clips at the horizon (its bottom edge), holding
 *     [data-story-sun-body]      the disc's position (height, and a drift into the lane as it rises):
 *       [data-story-sun-occluder]  an opaque disc in the sky's horizon colour, so a dim sun reads dull, not see-through
 *       [data-story-sun-full]      the disc itself (opacity = brightness) · [data-story-sun-glow] its glow
 *     [data-story-sun-lines]     the ◒'s two lines on the ground beneath it (fade as it rises)
 *   At height 0 the clipped disc is the ◒ (same dome, same fill; the lines beneath).
 *   [data-story-boat]            ch 18's paper boat on the sea: at rest (no JS: hidden; reduced
 *                                motion: shown in ch 18) it sits far out, on the horizon; motion
 *                                writes `--boat-o` (opacity) and `--boat-x/-y/-k/-r` (its offset
 *                                from the far place, scale and turn: the transform).
 * The stage is as tall as the LARGE viewport (lvh), so while a phone's toolbars slide away there is
 * never a strip below it without sky; its geometry (the horizon) is in svh, so it doesn't jump.
 * Phones keep the sun clear: text blocks carry their own soft scrim (.story-text-block),
 * so there is no stage-wide veil.
 * Without JS the first (dusk) sky and the prologue's half-sun show.
 */
export function StoryStage({ activeSky, chapter }: { activeSky: SkyKeyframeId; chapter: number }) {
  const sun = motion.story.sun.chapters[chapter] ?? motion.story.sun.chapters[0]!;
  return (
    <div
      aria-hidden="true"
      data-story-stage
      data-active-sky={activeSky}
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh overflow-hidden"
      style={{ background: 'var(--color-ink)' }}
    >
      {skyKeyframes.map((k, i) => {
        const active = k.id === activeSky;
        return (
          <div
            key={k.id}
            data-sky-layer={k.id}
            className={`absolute inset-0 ${fade}`}
            style={{ background: k.tokens.gradient, opacity: `var(--sky-w, ${active ? 1 : 0})`, zIndex: i }}
          >
            {/* Haze: a wide band of light lying on the horizon. */}
            <div
              className="absolute inset-x-[-10%] h-[34%] -translate-y-1/2"
              style={{
                top: 'var(--story-horizon-y)',
                background: `radial-gradient(closest-side, var(--sky-${k.id}-haze), transparent)`,
              }}
            />
            {/* Reflection: a soft column of light on the ground under the sun. */}
            <div
              className="absolute bottom-0 -translate-x-1/2"
              style={{
                left: 'var(--story-sun-x)',
                top: 'var(--story-horizon-y)',
                width: 'calc(var(--story-sun-size) * 1.3)',
                background: `radial-gradient(50% 100% at 50% 0%, var(--sky-${k.id}-glow), transparent)`,
              }}
            />
          </div>
        );
      })}

      <svg
        data-story-stars
        viewBox={`0 0 ${g.stars.viewBox.width} ${g.stars.viewBox.height}`}
        preserveAspectRatio="xMidYMin slice"
        className={`absolute inset-0 z-[9] size-full ${fade}`}
        style={{ opacity: `var(--stars-o, var(--sky-${activeSky}-stars))` }}
      >
        <path d={g.stars.small} stroke="var(--story-star)" strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />
        <path d={g.stars.large} stroke="var(--story-star)" strokeWidth={2.8} strokeLinecap="round" opacity={0.8} />
      </svg>

      {/* Horizon line (the ground is part of each sky layer's gradient). */}
      <div
        data-story-horizon
        className="absolute inset-x-0 z-10 h-0.5"
        style={{ top: 'var(--story-horizon-y)', background: 'var(--story-horizon-line)' }}
      />

      {/* Ch 18's paper boat, on the sea (see PaperBoat). */}
      <PaperBoat shown={chapter === chapters.length - 1} />

      {/* The sun: its box sits on the horizon (the ◒'s flat base on the line); its state moves the parts. */}
      <div
        data-story-sun
        className="absolute z-30"
        style={
          {
            left: 'var(--story-sun-x)',
            top: 'var(--story-horizon-y)',
            width: 'var(--story-sun-size)',
            aspectRatio: '1',
            transform: 'translate(-50%, -65%)',
            '--sun-h0': sun.h,
            '--sun-b0': sun.b,
          } as CSSProperties
        }
      >
        <div data-story-sun-halo className="absolute inset-[-110%]" style={{ background: 'var(--story-sun-halo)' }} />
        {/* The horizon glows where the sun meets it. */}
        <div
          data-story-sun-flare
          className="pointer-events-none absolute"
          style={{ left: '-160%', right: '-160%', top: '58%', height: '84%', background: 'var(--story-sun-flare)' }}
        />
        {/* Clipped at the horizon (this box's bottom edge): below it the sun sinks out of sight. */}
        <div data-story-sun-clip className="pointer-events-none absolute inset-x-[-120%] top-[-500%] bottom-[35%] overflow-hidden">
          <div
            data-story-sun-body
            className="absolute aspect-square"
            style={{
              width: 'calc(var(--story-sun-size) * 0.9)',
              left: 'calc(50% - var(--story-sun-size) * 0.45)',
              bottom: 'calc(var(--story-sun-size) * -0.45)',
            }}
          >
            <div data-story-sun-occluder className="absolute inset-0 rounded-full" style={{ background: `var(--sky-${activeSky}-horizon)` }} />
            <div data-story-sun-glow className="absolute inset-0 rounded-full" style={{ boxShadow: 'var(--story-sun-full-glow)' }} />
            <div data-story-sun-full className="absolute inset-0 rounded-full" style={{ background: 'var(--story-sun-disc)' }} />
          </div>
        </div>
        {/* The ◒'s two lines beneath it, on the ground. */}
        <svg data-story-sun-lines viewBox="0 0 40 40" className="absolute inset-0 size-full overflow-visible" style={{ filter: 'drop-shadow(0 0 10px var(--color-pink))' }}>
          <rect x="2" y="30" width="36" height="3" rx="1.5" fill="var(--color-pink)" opacity="0.7" />
          <rect x="8" y="35" width="24" height="3" rx="1.5" fill="var(--color-pink)" opacity="0.4" />
        </svg>
      </div>

      <div className="absolute inset-0 z-40" style={{ backgroundImage: GRAIN, opacity: 'var(--grain-opacity)' }} />
    </div>
  );
}

/** The boat's drawing: its viewBox, whose y 0 is the waterline — and that line's share of its height. */
const BOAT_VB = { x: -40, y: -44, w: 80, h: 60 } as const;
const WATERLINE = `${((-BOAT_VB.y / BOAT_VB.h) * 100).toFixed(2)}%`;

/**
 * The paper boat of ch 18, folded from the same paper as the ch 7 applications (the lit paper,
 * the written lines on its hull), with its reflection and a short wake. Its box is anchored by
 * its waterline's centre on the horizon at --story-boat-x, scaled by --story-boat-far-scale:
 * where it ends up. Motion (useStoryStage, motion.story.boat) moves it from near the viewer.
 */
function PaperBoat({ shown }: { shown: boolean }) {
  // At rest (no motion): far out. Motion sets the offsets from there, the scale and a turn.
  const place = `translate(-50%, -${WATERLINE}) translate(var(--boat-x, 0px), var(--boat-y, 0px)) scale(var(--boat-k, var(--story-boat-far-scale))) rotate(var(--boat-r, 0deg))`;
  return (
    <div
      data-story-boat
      className="absolute z-20"
      style={{
        left: 'var(--story-boat-x)',
        top: 'var(--story-horizon-y)',
        width: 'var(--story-boat-size)',
        transformOrigin: `50% ${WATERLINE}`,
        transform: place,
        opacity: `var(--boat-o, ${shown ? 1 : 0})`,
      }}
    >
      <svg viewBox={`${BOAT_VB.x} ${BOAT_VB.y} ${BOAT_VB.w} ${BOAT_VB.h}`} className="block w-full overflow-visible">
        <defs>
          <linearGradient id="stage-boat-paper" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="var(--illus-paper)" />
            <stop offset="1" stopColor="var(--illus-paper-shade)" />
          </linearGradient>
        </defs>
        {/* A short wake behind it, and its reflection. */}
        <path d="M-22 1Q-34 4 -40 9M-18 3Q-28 8 -32 14" fill="none" stroke="var(--illus-light-core)" strokeOpacity="0.35" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M-24 1H24L16 9H-16Z" fill="var(--illus-paper-shade)" opacity={0.22} />
        {/* The sail: two folded faces, lit and in shade. */}
        <path d="M-13 -11L0 -34V-11Z" fill="url(#stage-boat-paper)" />
        <path d="M0 -34L13 -11H0Z" fill="var(--illus-paper-shade)" />
        <path d="M0 -34V-11" stroke="var(--illus-paper-edge)" strokeWidth="0.6" />
        {/* The hull, with the application's written lines still on it. */}
        <path d="M-24 -11H24L16 0H-16Z" fill="url(#stage-boat-paper)" />
        <path d="M8 -11H24L16 0H6Z" fill="var(--illus-paper-shade)" opacity={0.8} />
        <path d="M-15 -6.4H2M-12 -3H-1" stroke="var(--illus-ink-line)" strokeWidth="1" strokeLinecap="round" />
        <path d="M-24 -11H24" stroke="var(--illus-paper-edge)" strokeWidth="0.6" />
      </svg>
    </div>
  );
}
