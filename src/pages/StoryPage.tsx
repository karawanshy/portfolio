import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SkipLink } from '@/components/primitives';
import { motion } from '@/motion/config';
import { useScrollSpy } from '@/motion/useScrollSpy';
import { hashElement } from '@/router/hash';
import { pushUrl } from '@/router/router';
import { Act } from '@/story/Act';
import { ChapterIndex, StaticChapterIndex } from '@/story/ChapterIndex';
import { ChapterScene, type OpenPanel } from '@/story/Scene';
import { StoryDialog } from '@/story/StoryDialog';
import { StoryEnding } from '@/story/StoryEnding';
import { StoryHeader } from '@/story/StoryHeader';
import { StoryMotion } from '@/story/motion/StoryMotion';
import { finishedAt } from '@/story/motion/quoteTiming';
import { readPin } from '@/story/motion/sceneKit';
import { StoryPanel, type PanelTab } from '@/story/StoryPanel';
import { StoryProgress } from '@/story/StoryProgress';
import { StoryStage } from '@/story/StoryStage';
import { actsWithChapters, chapters, getAct, storyMeta, type Chapter } from '@/story/storyContent';

const chapterHrefs = chapters.map((c) => `#${c.id}`);
const INDEX_ID = 'chapter-index';
const STATIC_INDEX_ID = 'chapters';
const PANEL_ID = 'story-panel';

/**
 * Move the page (behind the journal page, or after a chapter-index jump) to a chapter's finished state: late in its pin, where the
 * illustration and its quote have landed — as late as the hold allows before the next
 * chapter's scene comes into view (short pins leave its top in the frame at the very end).
 * A chapter that doesn't pin (reduced motion) simply scrolls to its top, already complete.
 */
function showChapterFinished(c: Chapter) {
  const el = document.getElementById(c.id);
  if (!el) return;
  const pin = readPin(el, window.scrollY);
  if (!pin) {
    el.scrollIntoView?.();
    return;
  }
  const done = pin.start + finishedAt(c.id, c.scene.motif, !!c.scene.quote?.length) * (pin.end - pin.start);
  const following = chapters[chapters.indexOf(c) + 1];
  const next = following && document.getElementById(following.id);
  const nextTop = next ? next.getBoundingClientRect().top + window.scrollY : Infinity;
  const clear = nextTop - window.innerHeight - motion.story.journal.nextClearance;
  window.scrollTo(0, Math.round(Math.max(done, Math.min(pin.end, clear))));
}

/**
 * /story — "The long way to morning". A fixed stage (sky, horizon, and the sun whose
 * state tells the progress) behind 19 scenes grouped into acts. The prerendered page is the static,
 * readable baseline; StoryMotion (src/story/motion/) drives the stage and scenes
 * through src/motion/driver.ts using the data-* hooks documented on StoryStage,
 * Scene and StoryProgress.
 */
export default function StoryPage() {
  const current = useScrollSpy(chapterHrefs);
  const [indexOpen, setIndexOpen] = useState(false);
  const [panel, setPanel] = useState<{ id: string; tab: PanelTab } | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prev = { title: document.title, description: meta?.content };
    document.title = storyMeta.title;
    if (meta) meta.content = storyMeta.description;
    // Deep link (/story#chapter-12): resolve once the page has rendered (dev renders client-side).
    hashElement(location.hash)?.scrollIntoView();
    return () => {
      document.title = prev.title;
      if (meta && prev.description !== undefined) meta.content = prev.description;
    };
  }, []);

  const openPanel = useCallback<OpenPanel>((chapter, tab, trigger) => {
    openerRef.current = trigger;
    setPanel({ id: chapter.id, tab });
  }, []);
  const closePanel = useCallback(() => setPanel(null), []);
  const setTab = useCallback((tab: PanelTab) => setPanel((p) => (p ? { ...p, tab } : p)), []);
  // Prev / next inside the journal page: show that chapter (keeping the tab when it has one)
  // and move the page behind to it, so closing lands there. Scrolling is locked by overflow
  // only, so a programmatic scroll still applies; focus stays in the dialog.
  const navigatePanel = useCallback((c: Chapter) => {
    setPanel((p) => (p ? { id: c.id, tab: c.dive ? p.tab : 'story' } : p));
    showChapterFinished(c);
  }, []);

  const openIndex = useCallback((trigger: HTMLElement) => {
    openerRef.current = trigger;
    setIndexOpen(true);
  }, []);
  const closeIndex = useCallback(() => setIndexOpen(false), []);
  const jump = useCallback((c: Chapter) => {
    setIndexOpen(false);
    pushUrl(`#${c.id}`);
    // After the dialog's cleanup has unlocked scrolling and restored focus.
    // Land on the chapter's finished state, as the journal page's prev / next do.
    requestAnimationFrame(() => {
      showChapterFinished(c);
      document.getElementById(c.id)?.focus({ preventScroll: true });
    });
  }, []);

  const panelIndex = panel ? chapters.findIndex((c) => c.id === panel.id) : -1;
  const panelChapter = panelIndex >= 0 ? chapters[panelIndex] : undefined;
  const dialogOpen = indexOpen || !!panel;
  const currentChapter = chapters[current] ?? chapters[0]!;

  // Scenes don't depend on the scroll position; keep them out of scroll-spy re-renders.
  const scenes = useMemo(
    () =>
      actsWithChapters.map(({ act, chapters: cs }) => (
        <Act key={act.id} act={act}>
          {cs.map((c, i) => (
            <ChapterScene
              key={c.id}
              chapter={c}
              actStart={i === 0 ? act : undefined}
              onOpen={openPanel}
              after={c.number === chapters.length - 1 ? <StoryEnding /> : undefined}
            />
          ))}
        </Act>
      )),
    [openPanel],
  );

  return (
    <div data-story className="relative isolate min-h-screen overflow-x-clip">
      <StoryStage activeSky={currentChapter.scene.sky} chapter={currentChapter.number} />
      {/* Everything focusable behind the dialogs (the skip link too) goes inert while one is open. */}
      <div inert={dialogOpen}>
        <SkipLink />
        <StoryHeader current={currentChapter} indexOpen={indexOpen} indexId={INDEX_ID} staticIndexId={STATIC_INDEX_ID} onOpenIndex={openIndex} />
        <main id="main" tabIndex={-1} className="mx-auto max-w-[var(--content-max)] px-gutter pt-16 pb-24 outline-none">
          {scenes}
        </main>
        <StoryProgress current={current} />
        <StoryMotion />
        <div data-nojs-only>
          <StaticChapterIndex id={STATIC_INDEX_ID} />
        </div>
      </div>

      <ChapterIndex
        id={INDEX_ID}
        open={indexOpen}
        current={current}
        onClose={closeIndex}
        onJump={jump}
        openerRef={openerRef}
      />
      <StoryDialog
        id={PANEL_ID}
        open={!!panelChapter}
        onClose={closePanel}
        labelledBy={`${PANEL_ID}-title`}
        layout="journal"
        accent={panelChapter ? getAct(panelChapter.act).accent : undefined}
        openerRef={openerRef}
      >
        {panelChapter && panel && (
          <StoryPanel
            chapter={panelChapter}
            index={panelIndex}
            total={chapters.length}
            prev={chapters[panelIndex - 1]}
            next={chapters[panelIndex + 1]}
            onNavigate={navigatePanel}
            tab={panelChapter.dive ? panel.tab : 'story'}
            onTabChange={setTab}
            onClose={closePanel}
            titleId={`${PANEL_ID}-title`}
          />
        )}
      </StoryDialog>
    </div>
  );
}
