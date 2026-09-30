import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { actLabel, chapterLabel, chapterLabelShort, getAct, storyUi, type Chapter } from './storyContent';
import { DiveContent, JournalParagraphs } from './StoryText';

export type PanelTab = 'story' | 'dive';

export interface StoryPanelProps {
  chapter: Chapter;
  /** Position of `chapter` in reading order (0-based) and the chapter count (the progress track). */
  index: number;
  total: number;
  prev?: Chapter;
  next?: Chapter;
  /** Show another chapter in the open dialog (prev / next). */
  onNavigate: (chapter: Chapter) => void;
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
  titleId: string;
}

/**
 * Contents of the "Explore the story" journal page (StoryDialog layout 'journal'):
 * header (chapter + act, close), a scrolling body (title, tabs, text) and a footer with
 * previous / next chapter and a progress track. Chapters with Dive Deeper content get two
 * tabs (The story / Dive into the engineering) with arrow-key navigation.
 */
export function StoryPanel({ chapter, index, total, prev, next, onNavigate, tab, onTabChange, onClose, titleId }: StoryPanelProps) {
  const uid = useId();
  const tabRefs = useRef<Record<PanelTab, HTMLButtonElement | null>>({ story: null, dive: null });
  const footerRef = useRef<HTMLDivElement>(null);
  const act = getAct(chapter.act);
  const hasDive = !!chapter.dive;
  const tabs: PanelTab[] = hasDive ? ['story', 'dive'] : ['story'];
  const { nameSeparator, titleSeparator } = storyUi.journal;
  const prevLabel = prev ? chapterLabelShort(prev) : '';
  const nextLabel = next ? chapterLabelShort(next) : '';

  // After prev / next: focus stays on the pressed arrow; if it's gone (first / last chapter),
  // it moves to the remaining arrow, else to the dialog, so it never falls out of the modal.
  useEffect(() => {
    const footer = footerRef.current;
    const dialog = footer?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog || dialog.contains(document.activeElement)) return;
    const target = footer?.querySelector<HTMLElement>('[data-journal-nav]') ?? dialog;
    target.focus({ preventScroll: true });
  }, [chapter.id]);

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.indexOf(tab);
    let nextTab: PanelTab | undefined;
    if (e.key === 'ArrowRight') nextTab = tabs[(i + 1) % tabs.length];
    else if (e.key === 'ArrowLeft') nextTab = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') nextTab = tabs[0];
    else if (e.key === 'End') nextTab = tabs[tabs.length - 1];
    if (!nextTab) return;
    e.preventDefault();
    onTabChange(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <>
      <div className="journal-header">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="label journal-accent-text">{chapterLabel(chapter)}</p>
          <p className="journal-act">{actLabel(act)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={storyUi.closePanel}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-cream shadow-outline-cream hover:bg-cream/5"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Keyed on the chapter: prev / next remounts it (scroll back at the top) and crossfades it in. */}
      <div
        key={chapter.id}
        data-panel-scroll
        role="region"
        aria-labelledby={titleId}
        tabIndex={0}
        className="journal-body"
      >
        <h2 id={titleId} className="journal-title">
          {chapter.title}
        </h2>

        {hasDive && (
          <div role="tablist" aria-label={chapter.title} className="flex flex-wrap gap-1.5 pb-5">
            {tabs.map((t) => {
              const selected = t === tab;
              return (
                <button
                  key={t}
                  ref={(el) => {
                    tabRefs.current[t] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${t}`}
                  aria-selected={selected}
                  aria-controls={`${uid}-panel-${t}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onTabChange(t)}
                  onKeyDown={onTabKey}
                  className={`min-h-11 rounded-pill px-4 text-(length:--fs-ui-md) leading-tight font-bold whitespace-nowrap ${
                    selected ? 'text-deep' : 'text-text-2 shadow-outline-cream hover:text-cream'
                  }`}
                  style={selected ? { background: 'var(--gradient-main)' } : undefined}
                >
                  {storyUi.tabs[t]}
                </button>
              );
            })}
          </div>
        )}

        {tabs.map((t) => (
          <div
            key={t}
            {...(hasDive
              ? { role: 'tabpanel', id: `${uid}-panel-${t}`, 'aria-labelledby': `${uid}-tab-${t}`, tabIndex: 0 }
              : {})}
            hidden={t !== tab}
            className="rounded-[12px]"
          >
            {t === 'story' ? (
              <JournalParagraphs story={chapter.story} quote={chapter.scene.quote} />
            ) : (
              chapter.dive && <DiveContent dive={chapter.dive} headingLevel={3} variant="journal" />
            )}
          </div>
        ))}
      </div>

      <div ref={footerRef} className="journal-footer">
        {prev ? (
          <button
            type="button"
            data-journal-nav="prev"
            onClick={() => onNavigate(prev)}
            className="journal-nav justify-self-start"
          >
            {/* The visible "Ch 04" leads the name (label in name); the name is read as one
                string, as Chrome would otherwise add a space around an sr-only span. */}
            <span aria-hidden="true" className="inline-flex items-center gap-2">
              <span>←</span>
              {prevLabel}
            </span>
            <span className="sr-only">{`${prevLabel}${nameSeparator}${storyUi.journal.prev}${titleSeparator}${prev.title}`}</span>
          </button>
        ) : (
          <span />
        )}
        <div aria-hidden="true" className="journal-track">
          <div className="journal-track-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        {next ? (
          <button
            type="button"
            data-journal-nav="next"
            onClick={() => onNavigate(next)}
            className="journal-nav justify-self-end"
          >
            <span aria-hidden="true" className="inline-flex items-center gap-2">
              {nextLabel}
              <span>→</span>
            </span>
            <span className="sr-only">{`${nextLabel}${nameSeparator}${storyUi.journal.next}${titleSeparator}${next.title}`}</span>
          </button>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}
