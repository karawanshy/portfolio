import type { MouseEvent, ReactNode, RefObject } from 'react';
import { accentColor } from '@/content';
import { StoryDialog } from './StoryDialog';
import { actLabel, actsWithChapters, chapterNumeral, storyUi, type Chapter } from './storyContent';

export interface ChapterIndexProps {
  id: string;
  open: boolean;
  current: number;
  onClose: () => void;
  onJump: (chapter: Chapter) => void;
  openerRef: RefObject<HTMLElement | null>;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
    </svg>
  );
}

const closeClass =
  'flex size-11 shrink-0 items-center justify-center rounded-full text-cream no-underline shadow-outline-cream hover:bg-cream/5';

/** All chapters grouped by act, each a real link to `#chapter-N`. */
function ChapterList({
  labelledBy,
  current,
  onJump,
}: {
  labelledBy: string;
  current?: number;
  onJump?: (c: Chapter) => void;
}) {
  const jump = (c: Chapter) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (!onJump || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onJump(c);
  };
  return (
    <nav aria-labelledby={labelledBy} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 lg:px-5">
      {actsWithChapters.map(({ act, chapters }) => (
        <div key={act.id} className="pt-4">
          <p className="label px-3 pb-1.5" style={{ color: accentColor[act.accent] }}>
            {actLabel(act)}
          </p>
          <ol className="m-0 list-none p-0">
            {chapters.map((c) => {
              const isCurrent = c.number === current;
              return (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    onClick={jump(c)}
                    aria-current={isCurrent ? 'location' : undefined}
                    className={`flex min-h-12 items-center gap-4 rounded-[20px] px-3 py-2 no-underline hover:bg-cream/5 ${
                      isCurrent ? 'bg-cream/8' : ''
                    }`}
                  >
                    <span aria-hidden="true" className="w-7 shrink-0 font-display text-(length:--fs-ui-sm) font-bold text-muted">
                      {chapterNumeral(c)}
                    </span>
                    <span className="font-display text-(length:--fs-ui-base) leading-[1.3] font-semibold text-cream">{c.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </nav>
  );
}

function IndexHeader({ title, close }: { title: ReactNode; close: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-3 lg:px-8">
      {title}
      {close}
    </div>
  );
}

/** The chapter index dialog (JS). Opened from the header's chapter indicator. */
export function ChapterIndex({ id, open, current, onClose, onJump, openerRef }: ChapterIndexProps) {
  const titleId = `${id}-title`;
  return (
    <StoryDialog id={id} open={open} onClose={onClose} labelledBy={titleId} layout="index" openerRef={openerRef}>
      <IndexHeader
        title={
          <h2 id={titleId} className="text-(length:--fs-ui-4xl) font-bold tracking-[-0.03em]">
            {storyUi.index.title}
          </h2>
        }
        close={
          <button type="button" onClick={onClose} aria-label={storyUi.index.close} className={closeClass}>
            <CloseIcon />
          </button>
        }
      />
      <ChapterList labelledBy={titleId} current={current} onJump={onJump} />
    </StoryDialog>
  );
}

/**
 * No-JS chapter index: the same list as a :target overlay, reached from the
 * header's "Chapters" link (global.css shows it only while targeted, never with JS).
 */
export function StaticChapterIndex({ id }: { id: string }) {
  const titleId = `${id}-title`;
  return (
    <div id={id} data-static-index className="fixed inset-0 z-40">
      <a href="#main" tabIndex={-1} aria-hidden="true" className="absolute inset-0" style={{ background: 'var(--story-scrim)' }} />
      <div
        className="absolute inset-x-3 top-3 bottom-3 mx-auto flex max-w-[640px] flex-col rounded-panel shadow-lit sm:inset-x-6 sm:top-[6svh] sm:bottom-[6svh]"
        style={{ background: 'var(--story-sheet-fill)' }}
      >
        <IndexHeader
          title={
            <p id={titleId} className="font-display text-(length:--fs-ui-4xl) font-bold tracking-[-0.03em] text-cream">
              {storyUi.index.title}
            </p>
          }
          close={
            <a href="#main" aria-label={storyUi.index.close} className={closeClass}>
              <CloseIcon />
            </a>
          }
        />
        <ChapterList labelledBy={titleId} />
      </div>
    </div>
  );
}
