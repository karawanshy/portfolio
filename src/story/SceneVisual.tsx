import type { ComponentType, ReactNode } from 'react';
import { Chess } from './scenes/Chess';
import { Days } from './scenes/Days';
import { Cpu } from './scenes/Cpu';
import { Crowd } from './scenes/Crowd';
import { DoorClosed } from './scenes/DoorClosed';
import { Doorway } from './scenes/Doorway';
import { FailureField } from './scenes/FailureField';
import { Fork } from './scenes/Fork';
import { Hub } from './scenes/Hub';
import { Spark } from './scenes/Spark';
import { Stage } from './scenes/Stage';
import { Trunk } from './scenes/Trunk';
import { Workbench } from './scenes/Workbench';
import { Waver } from './scenes/Waver';
import { WindowLit } from './scenes/WindowLit';
import { WindowsDark } from './scenes/WindowsDark';
import type { Chapter, SceneMotif } from './storyContent';

/** Medium art drawn at the larger `lane-medium` / `tower-medium` sizes (see illusParts). */
const LIFTED = new Set<SceneMotif>(['door', 'workbench', 'crowd', 'windows-dark', 'fork']);

/** Chapter illustrations that sit in the lane on desktop and in the flow on phones. */
const laneArt: Partial<Record<SceneMotif, ComponentType<{ chapter: Chapter }>>> = {
  spark: Spark,
  days: Days,
  stage: Stage,
  door: DoorClosed,
  workbench: Workbench,
  crowd: Crowd,
  window: ({ chapter }) => <WindowLit date={chapter.scene.figure ?? ''} />,
  'windows-dark': WindowsDark,
  fork: Fork,
  hub: Hub,
  trunk: Trunk,
  doorway: Doorway,
};

/**
 * The art and, under it, the chapter's quote (`quote`: the beat lands under the illustration).
 * The wrapper [data-scene-lane] is what's placed (the desktop lane, or the flow below lg); the
 * art keeps its hook [data-scene-visual]. On desktop the quote takes the art's width (it never
 * widens the lane toward the text), centred under it.
 */
function Lane({ motif, place, quote, children }: { motif: SceneMotif; place: string; quote?: ReactNode; children: ReactNode }) {
  return (
    <div data-scene-lane className={`flex flex-col md:my-4 md:max-lg:items-center lg:my-0 lg:mt-(--nudge-art) ${place}`}>
      <div aria-hidden="true" data-scene-visual={motif} className="pointer-events-none">
        {children}
      </div>
      {quote}
    </div>
  );
}

/** How the quote sits under the art (the Quote's className). */
export const quoteUnderArt = 'mt-5 self-stretch lg:mt-[calc(1.5rem+var(--nudge-quote))] lg:w-0 lg:min-w-full lg:text-center';

/**
 * A scene's art, placed by motif (decorative, aria-hidden inside each art component), with the
 * chapter's quote under it. Every chapter has its own illustration in src/story/scenes/.
 * Desktop: lane art sits in the right-hand lane; phones: in the flow after the lines.
 * Hooks: [data-scene-lane] (art + quote), [data-scene-visual="<motif>"] (the art).
 */
export function SceneVisual({ chapter, quote }: { chapter: Chapter; quote?: ReactNode }) {
  const { motif, size } = chapter.scene;
  if (motif === 'none') return quote ?? null;

  /**
   * Desktop: right of the text, but left of the lane at the right edge (right ≥ 13%:
   * the risen sun climbs that lane, clear of the art), vertically centred
   * above the sun. Phones: in the flow after the lines; tablets: in the flow, centred under
   * the text column (the sun keeps the lower right).
   */
  const laneClass = 'lg:absolute lg:top-[38%] lg:right-[13%] lg:-translate-y-1/2';

  const Art = laneArt[motif];
  if (Art) {
    // Compact scenes are short: centre their (smaller) art on the scene instead of above the sun.
    // The larger medium art (ch 7, 8, 9, 13, 14) sits a little higher, so its taller box keeps
    // clear of the sun where it rises in the lane below-right; below xl it also sits a little
    // further right (the sun stays below it), to keep its gap to the text column.
    const place =
      size === 'compact'
        ? 'lg:absolute lg:top-1/2 lg:right-[13%] lg:-translate-y-1/2'
        : LIFTED.has(motif)
          ? 'lg:absolute lg:top-[38%] lg:right-[10%] lg:-translate-y-[56%] xl:right-[13%]'
          : laneClass;
    return (
      <Lane motif={motif} place={place} quote={quote}>
        <Art chapter={chapter} />
      </Lane>
    );
  }

  if (motif === 'chessboard') {
    // A primary moment: the diagonal pair of boards fills the free area between the text
    // column and the right-hand lane (its width grows with the viewport; see Chess.tsx).
    return (
      <Lane motif={motif} place="lg:absolute lg:top-[31%] lg:right-[9.6%] lg:-translate-y-1/2" quote={quote}>
        <Chess />
      </Lane>
    );
  }

  if (motif === 'waver') {
    // Below lg: inline under the lines (vertical; horizontal on portrait phones), the quote
    // under it. Desktop: beside its line (WaverBeside, in Lines), with its own copy of the quote under it.
    return (
      <div data-scene-lane className="mt-2 mb-1 flex flex-col lg:hidden">
        <div aria-hidden="true" data-scene-visual="waver" className="pointer-events-none">
          <Waver figure={chapter.scene.figure ?? ''} idSuffix="-flow" />
        </div>
        {quote}
      </div>
    );
  }

  if (motif === 'cpu') {
    return (
      <Lane motif={motif} place={laneClass} quote={quote}>
        <Cpu />
      </Lane>
    );
  }

  if (motif === 'field') {
    return (
      <Lane motif={motif} place={laneClass} quote={quote}>
        <FailureField />
      </Lane>
    );
  }

  // 'board' is composed by BoardScene (Scene.tsx).
  return null;
}

/**
 * ch 4, desktop: the horizontal route to the right of the lines, vertically centred on
 * `scene.artLine` (rendered inside that line, so it stays level with it at any wrap), and the
 * quote under it (`quote`: shown from lg only; the flow copy below lg is in SceneVisual).
 */
export function WaverBeside({ chapter, quote }: { chapter: Chapter; quote?: ReactNode }) {
  return (
    <div data-scene-lane className="absolute top-1/2 left-[calc(100%+40px)] hidden w-[clamp(260px,30vw,480px)] -translate-y-1/2 lg:block">
      <div aria-hidden="true" data-scene-visual="waver" className="pointer-events-none">
        <Waver figure={chapter.scene.figure ?? ''} only="h" />
      </div>
      {quote && <div className="absolute top-full left-0 w-full">{quote}</div>}
    </div>
  );
}
