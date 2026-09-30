import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import type { Accent } from '@/content';
import { motion } from '@/motion/config';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export interface StoryDialogProps {
  id: string;
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  /**
   * 'journal': the "Explore the story" page — bottom sheet below lg, centred card from lg
   * (CSS media queries, global.css `.journal-*`), tinted by `accent`.
   * 'index': centered card on every size.
   */
  layout: 'journal' | 'index';
  /** 'journal' only: the act's accent (tints the surface, labels and progress). */
  accent?: Accent;
  /**
   * The element that opened the dialog, captured before the page turned inert
   * (inert can blur it). Focus returns here on close.
   */
  openerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/**
 * Modal dialog for the Story: focus moves in on open, Tab is trapped inside,
 * Esc / scrim click close it, focus returns to the opener, and page scroll is
 * locked while it's open. The page behind is made inert by StoryPage.
 * Closed dialogs are `hidden`. (Without JS, StaticChapterIndex replaces the index dialog.)
 */
export function StoryDialog({ id, open, onClose, labelledBy, layout, accent, openerRef, children }: StoryDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = openerRef.current;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    dialog.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.closest('[hidden]') && el.getClientRects().length > 0,
      );
      // jsdom has no layout: fall back to the unfiltered list.
      const focusables = items.length ? items : [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!focusables.length) {
        e.preventDefault();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = prevOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, openerRef]);

  if (layout === 'journal') {
    const { durationMs, rise, easing, crossfadeMs } = motion.story.journal;
    const timing = {
      '--journal-ms': `${durationMs}ms`,
      '--journal-rise': `${rise}px`,
      '--journal-ease': easing,
      '--journal-crossfade-ms': `${crossfadeMs}ms`,
    } as CSSProperties;
    return (
      <div id={id} hidden={!open} data-story-dialog={layout} className="journal fixed inset-0 z-40" style={timing}>
        <div aria-hidden="true" className="journal-scrim" onClick={onClose} />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          data-accent={accent}
          className="journal-card outline-none"
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div id={id} hidden={!open} data-story-dialog={layout} className="fixed inset-0 z-40">
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'var(--story-scrim)' }} onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="story-index absolute inset-x-3 top-3 bottom-3 mx-auto flex max-w-[640px] flex-col rounded-panel shadow-lit outline-none sm:inset-x-6 sm:top-[6svh] sm:bottom-[6svh]"
        style={{ background: 'var(--story-sheet-fill)' }}
      >
        {children}
      </div>
    </div>
  );
}
