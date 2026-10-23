/**
 * 026 — pure logic for the header's responsive menu, modelled on Designsystemet's own site header
 * (digdir/designsystemet `internal/components/src/header/header.tsx`): instead of a fixed
 * breakpoint, the header switches to the hamburger menu when the menu items no longer fit on one
 * line, and back only once the window is clearly wider than where it switched.
 */

/** Extra width (px) the window must gain past the switch point before the full menu returns. */
export const HAMBURGER_SAFETY_MARGIN = 50;

/** True when any item sits lower than the one before it, i.e. the flex row has wrapped. */
export function itemsWrap(rects: ReadonlyArray<{ bottom: number }>): boolean {
  for (let i = 1; i < rects.length; i += 1) {
    if (rects[i]!.bottom > rects[i - 1]!.bottom) return true;
  }
  return false;
}

/**
 * The next menu mode. In hamburger mode the full menu returns only when the window is wider than
 * the width at which it switched plus the safety margin (hysteresis, so it does not flicker at the
 * boundary); in full-menu mode it switches as soon as the items wrap.
 */
export function nextHamburgerState({
  isHamburger,
  switchedAtWidth,
  windowWidth,
  wrapped,
}: {
  isHamburger: boolean;
  switchedAtWidth: number;
  windowWidth: number;
  wrapped: boolean;
}): { isHamburger: boolean; switchedAtWidth: number } {
  if (isHamburger) {
    return windowWidth > switchedAtWidth + HAMBURGER_SAFETY_MARGIN
      ? { isHamburger: false, switchedAtWidth }
      : { isHamburger: true, switchedAtWidth };
  }
  return wrapped
    ? { isHamburger: true, switchedAtWidth: windowWidth }
    : { isHamburger: false, switchedAtWidth };
}
