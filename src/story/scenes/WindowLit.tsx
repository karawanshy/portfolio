import { Building, IllusFrame } from './illusParts';
import { KEPT_WINDOW, OCCUPIED_WINDOWS as OCCUPIED, type WindowState } from './illusData';

/**
 * Chapter 11 — "finally, I was inside." A building at first light that is alive:
 * its sign on, several rooms softly lit, and her window the brightest of them. The
 * date she joined sits beneath (a fact from the story).
 * QUIET (small). Rhymes with ch 13: same building, same window.
 * Hooks: see Building ([data-window-state="soft|kept|dark"], [data-sign-state="on"], [data-entrance="lit"]); [data-date].
 */
export function WindowLit({ date }: { date: string }) {
  const state = (r: number, c: number): WindowState =>
    r === KEPT_WINDOW.row && c === KEPT_WINDOW.col ? 'kept' : OCCUPIED.has(`${r}-${c}`) ? 'soft' : 'dark';
  return (
    <IllusFrame name="window" size="tower">
      <Building id="ch11" windowState={state} sign="on">
        <text
          data-date
          x="130"
          y="366"
          textAnchor="middle"
          className="font-display"
          fontSize="14"
          fontWeight={700}
          letterSpacing="2.6"
          fill="var(--color-peach)"
        >
          {date}
        </text>
      </Building>
    </IllusFrame>
  );
}
