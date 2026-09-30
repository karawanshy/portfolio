import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { projects, sectionIds } from '@/content';
import { Button, ChipList, RailButton, Rich, SectionTitle, middotText } from '@/components/primitives';
import { ChessPhoneIllustration } from '@/components/projects/ChessPhoneIllustration';
import { HabitWeekIllustration } from '@/components/projects/HabitWeekIllustration';
import { HasoubCard } from '@/components/projects/HasoubCard';
import { ProjectDetailsBody, ProjectDetailsDialog } from '@/components/projects/ProjectDetails';
import { useProjectRail, type RailMode } from '@/motion/useProjectRail';

const [hasoub, habit, chess] = projects.items;
const detailsDialogId = 'project-details-hasoub';

/*
 * Prerendered / pre-hydration markup: useMediaQuery reports "phone" until hydration,
 * so the first paint uses the `swipe` classes. They carry responsive fallbacks that
 * already match the likely JS mode, so hydration doesn't change the layout:
 * phones → swipe row; md+ → snap row (= row mode, and = pin mode at progress 0);
 * ≥2117px → the fitted row. 2117px = where the design travel drops below
 * motion.rail.minTravel: cards 840 + 720 + 640, 2 gaps × 24, 2 gutters × 64 = 2376,
 * and 2376 − 2117 < 260 — keep them in sync. The same breakpoint drives the no-JS
 * fitted row in global.css.
 */
/** Rail classes per mode. */
const railMode: Record<RailMode, string> = {
  swipe: 'snap-x snap-mandatory overflow-x-auto overflow-y-hidden rail:snap-none rail:overflow-visible',
  row: 'snap-x snap-mandatory overflow-x-auto overflow-y-hidden',
  pin: 'overflow-visible will-change-transform',
  fit: 'overflow-visible',
  stack: 'flex-col items-start',
};

/**
 * Design card widths (px) at lg+. Hasoub (the lead project) is the widest; Habit and
 * Chess keep their artboard widths. Below lg all cards share one width.
 */
const cardWidth = { hasoub: 840, habit: 720, chess: 640 } as const;

/**
 * Card sizing. `fit`: the <li> flexes from its design width (shrinking in proportion,
 * so 840:720:640 holds) and the card fills it. Otherwise fixed widths: one shared width
 * below lg (phones, tablet row/stack), the design widths from lg (pin, lg row/stack).
 * Phones (< md, swipe): the viewport minus one gutter, the 16px gap and a 20px peek of
 * the next card; the last card snaps to the right gutter with the previous one peeking.
 */
const fixedWidth = {
  hasoub:
    'w-[min(720px,calc(100vw-2*var(--gutter)))] lg:w-[min(840px,calc(100vw-2*var(--gutter)))] max-md:w-[calc(100vw-var(--gutter)-36px)]',
  habit: 'w-[min(720px,calc(100vw-2*var(--gutter)))] max-md:w-[calc(100vw-var(--gutter)-36px)]',
  chess: 'w-[min(720px,calc(100vw-2*var(--gutter)))] lg:w-[min(640px,calc(100vw-2*var(--gutter)))] max-md:w-[calc(100vw-var(--gutter)-36px)]',
} as const;

/** Pre-hydration (swipe) fallback: the fitted row from 2117px (see above). */
const fitFallback = {
  li: {
    hasoub: 'rail:shrink rail:basis-[840px] rail:min-w-0',
    habit: 'rail:shrink rail:basis-[720px] rail:min-w-0',
    chess: 'rail:shrink rail:basis-[640px] rail:min-w-0',
  },
  article: 'rail:w-full',
} as const;

function cardSizing(mode: RailMode, card: keyof typeof cardWidth) {
  // --card-w: the design width, read by the no-JS layout in global.css.
  const cardVar = { '--card-w': cardWidth[card] } as CSSProperties;
  if (mode === 'fit') return { li: { ...cardVar, flex: `0 1 ${cardWidth[card]}px`, minWidth: 0 }, liClass: '', article: 'w-full' };
  const swipe = mode === 'swipe';
  return {
    li: cardVar,
    liClass: swipe ? fitFallback.li[card] : '',
    article: swipe ? `${fixedWidth[card]} ${fitFallback.article}` : fixedWidth[card],
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function Projects() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const count = projects.items.length;
  const { mode, active, atStart, atEnd, step } = useProjectRail(
    { section: sectionRef, stage: stageRef, rail: railRef },
    count,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const openDetails = useCallback(() => setDetailsOpen(true), []);
  const closeDetails = useCallback(() => setDetailsOpen(false), []);
  const hasoubSize = cardSizing(mode, 'hasoub');
  const habitSize = cardSizing(mode, 'habit');
  const chessSize = cardSizing(mode, 'chess');

  return (
    <section
      ref={sectionRef}
      id={sectionIds.projects}
      aria-labelledby="projects-title"
      data-rail-mode={mode}
      data-own-reveal="projects"
      className="overflow-clip"
    >
      {/* Stage: pinned (sticky) while the rail slides, in pin mode only. */}
      <div
        ref={stageRef}
        data-rail-stage
        className={`flex flex-col gap-5 pt-5 pb-10 md:gap-8 md:pt-20 md:pb-11 ${mode === 'pin' ? 'sticky' : ''}`}
      >
        {/* With motion: the head, then the cards left to right, then the hint/progress (MotionLayer). */}
        <div data-projects-head className="px-gutter">
          <SectionTitle id="projects-title" number={projects.number} title={projects.title} />
        </div>

        {/*
          The rail spans the full section width with gutter padding, and extra bottom
          padding (cancelled by a negative margin), so the cards' glows fade out instead
          of being clipped. Mode (pin / row / swipe / stack) comes from useProjectRail.
        */}
        <ul
          ref={railRef}
          id="project-rail"
          data-project-rail
          className={`no-scrollbar -mb-[50px] flex list-none scroll-px-[var(--gutter)] gap-4 px-gutter pt-0 pb-20 max-md:items-start md:gap-6 ${railMode[mode]}`}
        >
          <li data-projects-card className={`flex shrink-0 snap-start ${hasoubSize.liClass}`} data-card-width={cardWidth.hasoub} style={hasoubSize.li}>
            <HasoubCard
              project={hasoub}
              sizeClass={hasoubSize.article}
              dialogId={detailsDialogId}
              detailsOpen={detailsOpen}
              onOpenDetails={openDetails}
            />
          </li>
          <li data-projects-card className={`flex shrink-0 snap-start ${habitSize.liClass}`} data-card-width={cardWidth.habit} style={habitSize.li}>
            <article
              aria-labelledby="project-habit"
              data-tilt
              className={`relative grid overflow-clip ${habitSize.article} grid-cols-1 gap-2.5 rounded-project p-[26px] text-deep md:grid-cols-[minmax(0,1fr)_236px] md:gap-x-7 md:gap-y-3.5 lg:p-[34px]`}
              style={{
                background: 'var(--gradient-sunset)',
                boxShadow: 'var(--shadow-card-sunset)',
              }}
            >
              <span aria-hidden="true" className="card-gloss" />
              <div className="flex flex-col gap-2.5 md:col-start-1 md:gap-3.5">
                <p className="label max-md:text-(length:--fs-ui-2xs)">{middotText(habit.label)}</p>
                <h3 id="project-habit" className="text-project leading-[1.1] font-bold tracking-[-0.035em] text-deep">
                  {habit.title}
                </h3>
                <p className="text-(length:--fs-ui-base) leading-[1.5] font-medium text-pretty md:leading-[1.55] lg:text-(length:--fs-ui-lg)">
                  {/* Cream can't read on the sunset card: emphasis is bold in the card's own deep ink. */}
                  <Rich text={habit.description} emClassName="font-bold" />
                </p>
              </div>
              <div className="mt-1.5 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:self-center">
                <HabitWeekIllustration />
              </div>
              <div className="mt-2 flex flex-col gap-3.5 md:col-start-1 md:mt-0">
                <ChipList items={habit.chips} variant="onPink" />
                <Button variant="deepOutline" href={habit.link.href} external trailing="↗" className="mt-1.5 self-start">
                  {habit.link.label}
                  <span className="sr-only">: {habit.title}</span>
                </Button>
              </div>
            </article>
          </li>
          <li data-projects-card className={`flex shrink-0 snap-start ${chessSize.liClass}`} data-card-width={cardWidth.chess} style={chessSize.li}>
            <article
              aria-labelledby="project-chess"
              data-tilt
              className={`relative grid overflow-clip ${chessSize.article} content-start items-center gap-5 rounded-project p-[26px] text-cream md:grid-cols-[200px_minmax(0,1fr)] md:content-normal md:gap-8 lg:p-[34px]`}
              style={{
                background: 'var(--gradient-card-lilac)',
                boxShadow: 'var(--shadow-card-lilac)',
              }}
            >
              <span aria-hidden="true" className="card-gloss" />
              <ChessPhoneIllustration />
              <div className="flex flex-col gap-2.5 md:gap-3.5">
                <p className="label text-lilac max-md:text-(length:--fs-ui-2xs)">{middotText(chess.label)}</p>
                <h3 id="project-chess" className="text-project leading-[1.1] font-bold tracking-[-0.035em]">
                  {chess.title}
                </h3>
                <p className="text-(length:--fs-ui-base) leading-[1.5] text-pretty text-text-2 md:leading-[1.55] lg:text-(length:--fs-ui-lg)">
                  <Rich text={chess.description} />
                </p>
                <ChipList items={chess.chips} variant="onLilac" className="mt-1 md:mt-0" />
                <Button
                  variant="lilacOutline"
                  href={chess.link.href}
                  external
                  trailing="↗"
                  className="mt-1.5 self-start"
                >
                  {chess.link.label}
                  <span className="sr-only">: {chess.title}</span>
                </Button>
              </div>
            </article>
          </li>
        </ul>

        <p data-project-hint data-projects-after className="px-gutter text-center text-(length:--fs-ui-md) font-semibold text-text-2 md:hidden">
          {(active >= count - 1 ? projects.swipeBackHint : projects.swipeHint)
            .replace('{n}', pad2(active + 1))
            .replace('{total}', pad2(count))
            .replace('{title}', projects.items[active >= count - 1 ? count - 2 : active + 1]!.title)}
        </p>
        <div data-project-progress-row data-projects-after className={`hidden items-center gap-2.5 px-gutter ${
            mode === 'stack' || mode === 'fit' ? '' : mode === 'swipe' ? 'md:flex rail:hidden' : 'md:flex'
          }`}
        >
          {projects.items.map((item, i) => (
            <span
              key={item.id}
              aria-hidden="true"
              className={`h-[5px] rounded-[5px] ${i === active ? 'w-11' : 'w-[18px] bg-cream/20'}`}
              style={i === active ? { background: 'var(--gradient-main)' } : undefined}
            />
          ))}
          <p className="ml-2.5 text-(length:--fs-ui-md) text-muted">
            {/* "Scroll to slide" only where page scroll really slides the rail. */}
            {mode === 'pin' ? <>{projects.progressHint} · </> : null}
            <span data-project-progress>
              {pad2(active + 1)} / {pad2(count)}
            </span>
          </p>
          {mode === 'row' && !(atStart && atEnd) && (
            <div className="ml-auto flex gap-2.5">
              <RailButton label={projects.prevLabel} glyph="←" controls="project-rail" disabled={atStart} onClick={() => step(-1)} />
              <RailButton label={projects.nextLabel} glyph="→" controls="project-rail" disabled={atEnd} onClick={() => step(1)} />
            </div>
          )}
        </div>
      </div>

      <ProjectDetailsDialog
        id={detailsDialogId}
        open={detailsOpen}
        onClose={closeDetails}
        eyebrow={hasoub.moreLabel}
        title={hasoub.title}
        closeLabel={hasoub.closeLabel}
      >
        <ProjectDetailsBody details={hasoub.details} heading="h4" />
      </ProjectDetailsDialog>
    </section>
  );
}
