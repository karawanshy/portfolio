import { chapters } from './storyContent';

/**
 * Bottom progress "horizon line": one mark per chapter; marks up to the current
 * chapter are lit. Decorative (the header names the current chapter; the chapter
 * index is the navigable list). Short screens: a shallower band (more room for pinned scenes).
 * S2 hooks: [data-progress-fill] (scaleX 0→1 with overall progress, transform-origin left;
 * motion sets `--progress` on it for a continuous fill, overriding the per-chapter value),
 * [data-progress-mark="N"] with data-state="past|current|future".
 */
export function StoryProgress({ current }: { current: number }) {
  return (
    <div
      aria-hidden="true"
      data-story-progress
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-gutter pt-10 pb-3.5 lg:pt-12 lg:pb-5 [@media(max-height:480px)]:pt-6 [@media(max-height:480px)]:pb-2.5"
      style={{ background: 'var(--story-progress-fade)' }}
    >
      <div className="relative mx-auto flex h-3 max-w-[1100px] items-center justify-between">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-[2px]" style={{ background: 'var(--story-progress-track)' }} />
        <div
          data-progress-fill
          className="absolute inset-x-0 top-1/2 h-0.5 origin-left rounded-[2px]"
          style={{
            background: 'var(--gradient-main)',
            transform: `translateY(-50%) scaleX(var(--progress, ${current / (chapters.length - 1)}))`,
          }}
        />
        {chapters.map((c) => {
          const state = c.number < current ? 'past' : c.number === current ? 'current' : 'future';
          return (
            <span
              key={c.id}
              data-progress-mark={c.number}
              data-state={state}
              // One box size for every state; the state only scales it (no layout shift).
              className={`relative size-2.5 rounded-full transition-[scale] duration-300 motion-reduce:transition-none ${
                state === 'current' ? 'bg-pink' : state === 'past' ? 'scale-60 bg-tangerine' : 'scale-60 bg-muted/60'
              }`}
              style={state === 'current' ? { boxShadow: '0 0 12px var(--color-pink)' } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
