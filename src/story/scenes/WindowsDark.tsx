import { Building, IllusFrame } from './illusParts';
import { KEPT_WINDOW, type WindowState } from './illusData';

/**
 * Chapter 13 — layoffs; the product shut down; the team changed; the other interns
 * left; she was the only intern retained. The ch 11 building going dark around her:
 * the sign is off, the rooms that were lit have gone out (the last two still fading),
 * and only her window is still lit.
 * MEDIUM. Hooks: see Building — rect[data-window][data-window-state="dark|fading|kept"]
 * (the ch 11 "soft" rooms, in order, are the ones to darken), [data-sign-state="off"],
 * [data-entrance="dark"].
 */
export function WindowsDark() {
  const state = (r: number, c: number): WindowState => {
    if (r === KEPT_WINDOW.row && c === KEPT_WINDOW.col) return 'kept';
    if ((r === 4 && c === 1) || (r === 2 && c === 2)) return 'fading';
    return 'dark';
  };
  return (
    <IllusFrame name="windows-dark" size="tower-medium">
      <Building id="ch13" windowState={state} sign="off" />
    </IllusFrame>
  );
}
