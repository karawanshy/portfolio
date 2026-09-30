import { Button } from '@/components/primitives';
import { storyUi } from './storyContent';

/**
 * Chapter 18's ending: the contact links (values from src/content.ts). The way back to the
 * portfolio is the header's ← Portfolio.
 * Phones: the sun sits low on the right, so the controls start at the page gutter (out of the
 * chapter-mark column) and stay left of the sun's column (tokens.css --story-ending-max-w): one
 * control per row, the socials paired, the email pill a step more compact.
 */
export function StoryEnding() {
  const { email, socials } = storyUi.ending;
  return (
    <div
      data-story-ending
      className="mt-4 flex flex-wrap gap-3 max-md:-ml-10 max-md:max-w-(--story-ending-max-w) [&_a]:whitespace-nowrap"
    >
      <Button variant="cream" href={email.href} trailing="→" className="max-md:gap-2 max-md:px-4 max-md:text-(length:--fs-story-ending-pill-sm)">
        {email.label}
      </Button>
      {socials.map((s) => (
        // Filled: the ending sits on the sunrise glow, where an outline-only pill loses contrast.
        <Button key={s.label} variant="secondary" href={s.href} external trailing="↗" className="bg-(--pill-fill)">
          {s.label}
        </Button>
      ))}
    </div>
  );
}
