import type { ReactNode } from 'react';
import type { Act as ActData } from './storyContent';

/**
 * An act groups related chapters so they can flow into each other. Not a heading
 * level: the act name is a visual marker on its first chapter (ChapterScene).
 * Hooks for S2: [data-act-group="<id>"], data-sky (the act's keyframe).
 */
export function Act({ act, children }: { act: ActData; children: ReactNode }) {
  return (
    <div data-act-group={act.id} data-sky={act.sky} className="relative">
      {children}
    </div>
  );
}
