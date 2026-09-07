/**
 * Tu Turno — Vertical scale
 *
 * A screen's usable height, expressed as a factor the layout can multiply by.
 *
 * The Club screen clips rather than scrolls: its sections divide one fixed
 * height between them. That works on the phone it was designed against and
 * degrades on every phone shorter than it, because the content keeps asking
 * for the same pixels regardless of how many there are.
 *
 * A boolean does not fix that. `compact` — the flag this replaces — treats a
 * 667pt SE and a 699pt mini identically while splitting two devices 2pt apart
 * into different layouts. What the screen actually needs is a number that
 * tracks the height it was given, so 40pt less room means everything gives up
 * a little rather than one breakpoint giving up a lot.
 */

/**
 * The height this screen's proportions were drawn against: an iPhone 15 Pro's
 * 852pt frame less its safe-area insets. At this height the scale is exactly 1
 * and every token renders at its authored value.
 */
export const DESIGN_HEIGHT = 760;

/**
 * The floor.
 *
 * Below roughly 0.78 the mascot stops reading as a character and the meter's
 * milestone chips start colliding with their own labels — the layout is no
 * longer small, it is broken. A screen shorter than this scale allows gets a
 * layout that overflows slightly rather than one that has been crushed into
 * illegibility, which is the better failure.
 */
const MIN_SCALE = 0.78;

/** Never scale up. Extra height is left as breathing room, not spent on bigger type. */
const MAX_SCALE = 1;

/**
 * The vertical scale factor for a given usable height.
 *
 * `usableHeight` is the frame height less the safe-area insets — the space the
 * layout can actually draw in, not the screen's physical size.
 *
 * Returns 1 while the height is still being measured, so the first frame
 * renders at the authored size rather than at the floor and then jumping.
 */
export function verticalScale(usableHeight: number): number {
  if (usableHeight <= 0) return MAX_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, usableHeight / DESIGN_HEIGHT));
}

/**
 * Scale a value and round it to a whole pixel.
 *
 * Fractional sizes are legal in React Native but land on half pixels, which
 * softens borders and 1pt rules — exactly the elements whose crispness the eye
 * uses to judge whether a screen is well made.
 */
export function scaled(value: number, scale: number): number {
  return Math.round(value * scale);
}

/**
 * Scale a value, but never below a floor.
 *
 * For anything with a hard minimum of its own: touch targets that must stay at
 * 48pt, gaps that stop separating anything below a few points, borders that
 * disappear entirely when rounded down.
 */
export function scaledMin(value: number, scale: number, min: number): number {
  return Math.max(min, Math.round(value * scale));
}
