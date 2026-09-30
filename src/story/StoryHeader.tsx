import type { MouseEvent } from 'react';
import { StoryPill, SunMark } from '@/components/primitives';
import { Link } from '@/router/Link';
import { chapterLabel, chapterLabelShort, storyUi, type Chapter } from './storyContent';

export interface StoryHeaderProps {
  current: Chapter;
  indexOpen: boolean;
  indexId: string;
  /** No-JS :target index overlay. */
  staticIndexId: string;
  onOpenIndex: (trigger: HTMLElement) => void;
}

/**
 * Fixed Story header (from lg a 1fr · auto · 1fr grid, so the chapter indicator sits in the true centre;
 * below that there's no room to centre it between the logo and the pill): K◒ → `/#story` (like "← Portfolio", it returns to the Story band), the current chapter (also the chapter-index
 * trigger), and the lilac "← Portfolio" Story pill (the same as the portfolio's "Story" pill) → `/#story`.
 * The indicator follows the scroll-spy (StoryPage); motion may animate it in S2.
 * Portrait phones: a leaner bar (less padding, the chapter pill and "← Portfolio" drawn 36px
 * tall inside their 44px targets). Short screens (short phones, landscape phones): a shallower fade, so pinned scenes keep more
 * of the frame (the pins' safe area is measured from the header's height).
 */
export function StoryHeader({ current, indexOpen, indexId, staticIndexId, onOpenIndex }: StoryHeaderProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr] px-4 pt-3 pb-12 max-md:portrait:pt-2 max-md:portrait:pb-9 md:px-gutter lg:pt-[18px] lg:pb-10 [@media(max-height:480px)]:pt-2 [@media(max-height:480px)]:pb-6 [@media(max-width:767.98px)_and_(min-height:481px)_and_(max-height:760px)]:pb-8"
      style={{ background: 'var(--story-header-fade)' }}
    >
      <Link
        href={storyUi.back.href}
        aria-label={storyUi.logoLabel}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-self-start font-display text-(length:--fs-ui-3xl) font-extrabold tracking-[-0.03em] text-cream no-underline lg:text-(length:--fs-ui-4xl)"
      >
        K<SunMark size="0.5em" />
      </Link>

      <div className="flex min-w-0 flex-1 justify-center lg:w-[390px] lg:flex-none">
        {/* With JS: opens the chapter index dialog. */}
        <button
          type="button"
          data-js-only
          data-chapter-indicator
          aria-haspopup="dialog"
          aria-expanded={indexOpen}
          aria-controls={indexId}
          onClick={(e: MouseEvent<HTMLButtonElement>) => onOpenIndex(e.currentTarget)}
          // A stable width (the longest label + title), so changing chapters never shifts the header;
          // the title truncates inside it. Below 340px: no icon and the compact label ("Ch 10"),
          // visual only — the accessible name keeps the full label.
          // Portrait phones: a slimmer 36px pill; its 44px target is an invisible ::before, 4px
          // above and below.
          className="flex max-md:portrait:relative min-h-11 w-[min(100%,390px)] min-w-0 items-center justify-center gap-2.5 rounded-pill py-2 pr-4 pl-3.5 text-left shadow-nav max-md:portrait:min-h-9 max-md:portrait:py-1 max-md:portrait:before:absolute max-md:portrait:before:inset-x-0 max-md:portrait:before:-inset-y-1 max-md:portrait:before:content-[''] max-sm:w-auto max-2xs:gap-0 max-2xs:px-3"
          style={{ background: 'var(--nav-fill)' }}
        >
          <span className="contents max-2xs:hidden">
            <IndexIcon />
          </span>
          <span className="sr-only">{storyUi.index.open}, </span>
          <span className="label shrink-0 text-tangerine max-2xs:sr-only">{chapterLabel(current)}</span>
          <span aria-hidden="true" className="label hidden shrink-0 text-tangerine max-2xs:inline">
            {chapterLabelShort(current)}
          </span>
          <span className="min-w-0 flex-1 truncate font-body text-(length:--fs-ui-md) font-semibold text-cream max-sm:hidden">{current.title}</span>
        </button>
        {/* Without JS: a link to the :target index overlay. */}
        <a
          href={`#${staticIndexId}`}
          data-nojs-only
          className="flex max-md:portrait:relative min-h-11 items-center gap-2.5 rounded-pill px-4 text-(length:--fs-ui-md) font-semibold text-cream no-underline shadow-nav max-md:portrait:min-h-9 max-md:portrait:before:absolute max-md:portrait:before:inset-x-0 max-md:portrait:before:-inset-y-1 max-md:portrait:before:content-['']"
          style={{ background: 'var(--nav-fill)' }}
        >
          <IndexIcon />
          {storyUi.index.open}
        </a>
      </div>

      <StoryPill
        href={storyUi.back.href}
        ariaLabel={storyUi.back.ariaLabel}
        back
        className="shrink-0 justify-self-end"
        // Short screens (landscape phones): 44px, so the pinned scenes keep their frame.
        pillClassName="[@media(max-height:480px)]:h-11!"
      >
        {storyUi.back.label}
      </StoryPill>
    </header>
  );
}

function IndexIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 text-cream" fill="currentColor">
      <rect x="1" y="3" width="3" height="2" rx="1" />
      <rect x="6" y="3" width="9" height="2" rx="1" />
      <rect x="1" y="7" width="3" height="2" rx="1" />
      <rect x="6" y="7" width="9" height="2" rx="1" />
      <rect x="1" y="11" width="3" height="2" rx="1" />
      <rect x="6" y="11" width="9" height="2" rx="1" />
    </svg>
  );
}
