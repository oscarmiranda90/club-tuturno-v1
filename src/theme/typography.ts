import type { TextStyle } from 'react-native';

/**
 * Tu Turno — Typography tokens
 *
 * The original screens used at least six unrelated font sizes with no
 * mathematical relationship. This is a fixed modular scale: every step is a
 * deliberate ratio of the one below it, so hierarchy is systematic rather than
 * decided per screen.
 *
 * Outfit is the display and text family — a geometric sans with enough
 * character to avoid looking generic, and wide enough numerals to read clearly
 * at large sizes, which matters for currency figures.
 */

export const fontFamily = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

/** Modular scale, ~1.25 ratio, rounded to whole pixels. */
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 25,
  '2xl': 31,
  '3xl': 39,
  '4xl': 48,
} as const;

/**
 * Line heights. Tight for display figures where leading would create gaps,
 * relaxed for body copy where it aids reading.
 */
export const lineHeight = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.45,
  relaxed: 1.6,
} as const;

/** Negative tracking on large text prevents the airy look of default spacing. */
export const letterSpacing = {
  tighter: -1.2,
  tight: -0.5,
  normal: 0,
  wide: 0.4,
  wider: 1.2,
} as const;

/** Shared tabular-numerals setting, typed as mutable for RN's TextStyle. */
const TABULAR: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Composed text styles. Components should use these rather than assembling
 * family + size + height by hand, which is how inconsistency creeps back in.
 */
export const textStyles = {
  /**
   * Currency figures. The largest type in the product.
   *
   * Tabular numerals are required on anything that counts or holds money: with
   * proportional figures a balance updating from 99 to 100 shifts every digit
   * sideways, which reads as instability on a financial screen.
   */
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: Math.round(fontSize['4xl'] * lineHeight.tight),
    letterSpacing: letterSpacing.tighter,
    fontVariant: TABULAR,
  },
  displaySm: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: Math.round(fontSize['3xl'] * lineHeight.tight),
    letterSpacing: letterSpacing.tighter,
    fontVariant: TABULAR,
  },

  /** Section and card headings. */
  title: {
    fontFamily: fontFamily.semibold,
    fontVariant: TABULAR,
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.snug),
    letterSpacing: letterSpacing.tight,
  },
  titleSm: {
    fontFamily: fontFamily.semibold,
    fontVariant: TABULAR,
    fontSize: fontSize.lg,
    lineHeight: Math.round(fontSize.lg * lineHeight.snug),
    letterSpacing: letterSpacing.tight,
  },

  /** Body copy. */
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * lineHeight.normal),
    letterSpacing: letterSpacing.normal,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * lineHeight.normal),
    letterSpacing: letterSpacing.normal,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.relaxed),
    letterSpacing: letterSpacing.normal,
  },

  /** Labels on controls and chips. */
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.snug),
    letterSpacing: letterSpacing.normal,
  },
  labelSm: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeight.snug),
    letterSpacing: letterSpacing.normal,
  },

  /** Uppercase eyebrow text. Tracking is widened to stay legible in caps. */
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeight.snug),
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },

  /** Button text. */
  button: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    lineHeight: Math.round(fontSize.md * lineHeight.snug),
    letterSpacing: letterSpacing.normal,
  },
} satisfies Record<string, TextStyle>;

export type TextStyleToken = keyof typeof textStyles;
