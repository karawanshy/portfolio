import { Fragment, type ReactNode } from 'react';
import { Button, ChipList, TONE_CLASS } from '@/components/primitives';
import { plainText, storyUi, type DiveDeeper, type StoryText } from './storyContent';

function withBreaks(s: string): ReactNode {
  const parts = s.split('\n');
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {p}
    </Fragment>
  ));
}

/**
 * A StoryText run: plain strings, `{ bold }` emphasis (cream, semibold), `{ em, tone }` toned
 * keywords (as in the hero summary, Rich.tsx) and `{ stat }` figures. `\n` → <br>.
 */
export function RichRun({ text }: { text: StoryText }) {
  return (
    <>
      {text.map((seg, i) =>
        typeof seg === 'string' ? (
          <Fragment key={i}>{withBreaks(seg)}</Fragment>
        ) : 'stat' in seg ? (
          <strong key={i} className="stat-figure">
            {seg.stat}
          </strong>
        ) : 'em' in seg ? (
          <strong key={i} className={TONE_CLASS[seg.tone]}>
            {seg.em}
          </strong>
        ) : (
          <strong key={i} className="font-semibold text-cream">
            {withBreaks(seg.bold)}
          </strong>
        ),
      )}
    </>
  );
}

/** The "Explore the story" paragraphs. */
export function StoryParagraphs({ story }: { story: readonly StoryText[] }) {
  return (
    <div className="flex flex-col gap-4 text-(length:--fs-ui-lg) leading-[1.65] text-text-2 lg:text-(length:--fs-ui-xl)">
      {story.map((p, i) => (
        <p key={i}>
          <RichRun text={p} />
        </p>
      ))}
    </div>
  );
}

/** Text for matching a paragraph to the scene quote: quotation marks and spacing don't count. */
const quoteKey = (s: string) => s.replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();

/**
 * The journal page's paragraphs (the "Explore the story" dialog), shaped by the content:
 * a paragraph whose text is the chapter's scene quote (ignoring quotation marks) is set like
 * the quote in the scene, one line per quote line (cream, the last in the accent gradient);
 * a paragraph that is one `{ bold }` run is a centred beat; everything else is a plain paragraph.
 */
export function JournalParagraphs({ story, quote }: { story: readonly StoryText[]; quote?: readonly string[] }) {
  const quoteText = quote && quoteKey(quote.join(' '));
  return (
    <div className="journal-paragraphs">
      {story.map((p, i) => {
        if (quote && quoteKey(plainText(p)) === quoteText) {
          return (
            <blockquote key={i} data-journal-quote className="journal-quote">
              {quote.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && ' '}
                  <span className={j < quote.length - 1 ? 'block text-cream' : 'journal-quote-accent block'}>{line}</span>
                </Fragment>
              ))}
            </blockquote>
          );
        }
        const only = p.length === 1 ? p[0] : undefined;
        if (only !== undefined && typeof only !== 'string' && 'bold' in only) {
          return (
            <p key={i} data-journal-beat className="journal-beat">
              <strong>{withBreaks(only.bold)}</strong>
            </p>
          );
        }
        return (
          <p key={i}>
            <RichRun text={p} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * Dive Deeper: headed sections, technologies and the repo link. `journal` sets it for the
 * journal page (headings and body a step larger, headings in the act's accent).
 */
export function DiveContent({
  dive,
  headingLevel,
  variant = 'default',
}: {
  dive: DiveDeeper;
  headingLevel: 3 | 4;
  variant?: 'default' | 'journal';
}) {
  const H = headingLevel === 3 ? 'h3' : 'h4';
  const journal = variant === 'journal';
  const headingClass = journal ? 'label journal-dive-heading' : 'label';
  return (
    <div className="flex flex-col gap-5">
      {dive.sections.map((s) => (
        <div key={s.heading} className="flex flex-col gap-1.5">
          <H className={journal ? headingClass : 'label text-tangerine'}>{s.heading}</H>
          {s.body.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className={journal ? 'journal-dive-body' : 'text-(length:--fs-ui-base) leading-[1.6] text-text-2 lg:text-(length:--fs-ui-lg)'}>
              {para}
            </p>
          ))}
        </div>
      ))}
      <div className="flex flex-col gap-2.5">
        <H className={journal ? headingClass : 'label text-lilac'}>{storyUi.technologies}</H>
        <ChipList items={dive.technologies} label={storyUi.technologies} />
      </div>
      {dive.link && (
        <Button variant="secondary" href={dive.link.href} external trailing="↗" className="self-start">
          {dive.link.label}
        </Button>
      )}
    </div>
  );
}
