import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { accentColor } from '@/content';
import { Button, SunMark } from '@/components/primitives';
import { Board } from './scenes/Board';
import { quoteUnderArt, SceneVisual, WaverBeside } from './SceneVisual';
import { DiveContent, RichRun, StoryParagraphs } from './StoryText';
import { actLabel, chapterLabel, getAct, storyUi, type Act, type Chapter, type SceneAlign, type SceneSize } from './storyContent';
import type { PanelTab } from './StoryPanel';

export type OpenPanel = (chapter: Chapter, tab: PanelTab, trigger: HTMLElement) => void;

/** Vertical rhythm per scene size (pinned candidates get their pin length from motion). */
const sizeClass: Record<SceneSize, string> = {
  major: 'min-h-[100svh] py-28 lg:py-32',
  standard: 'min-h-[78svh] py-24 lg:py-28',
  compact: 'py-16 lg:py-20',
};

/** Desktop text column. The right-hand lane stays free for the scene visual and the rising sun. */
const alignClass: Record<SceneAlign, string> = {
  start: 'lg:max-w-[min(640px,54%)]',
  inset: 'lg:ml-[10%] lg:max-w-[min(600px,50%)]',
  wide: 'lg:max-w-[min(860px,62%)]',
};

const titleSize: Record<SceneSize, string> = {
  major: 'var(--fs-story-title-major)',
  standard: 'var(--fs-story-title)',
  compact: 'var(--fs-story-title-compact)',
};
const lineSize: Record<SceneSize, string> = {
  major: 'var(--fs-story-line-major)',
  standard: 'var(--fs-story-line)',
  compact: 'var(--fs-story-line)',
};

/**
 * Per-chapter scene wrapper. Stable hooks for motion (driven from src/motion/driver.ts):
 *   section#chapter-N [data-scene="chapter-N"]  data-scene-index, data-scene-size,
 *     data-pin-candidate, data-act, data-sky, data-motif; motion may write `--scene-progress` (0→1)
 *   [data-scene-pin]      the inner block to make sticky when pinned
 *   [data-scene-part="header"|"lines"|"controls"|…]  the scene's pieces; art parts are
 *                         documented on each art component (src/story/scenes/)
 *   [data-line]           each cinematic line (per-line reveals)
 *   [data-scene-part="quote"] [data-quote-line]  the chapter's typographic beat, line by line
 *   [data-scene-lane]     the art and the quote under it, placed together (SceneVisual)
 *   [data-scene-visual]   the art's wrapper (SceneVisual / Board)
 */
export function Scene({
  chapter,
  className = '',
  justify = 'center',
  children,
}: {
  chapter: Chapter;
  className?: string;
  /** Vertical placement of the content inside the scene. */
  justify?: 'center' | 'end';
  children: ReactNode;
}) {
  const { size, pinned, sky, motif } = chapter.scene;
  return (
    <section
      id={chapter.id}
      data-scene={chapter.id}
      data-scene-index={chapter.number}
      data-scene-size={size}
      data-pin-candidate={pinned || undefined}
      data-act={chapter.act}
      data-sky={sky}
      data-motif={motif}
      aria-labelledby={`${chapter.id}-title`}
      tabIndex={-1}
      className={`relative isolate flex scroll-mt-20 outline-none ${className || sizeClass[size]}`}
    >
      {/* Fills the scene (minus padding): lane art positions against it, and it's what motion pins. */}
      <div data-scene-pin className={`relative flex w-full flex-col ${justify === 'end' ? 'justify-end' : 'justify-center'}`}>
        {children}
      </div>
    </section>
  );
}

export interface ChapterSceneProps {
  chapter: Chapter;
  /** Set on the first chapter of an act: shows the act marker (the prologue is already labelled). */
  actStart?: Act;
  onOpen: OpenPanel;
  /** Extra content after the controls (the ending's links). */
  after?: ReactNode;
}

/** Chapter marker (phones/tablets): a small ◒ beside the chapter's label, in the left gutter. */
function ChapterMark({ color }: { color: string }) {
  return (
    <div aria-hidden="true" className="absolute top-0 left-0 flex w-[27px] justify-center lg:hidden">
      <SunMark variant="node" size={26} color={color} glow />
    </div>
  );
}

function Labels({ chapter, actStart, color }: { chapter: Chapter; actStart?: Act; color: string }) {
  return (
    <div className="flex flex-col gap-2">
      {actStart?.numeral && (
        <p data-act-marker className="label flex items-center gap-3 text-muted">
          <span aria-hidden="true" className="h-0.5 w-8 rounded-[2px]" style={{ background: color }} />
          <span className="story-label-chip">{actLabel(actStart)}</span>
        </p>
      )}
      <p className="label" style={{ color }}>
        <span className="story-label-chip">{chapterLabel(chapter)}</span>
      </p>
    </div>
  );
}

/** The cinematic lines (a div of block lines: ch 4's art and quote sit beside one of them). */
function Lines({ chapter, fontSize, className = '', beside }: { chapter: Chapter; fontSize: string; className?: string; beside?: ReactNode }) {
  const { artLine } = chapter.scene;
  return (
    <div
      data-scene-part="lines"
      data-lines
      className={`flex max-w-[38ch] flex-col gap-3 leading-[1.4] font-medium text-pretty text-cream ${className}`}
      style={{ fontSize }}
    >
      {chapter.lines.map((line, i) => (
        <div key={i} data-line={i} className={i === artLine ? 'relative' : undefined}>
          <RichRun text={line} />
          {i === artLine && beside}
        </div>
      ))}
    </div>
  );
}

/**
 * Portrait phones: the story controls drawn as slimmer 36px pills with 13px type. The 44px
 * target stays: an invisible ::before, 4px above and below the pill (the pill's own box keeps
 * its fill and outline, so nothing is drawn around it).
 */
const phonePill =
  "max-md:portrait:relative max-md:portrait:min-h-9 max-md:portrait:py-2 max-md:portrait:text-(length:--fs-ui-sm) max-md:portrait:before:absolute max-md:portrait:before:inset-x-0 max-md:portrait:before:-inset-y-1 max-md:portrait:before:content-['']";

/** With JS: buttons that open the panel dialog. Without JS: an inline disclosure with the same content. */
function Controls({ chapter, onOpen }: { chapter: Chapter; onOpen: OpenPanel }) {
  const open = (tab: PanelTab) => (e: MouseEvent<HTMLElement>) => onOpen(chapter, tab, e.currentTarget);
  return (
    <>
      <div data-js-only data-scene-part="controls" className="mt-1 flex flex-wrap items-center gap-2.5">
        <Button variant="story" trailing="→" onClick={open('story')} className={`${phonePill} max-md:portrait:px-3.5`}>
          {storyUi.explore}
        </Button>
        {chapter.dive && (
          // Filled: over the brighter skies an outline-only pill drops below AA.
          <Button variant="secondary" onClick={open('dive')} className={`bg-(--pill-fill) ${phonePill} max-md:portrait:px-4`}>
            {storyUi.dive}
          </Button>
        )}
      </div>
      <details data-nojs-only className="story-details mt-1 max-w-[640px]">
        <summary className={`inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-pill px-[18px] py-3 text-(length:--fs-ui-md) font-bold text-cream shadow-outline-lilac ${phonePill} max-md:portrait:px-3.5`}>
          {storyUi.explore} <span aria-hidden="true">→</span>
        </summary>
        <div className="mt-5 flex flex-col gap-8 rounded-panel p-6 shadow-lit" style={{ background: 'var(--story-sheet-fill)' }}>
          <StoryParagraphs story={chapter.story} />
          {chapter.dive && (
            <div className="flex flex-col gap-4">
              <h3 className="text-(length:--fs-ui-2xl) font-bold">{storyUi.dive}</h3>
              <DiveContent dive={chapter.dive} headingLevel={4} />
            </div>
          )}
        </div>
      </details>
    </>
  );
}

/**
 * The chapter's cinematic typographic beat (scene.quote), one block line per entry: the last
 * line in the accent gradient, any before it in cream. Motion lands the lines one by one at
 * the end of the chapter's pin ([data-quote-line]); without motion they are simply there.
 */
function Quote({ lines, fontSize, className = '' }: { lines: readonly string[]; fontSize: string; className?: string }) {
  if (!lines.length) return null;
  return (
    <blockquote data-scene-part="quote" className={`m-0 font-display leading-[1.02] font-extrabold text-balance ${className}`} style={{ fontSize, letterSpacing: '-0.045em' }}>
      {lines.map((line, i) =>
        i < lines.length - 1 ? (
          <span key={i} data-quote-line={i} className="block text-cream">
            {line}
          </span>
        ) : (
          <span
            key={i}
            data-quote-line={i}
            className="block bg-clip-text text-transparent"
            style={{ backgroundImage: 'var(--quote-accent)', WebkitBackgroundClip: 'text' }}
          >
            {line}
          </span>
        ),
      )}
    </blockquote>
  );
}

export function ChapterScene(props: ChapterSceneProps) {
  if (props.chapter.number === 0) return <PrologueScene {...props} />;
  if (props.chapter.scene.motif === 'board') return <BoardScene {...props} />;
  return <DefaultScene {...props} />;
}

/**
 * Prologue: the entry. Calm, cinematic type sitting just above the horizon;
 * the stage (dusk sky, stars, the half-sun on the horizon) does the rest.
 */
function PrologueScene({ chapter, onOpen }: ChapterSceneProps) {
  const color = accentColor[getAct(chapter.act).accent];
  return (
    <Scene
      chapter={chapter}
      className="min-h-[100svh] pt-28 pb-(--story-prologue-pad-bottom) lg:pt-20 lg:pb-(--story-prologue-pad-bottom-lg)"
      justify="end"
    >
      <div data-scene-part="prologue" className="relative flex flex-col gap-6 pl-10 lg:max-w-[min(900px,64%)] lg:gap-8 lg:pl-0">
        <ChapterMark color={color} />
        <p data-scene-part="header" className="label tracking-[0.32em]" style={{ color }}>
          <span className="story-label-chip">{chapterLabel(chapter)}</span>
        </p>
        <h1
          id={`${chapter.id}-title`}
          className="leading-[0.98] font-semibold text-balance"
          style={{ fontSize: 'var(--fs-story-prologue)', letterSpacing: '-0.035em' }}
        >
          {chapter.title}
        </h1>
        <Lines chapter={chapter} fontSize="var(--fs-story-line-major)" className="max-w-[30ch] font-normal text-text-2" />
        <Controls chapter={chapter} onOpen={onOpen} />
      </div>
    </Scene>
  );
}

/**
 * Chapter 3: the question lands as the big typographic beat.
 * Desktop: text + controls on the left (centred on the right-hand group), the board to the right
 * (left of the right-hand lane) with the quote under it, the scene's last beat — both clear of the
 * horizon and the sun.
 * Tablet (md): text beside a narrow portrait board, quote below — fits one viewport, so it pins.
 * Phones: text → controls → the (short) landscape board → quote, tight enough to pin in one frame.
 */
function BoardScene({ chapter, actStart, onOpen }: ChapterSceneProps) {
  const color = accentColor[getAct(chapter.act).accent];
  return (
    <Scene chapter={chapter} className="min-h-[100svh] py-28 lg:py-24">
      <div data-board-grid className="relative grid gap-6 pl-10 md:gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)] md:gap-x-10 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-6 lg:pl-0">
        <ChapterMark color={color} />
        <div data-text-block className="story-text-block flex flex-col gap-4 md:gap-5 md:self-center lg:col-span-6 lg:row-span-2 lg:gap-6">
          <div data-scene-part="header" className="flex flex-col gap-3 md:gap-5 lg:gap-6">
            <Labels chapter={chapter} actStart={actStart} color={color} />
            {/* The question is the beat here, so the title stays small. */}
            <h2 id={`${chapter.id}-title`} className="leading-[1.08] font-extrabold text-balance" style={{ fontSize: titleSize.compact, letterSpacing: '-0.035em' }}>
              {chapter.title}
            </h2>
          </div>
          <Lines chapter={chapter} fontSize={lineSize.standard} />
          <Controls chapter={chapter} onOpen={onOpen} />
        </div>
        {/* Columns 7–11 only: column 12 and the gutter are the sun's lane. Desktop: raised by a
            tenth of its height, clear of the quote under it.
            Phones: never taller than about half the screen (landscape phones keep room for the text). */}
        <div aria-hidden="true" data-scene-visual="board" className="max-md:max-w-[max(220px,calc(56svh*1.63))] md:col-start-2 md:row-start-1 md:self-center lg:col-span-5 lg:col-start-7 lg:w-full lg:max-w-[410px] lg:-translate-y-[10%] lg:self-end lg:justify-self-center">
          <Board />
        </div>
        <div className="flex flex-col md:col-span-2 lg:col-span-5 lg:col-start-7 lg:row-start-2 lg:self-start lg:text-center">
          <Quote lines={chapter.scene.quote ?? []} fontSize="var(--fs-story-quote-board)" />
        </div>
      </div>
    </Scene>
  );
}

/** scene.nudge as CSS variables (desktop-only classes read them). */
function nudgeVars(chapter: Chapter): CSSProperties {
  const n = chapter.scene.nudge ?? {};
  return { '--nudge-text': `${n.text ?? 0}px`, '--nudge-art': `${n.art ?? 0}px`, '--nudge-quote': `${n.quote ?? 0}px` } as CSSProperties;
}

function DefaultScene({ chapter, actStart, onOpen, after }: ChapterSceneProps) {
  const color = accentColor[getAct(chapter.act).accent];
  const { size, align } = chapter.scene;
  /** The quote under the art. `beside`: ch 4's desktop copy (left-aligned under its route). */
  const quote = (beside: boolean) =>
    chapter.scene.quote?.length ? (
      <Quote lines={chapter.scene.quote} fontSize="var(--fs-story-quote-scene)" className={beside ? 'mt-5' : quoteUnderArt} />
    ) : undefined;
  return (
    <Scene chapter={chapter}>
      {/* lg:static → a lane visual (inside, after the lines) positions against the scene, not the column. */}
      <div
        data-scene-column
        className={`relative flex flex-col gap-4 pl-10 md:gap-5 lg:static lg:gap-6 lg:pl-0 lg:pb-[calc(var(--nudge-text)*2)] ${alignClass[align]}`}
        style={nudgeVars(chapter)}
      >
        <ChapterMark color={color} />
        {/* Phones: a soft scrim behind the text (only where text is), so the sun stays clear elsewhere. */}
        <div data-text-block className="story-text-block flex flex-col gap-4 md:gap-5 lg:gap-6">
          <div data-scene-part="header" className="flex flex-col gap-3 md:gap-5 lg:gap-6">
            <Labels chapter={chapter} actStart={actStart} color={color} />
            <h2
              id={`${chapter.id}-title`}
              className="leading-[1.04] font-extrabold text-balance"
              style={{ fontSize: titleSize[size], letterSpacing: '-0.04em' }}
            >
              {chapter.title}
            </h2>
          </div>
          <Lines
            chapter={chapter}
            fontSize={lineSize[size]}
            beside={chapter.scene.motif === 'waver' ? <WaverBeside chapter={chapter} quote={quote(true)} /> : undefined}
          />
        </div>
        {/* Phones/tablets: the controls come right after the lines, before the art (as in ch 3),
            so a pinned scene holds them inside its frame with the heading and the art. */}
        <Controls chapter={chapter} onOpen={onOpen} />
        {/* The beat lands last, as the chapter's pin ends, under the illustration. */}
        <SceneVisual chapter={chapter} quote={quote(false)} />
        {after}
      </div>
    </Scene>
  );
}
