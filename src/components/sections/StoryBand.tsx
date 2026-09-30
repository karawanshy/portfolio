import { sectionIds, storyBand } from '@/content';
import { middotText } from '@/components/primitives';
import { Link } from '@/router/Link';

/**
 * Full-width lilac band; the whole band links to /story. `[data-story-orb]` is where
 * the Portfolio ↔ Story transition's orb grows from / returns to (router/transition.ts):
 * when the Story was opened here, or opened directly (it lands on /#story).
 */
export function StoryBand() {
  return (
    <section id={sectionIds.story} aria-labelledby="story-band-title" className="px-gutter pt-[50px] pb-[30px]">
      <Link
        href={storyBand.href}
        data-story-origin="band"
        data-lit
        className="relative grid items-center gap-8 overflow-hidden rounded-band px-6 py-8 no-underline transition-[filter] duration-200 hover:brightness-110 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 lg:px-12 lg:py-10"
        style={{
          background: 'var(--story-band-fill)',
          boxShadow: 'var(--shadow-story-band)',
        }}
      >
        <div className="flex flex-col gap-3.5">
          <p className="label text-lilac">{middotText(storyBand.label)}</p>
          <h2 id="story-band-title" className="text-band leading-[1.1] font-bold tracking-[-0.035em]">
            {storyBand.title}
          </h2>
          <p className="max-w-[640px] text-(length:--fs-ui-lg) leading-[1.55] text-text-2">{storyBand.body}</p>
        </div>
        <span
          aria-hidden="true"
          data-story-orb
          className="flex size-24 items-center justify-center rounded-full text-center font-display text-(length:--fs-ui-sm) leading-[1.2] font-bold text-deep"
          style={{ background: 'var(--gradient-story-orb)', boxShadow: '0 0 60px -6px var(--color-lilac)' }}
        >
          {storyBand.orb[0]}
          <br />
          {storyBand.orb[1]}
        </span>
      </Link>
    </section>
  );
}
