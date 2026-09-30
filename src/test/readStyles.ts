import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * The site's own CSS as one string, the way the build sees it: global.css with its relative
 * `@import './…'` partials inlined in order (package imports such as tailwindcss are skipped).
 * For tests that check a CSS value mirrors a motion/config.ts value.
 */
export function readStyles(file = resolve(process.cwd(), 'src/styles/global.css')): string {
  return readFileSync(file, 'utf8').replace(/^@import '(\.[^']+)';$/gm, (_, rel: string) =>
    readStyles(resolve(dirname(file), rel)),
  );
}
