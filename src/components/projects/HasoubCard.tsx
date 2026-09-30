import type { LeadProject } from '@/content';
import { Button, ChipList, Rich, middotText } from '@/components/primitives';
import { ActorRing } from './ActorRing';
import { LockGlyph, ProjectDetailsBody } from './ProjectDetails';

export interface HasoubCardProps {
  project: LeadProject;
  /** Width classes from the rail (per mode). */
  sizeClass: string;
  dialogId: string;
  detailsOpen: boolean;
  onOpenDetails: () => void;
}

/**
 * Lead project card (Hasoub Talent Bridge): the widest, night-to-dawn card.
 * The face stays short: label, title, role, the lead sentence, stack chips, the
 * details button and the private status, beside the four-group platform visual.
 * Everything deeper (what the platform is, leadership beats, the full role, the
 * engineering areas, the stack by layer) sits behind "More about the project" (a
 * dialog with JS, an inline <details> without).
 */
export function HasoubCard({ project: p, sizeClass, dialogId, detailsOpen, onOpenDetails }: HasoubCardProps) {
  const titleId = `project-${p.id}`;
  // "Team Lead / Software Engineer" → "Team Lead" + "/ Software Engineer".
  const slash = p.role.indexOf(' / ');
  const rolePrimary = slash < 0 ? p.role : p.role.slice(0, slash);
  const roleSecondary = slash < 0 ? '' : p.role.slice(slash + 1);
  return (
    <article
      aria-labelledby={titleId}
      data-tilt
      data-project-card={p.id}
      className={`relative grid overflow-clip ${sizeClass} grid-cols-1 content-start gap-x-4 gap-y-3.5 rounded-project p-[26px] text-cream md:grid-cols-[minmax(0,1fr)_184px] md:gap-x-7 lg:grid-cols-[minmax(0,1fr)_216px] lg:p-[34px]`}
      style={{ background: 'var(--gradient-card-dawn)', boxShadow: 'var(--shadow-card-dawn)' }}
    >
      <span aria-hidden="true" className="card-gloss" />

      {/*
        Phones: one column; the ring gets its own centred row under the role line, at 2.5×
        its old in-row size (64 / 80 / 92 / 128px → 160 / 200 / 230 / 320px).
        md+: text left, ring right.
      */}
      <p className="label -mb-1.5 text-peach max-md:text-(length:--fs-ui-2xs) md:col-start-1 md:-mb-1">
        {middotText(p.label)}
      </p>
      <h3 id={titleId} className="col-start-1 text-project leading-[1.1] font-bold tracking-[-0.035em]">
        {p.title}
      </h3>

      {/* 14px above (the row gap), ~16px below. Wraps between the two parts on narrow cards. */}
      <p className="project-role mb-0.5 md:col-start-1">
        <span className="project-role__primary">{rolePrimary}</span>{' '}
        {roleSecondary && <span className="project-role__secondary">{roleSecondary}</span>}
      </p>

      <div className="w-[160px] justify-self-center min-[360px]:w-[200px] xs:w-[230px] min-[560px]:w-[320px] md:col-start-2 md:row-span-4 md:row-start-1 md:w-auto md:justify-self-stretch md:self-center">
        <ActorRing actors={p.actors} label={p.visualLabel} className="w-full" />
      </div>

      <p className="text-(length:--fs-ui-base) leading-[1.5] text-pretty text-text-2 md:col-start-1 md:leading-[1.55] lg:text-(length:--fs-ui-lg)">
        <Rich text={p.description} />
      </p>

      <ChipList items={p.chips} variant="bright" className="md:col-span-2" />

      <div className="mt-1 flex flex-wrap md:col-span-2 items-center gap-x-4 gap-y-3">
        <span data-js-only className="flex">
          <Button
            variant="secondary"
            trailing="→"
            onClick={onOpenDetails}
            aria-haspopup="dialog"
            aria-expanded={detailsOpen}
            aria-controls={dialogId}
          >
            <span className="max-xs:hidden">{p.moreLabel}</span>
            <span className="xs:hidden">{p.moreShortLabel}</span>
            <span className="sr-only">: {p.title}</span>
          </Button>
        </span>
        {p.link && (
          <Button variant="cream" href={p.link.href} external={p.link.external} trailing="↗">
            {p.link.label}
            <span className="sr-only">: {p.title}</span>
          </Button>
        )}
        {/* Without JS: the same details, inline (before the status, as with JS). */}
        <details data-nojs-only className="project-details w-full">
          <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-pill px-[22px] py-[14px] text-(length:--fs-ui-base) font-semibold text-cream shadow-outline-cream">
            {p.moreLabel} <span aria-hidden="true">↓</span>
          </summary>
          <div className="mt-4 rounded-[24px] p-5 md:p-6" style={{ background: 'var(--details-fill)' }}>
            <ProjectDetailsBody details={p.details} heading="h4" />
          </div>
        </details>
        {/* A status, not a control: no fill or outline, just the lock and a label. */}
        {!p.link && (
          <p data-private-marker className="label inline-flex items-center gap-2 text-(length:--fs-ui-2xs) whitespace-nowrap text-text-2">
            <LockGlyph className="text-peach" />
            {p.privateLabel}
          </p>
        )}
      </div>
    </article>
  );
}
