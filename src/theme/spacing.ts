/**
 * Tu Turno — Spacing, radius, and elevation tokens
 *
 * Spacing is a 4pt base grid. Every margin, padding, and gap in the product
 * must come from this scale. Arbitrary values are how the original designs
 * ended up with elements that almost align but do not.
 */

export const spacing = {
  none: 0,
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
  '5xl': 72,
} as const;

/**
 * Corner radii. The original screens mixed several unrelated radii; these three
 * steps cover chips, cards, and pill-shaped controls.
 */
export const radius = {
  none: 0,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Continuous corners. iOS squircles read as native; circular corners read as
 * web. This is applied to every rounded rectangle in the app.
 */
export const borderCurve = 'continuous' as const;

/** Border widths. */
export const borderWidth = {
  hairline: 1,
  thin: 1.5,
  thick: 2,
} as const;

/**
 * Elevation, expressed as CSS `boxShadow` strings.
 *
 * React Native's legacy `shadow*` (iOS) and `elevation` (Android) props are
 * deprecated and diverge between platforms. `boxShadow` renders identically on
 * both. Shadows are tinted toward navy rather than black so depth reads in the
 * product's own light, and they communicate elevation only — never decoration.
 */
export const elevation = {
  none: { boxShadow: 'none' },
  sm: { boxShadow: '0px 2px 8px rgba(0, 10, 61, 0.18)' },
  md: { boxShadow: '0px 6px 16px rgba(0, 10, 61, 0.24)' },
  lg: { boxShadow: '0px 12px 28px rgba(0, 10, 61, 0.30)' },
} as const;

/**
 * Minimum touch target. Apple and Google both require ~44-48pt; anything
 * smaller fails accessibility review and frustrates users on the move.
 */
export const touchTarget = {
  min: 48,
} as const;

/** Animation durations, in milliseconds. */
export const duration = {
  instant: 120,
  fast: 200,
  normal: 320,
  slow: 480,
} as const;
