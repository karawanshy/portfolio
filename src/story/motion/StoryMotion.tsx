import { memo, useEffect } from 'react';
import { usePrefersReducedMotion } from '@/motion/usePrefersReducedMotion';
import { useStoryScenes } from './useStoryScenes';
import { useStoryStage } from './useStoryStage';

/**
 * The Story's motion layer (renders nothing). Lives in the Story chunk and only
 * touches the DOM from effects, so prerendering and hydration are unaffected.
 * Reduced motion: the stage keeps React's per-act sky (an instant swap) and the
 * scenes show their final states. `[data-story][data-motion="on|reduced"]` marks
 * when that has been applied (after hydration).
 */
export const StoryMotion = memo(function StoryMotion() {
  const reduced = usePrefersReducedMotion();
  useStoryStage(!reduced);
  useStoryScenes({ motion: !reduced });
  // Runs after the hooks' effects: marks the page once motion (or its final states) is applied.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-story]');
    if (!root) return;
    root.dataset.motion = reduced ? 'reduced' : 'on';
    return () => {
      delete root.dataset.motion;
    };
  }, [reduced]);
  return null;
});
