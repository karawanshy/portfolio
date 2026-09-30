import type { KeywordTone } from '@/content';

/**
 * Toned keywords (the hero summary, Story ch 18): extra-bold gradient text, one gradient per
 * tone (.keyword-* in global.css; tokens --gradient-kw-*, solid --color-kw-* fallback).
 * Shared by Rich and the Story's RichRun.
 */
export const TONE_CLASS: Record<KeywordTone, string> = {
  lilac: 'keyword keyword-lilac',
  tangerine: 'keyword keyword-tangerine',
  pink: 'keyword keyword-pink',
};
