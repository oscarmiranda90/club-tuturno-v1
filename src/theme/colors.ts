/**
 * Tu Turno — Color tokens
 *
 * LAYER 1 (brand) is the sacred palette. Those four values are the brand and
 * must never be edited without an explicit brand decision.
 *
 * LAYER 2 (derived) are tints and shades computed from the brand colors. They
 * exist because four colors cannot express surface elevation, disabled states,
 * or borders. They are derived, not invented.
 *
 * LAYER 3 (functional) covers states the brand palette does not define but the
 * product genuinely needs: overdue payments, warnings. Chosen to harmonize with
 * navy, never used decoratively.
 *
 * LAYER 4 (semantic) is what components consume. Components must import from
 * `semantic` only — never from `brand` or `derived` directly. This is what makes
 * a future rebrand a single-file change.
 */

// ---------------------------------------------------------------------------
// LAYER 1 — Brand (sacred, do not modify)
// ---------------------------------------------------------------------------

export const brand = {
  navy: '#0023D1',
  mint: '#20D672',
  sky: '#4FA8FF',
  ash: '#EDEDED',
} as const;

// ---------------------------------------------------------------------------
// LAYER 2 — Derived scales
// ---------------------------------------------------------------------------

/**
 * Navy scale. Used for the app background and every elevated surface on top of
 * it. The original designs used four undeclared blues; this scale replaces that
 * guesswork with named steps.
 */
const navy = {
  900: '#000F5C', // deepest — page background
  800: '#001585', // sunken surface
  700: '#001BAB', // recessed panel
  600: '#0023D1', // brand navy — reference point
  500: '#1A3BDA', // raised surface
  400: '#3453E2', // hovered / pressed surface
  300: '#5470E9', // borders on dark
  200: '#8AA0F1', // muted text on dark
  100: '#C4D0F8', // secondary text on dark
} as const;

/** Mint scale. Reserved for money received and successful outcomes. */
const mint = {
  700: '#0E8F49',
  600: '#17B25D',
  500: '#20D672', // brand mint — reference point
  400: '#4DDE8E',
  300: '#7AE7AB',
  100: '#D6F8E5',
} as const;

/** Sky scale. Informational states and upcoming schedule items. */
const sky = {
  700: '#2A6FA8',
  600: '#3A8ACC',
  500: '#4FA8FF', // brand sky — reference point
  400: '#76BCFF',
  300: '#9CCFFF',
  100: '#E0EFFF',
} as const;

/** Neutral scale, tinted toward navy so it never reads as a foreign gray. */
const neutral = {
  0: '#FFFFFF',
  50: '#F7F8FC',
  100: '#EDEDED', // brand ash — reference point
  200: '#D8DCE8',
  300: '#B4BBCE',
  400: '#8A93AC',
  500: '#5F6880',
  900: '#0B0F1F', // off-black, never pure #000
} as const;

// ---------------------------------------------------------------------------
// LAYER 3 — Functional states
// ---------------------------------------------------------------------------

/**
 * Danger and warning are not in the brand palette, but the existing screens
 * already use them (overdue chips, the retirement warning on the SAN terms
 * screen). Declaring them here replaces ad-hoc values with system values.
 *
 * Both scales are DERIVED from the brand rather than picked by eye. They inherit
 * mint's exact saturation (0.74 HLS), which is what keeps them in the same
 * visual family as the palette instead of shouting over it. A pure red at full
 * saturation would dominate every screen it appears on.
 *
 * Lightness is tuned for contrast, not for looks: danger.500 sits at 4.80:1
 * against the navy canvas, clearing WCAG AA for text. A more conventional
 * darker red measured 3.95:1 and failed — unreadable for the one message that
 * tells a user they owe money.
 */
const danger = {
  600: '#BA1C26', // pressed / filled surfaces only, never text on navy
  500: '#E65660', // AA on canvas (4.80:1)
  400: '#E86871', // AA on raised surfaces
  100: '#F8D3D5', // text on a filled danger surface
} as const;

/**
 * Amber. Warnings are advisory, not blocking, so this scale reads clearly
 * without the urgency of danger. All steps clear AA on the navy canvas.
 */
const warning = {
  600: '#BA801C',
  500: '#E3A945', // AA on canvas (8.20:1)
  400: '#EABE71',
  100: '#F8EBD3',
} as const;

/**
 * Machine yellow, for the turn clock's payment hand.
 *
 * Deliberately outside the `warning` scale. That scale is tuned for text and
 * chips, so its steps are darkened until they clear AA — which turns yellow
 * into mustard. This hand is a large graphic shape, not a label, and it is
 * read by shape and hue rather than by contrast against a body of text, so it
 * gets to be the actual colour.
 *
 * Anything set ON this colour must carry its own dark ink: at 1,4:1 against
 * the canvas, yellow type would be unreadable.
 */
const machine = {
  500: '#FFCD11', // the hand itself
  700: '#8A6B00', // ink and labels that must sit on or beside it
} as const;

export const palette = { navy, mint, sky, neutral, danger, warning, machine } as const;

// ---------------------------------------------------------------------------
// LAYER 4 — Semantic tokens (the only layer components should import)
// ---------------------------------------------------------------------------

/**
 * Both themes are defined day one. A screen is not done until it renders
 * correctly in light AND dark — retrofitting a second theme after forty screens
 * means auditing forty screens.
 *
 * Navy is the brand's home in dark mode. In light mode the roles invert: white
 * surfaces carry the app and navy becomes the ink and the structural accent.
 */
function buildTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  return {
    mode,

    surface: {
      // Canvas is a near-white gray, not pure white: it lets white cards read
      // as raised surfaces without needing a border or a shadow to say so.
      canvas: isDark ? navy[900] : neutral[50],
      raised: isDark ? navy[700] : neutral[0],
      overlay: isDark ? navy[500] : neutral[0],
      inset: isDark ? navy[800] : neutral[100],

      /**
       * The one saturated surface on the screen. It carries the payout figure —
       * the single question the user opens this app to answer.
       *
       * It is deliberately scarce. A second brand-colored tile would turn an
       * accent back into a background, which is the exact problem this palette
       * moved away from: on a white canvas, contrast is the hierarchy.
       */
      /**
       * In light the tile is darker than its canvas; in dark it has to be
       * lighter, or the one surface carrying the payout figure sinks into the
       * background it is meant to lead. Elevation reads as contrast against
       * the ground, not as a fixed color.
       */
      brand: isDark ? navy[500] : navy[600],
      brandInset: isDark ? navy[400] : navy[500],
      brandBorder: isDark ? navy[400] : navy[500],

      /**
       * Canvas wash: a tint of brand navy at the top of the screen, fading to
       * the flat canvas before any body text begins.
       *
       * It stops early on purpose. Secondary text on this screen is a mid gray,
       * and a wash that carried navy down into it would cost legibility for
       * decoration — so the color lives only behind the hero area, where the
       * only things on top of it are large type and the ring.
       */
      canvasWash: isDark
        ? ([navy[800], navy[900], navy[900]] as const)
        : (['#A6B8F2', '#DDE4FA', neutral[50]] as const),

      /**
       * Upward brand glow for the pinned action bar.
       *
       * The offset is negative and the blur wide because the bar sits flush to
       * the bottom edge: a conventional downward shadow would fall off-screen
       * and read as nothing. Tinted navy rather than black so the lift belongs
       * to the brand instead of looking like a generic elevation.
       */
      /**
       * Upward brand glow for the pinned action bar.
       *
       * Rendered by a caster that sits BEHIND the scroll view, so the light
       * fills the gaps around the cards without tinting the cards themselves as
       * they scroll past. Being behind the content costs some intensity, hence
       * the high alpha — a value tuned for a shadow drawn on top would vanish
       * here.
       */
      brandGlow: isDark
        ? '0px -3px 12px rgba(53, 155, 255, 0.75)'
        : '0px -3px 12px rgba(0, 35, 209, 0.65)',

      /**
       * The same glow cast downward, for a header sheet pinned to the top of
       * the screen. Direction is not cosmetic here: a shadow has to fall away
       * from the edge its surface is anchored to, or it reads as a seam rather
       * than as depth.
       */
      brandGlowDown: isDark
        ? '0px 3px 12px rgba(53, 155, 255, 0.75)'
        : '0px 3px 12px rgba(0, 35, 209, 0.65)',

      /**
       * The same downward glow in danger red, for when the user has an overdue
       * installment.
       *
       * Colour is the fastest signal on a screen — faster than any sentence —
       * and delinquency is the one state where the whole page should say so
       * before the user reads a word. It is deliberately the same red as the
       * payment button, so the light and the action agree about what is wrong.
       */
      dangerGlowDown: isDark
        ? '0px 3px 12px rgba(232, 104, 113, 0.70)'
        : '0px 3px 12px rgba(186, 28, 38, 0.55)',

      /**
       * A broad, transparent bloom that drifts beneath the header's fixed
       * contour glow. The fully transparent ends keep it from reading as a
       * coloured strip when it crosses the screen.
       */
      headerGlowBloom: isDark
        ? (['rgba(53, 155, 255, 0)', 'rgba(53, 155, 255, 0.42)', 'rgba(53, 155, 255, 0)'] as const)
        : (['rgba(79, 168, 255, 0)', 'rgba(79, 168, 255, 0.34)', 'rgba(79, 168, 255, 0)'] as const),
      dangerGlowBloom: isDark
        ? (['rgba(232, 104, 113, 0)', 'rgba(232, 104, 113, 0.36)', 'rgba(232, 104, 113, 0)'] as const)
        : (['rgba(186, 28, 38, 0)', 'rgba(186, 28, 38, 0.28)', 'rgba(186, 28, 38, 0)'] as const),

      /**
       * Canvas wash for the delinquent state. Same shape as `canvasWashTop`,
       * tinted red, and deliberately paler: a saturated red page would read as
       * an error the user caused rather than a bill they can settle.
       */
      canvasWashDanger: isDark
        ? (['#4A1218', '#2A0D11', navy[900]] as const)
        : (['#F6C9CC', '#FBE4E6', neutral[50]] as const),

      /** Two-day warning wash used by the V3 turn clock. */
      canvasWashWarning: isDark
        ? (['#4C350D', '#2C210D', navy[900]] as const)
        : (['#F8DE9E', '#FCECC8', neutral[50]] as const),

      /**
       * State washes that rise from the FOOT of the screen instead of falling
       * from the top.
       *
       * A warm wash poured over the whole page put every white card on a yellow
       * ground, and white against warm is a temperature clash rather than a
       * contrast one — measured, the card and that wash sit 1,32:1 apart, so
       * nothing was gained by the collision either.
       *
       * Rising from the bottom puts the colour where the cards are not, leaves
       * the header and the content on neutral ground, and reads as something
       * approaching rather than something already on top of you.
       *
       * Transparent at the first stop so they layer over the brand wash rather
       * than replacing it.
       */
      canvasRiseWarning: isDark
        ? (['rgba(76, 53, 13, 0)', 'rgba(76, 53, 13, 0.55)', '#4C350D'] as const)
        : (['rgba(248, 222, 158, 0)', 'rgba(248, 222, 158, 0.62)', '#F6D98F'] as const),

      canvasRiseDanger: isDark
        ? (['rgba(74, 18, 24, 0)', 'rgba(74, 18, 24, 0.55)', '#4A1218'] as const)
        : (['rgba(246, 201, 204, 0)', 'rgba(246, 201, 204, 0.66)', '#F4BFC3'] as const),


      /**
       * Wash for a layout whose brand surface sits at the TOP. The gradient
       * starts where the glow lands and resolves into the canvas further down,
       * so the blue reads as light spilling out of the header instead of as a
       * band painted behind it. Denser at the first stop than the hero wash,
       * because here it begins under a saturated surface rather than under
       * open canvas.
       */
      canvasWashTop: isDark
        ? ([navy[800], navy[900], navy[900]] as const)
        : (['#B7C6F5', '#E2E8FB', neutral[50]] as const),

      /**
       * The Club's own wash: navy at the top, resolving through the canvas into
       * the faintest mint at the very bottom.
       *
       * Mint appears nowhere else as a background, and that is deliberate — it
       * is the colour of money received and of the primary action, and a screen
       * painted in it would spend the one accent the product has. Here it earns
       * its place: the Club IS the record of good standing, so the page ends in
       * the colour of having done well.
       *
       * Three roles, not three stops: [0] is the blue overhead, [1] is the wide
       * near-white light in the bottom-left, and [2] is the small green light
       * in the bottom-right. `ClubWash` in `ClubScreen.tsx` composes them.
       *
       * [2] is more saturated than a flat gradient stop would be because it is
       * drawn with falloff — most of its area renders at partial opacity, so a
       * pale value would arrive as nothing at all. An earlier flat version of
       * this wash was invisible on both themes; these are the values where the
       * colour actually shows up.
       */
      canvasWashClub: isDark
        ? ([navy[600], navy[800], '#1FA96B'] as const)
        : (['#AFC1F4', '#F4F7FE', '#7FE0AE'] as const),

      /**
       * One gradient per medal, for the Club hero and the benefits carousel.
       *
       * These are the only place in the palette where colour carries identity
       * rather than state, and it is earned: the medal is the single thing this
       * product asks a user to work months for, and four navy tiles would make
       * Bronce and Diamante look like the same achievement.
       *
       * They are metals, not hues picked for prettiness — each runs from a dark
       * shadow to the metal's own highlight, which is what makes an alloy read
       * as an alloy rather than as a coloured rectangle. Diamante deliberately
       * breaks the metal logic: it is the one tier that is not a metal, so it
       * takes the brand navy and reads as a different KIND of thing, which is
       * exactly its standing in the Club.
       *
       * Three stops each, dark → mid → light, applied on a diagonal.
       *
       * The lightest stop is the binding constraint, not a style choice: white
       * type sits on these, so every stop has to clear 4.5:1 against white. A
       * first pass used the actual highlight of each metal and measured 2.1:1
       * on silver — the medal looked right and the tier name underneath it was
       * unreadable. These are the darkened values where the sweep still reads
       * as an alloy and the type still passes:
       *
       *   bronce 5.72:1 · plata 4.53:1 · oro 4.62:1 · diamante 4.61:1
       *
       * Anything lighter fails. Re-measure before changing one.
       */
      tierGradient: {
        bronce: ['#4A2A11', '#6E4220', '#8F5A2E'] as const,
        plata: ['#33404F', '#4C5C70', '#66788D'] as const,
        oro: ['#4F3A0A', '#735510', '#946F1C'] as const,
        diamante: [navy[700], navy[500], '#4A6BE8'] as const,
      },
    },

    text: {
      primary: isDark ? neutral[0] : neutral[900],
      secondary: isDark ? navy[100] : neutral[500],
      muted: isDark ? navy[200] : neutral[400],
      inverse: isDark ? neutral[900] : neutral[0],
      accent: isDark ? mint[500] : mint[700],

      /**
       * Text sitting on `surface.brand`. Navy is dark in both themes, so these
       * stay light in both — they follow the surface, not the mode.
       */
      onBrand: neutral[0],
      onBrandMuted: navy[100],
    },

    border: {
      subtle: isDark ? navy[500] : neutral[200],
      strong: isDark ? navy[300] : neutral[300],
      accent: mint[500],
    },

    /**
     * Primary action is mint: the main action in this product is financial and
     * positive. Danger is reserved for destructive actions and must never be
     * used for a payment CTA — red reads as "cancel" to every user alive.
     */
    action: {
      primary: isDark ? mint[500] : mint[600],
      primaryPressed: isDark ? mint[600] : mint[700],
      primaryDisabled: isDark ? navy[500] : neutral[200],
      primaryText: isDark ? navy[900] : neutral[0],
      primaryTextDisabled: isDark ? navy[200] : neutral[400],
      secondaryBorder: isDark ? navy[300] : neutral[300],
      secondaryText: isDark ? neutral[0] : neutral[900],
    },

    /**
     * Installment states. Each pairs a color with a distinct glyph at the
     * component level, so the schedule stays readable for color-blind users —
     * roughly 8% of men, on the screen where users decide whether they owe money.
     */
    schedule: {
      paidBg: isDark ? navy[800] : neutral[100],
      paidText: isDark ? navy[200] : neutral[400],
      paidBorder: 'transparent',

      dueBg: isDark ? danger[500] : danger[600],
      dueText: neutral[0],
      dueBorder: isDark ? danger[400] : danger[600],

      turnBg: isDark ? neutral[0] : navy[600],
      turnText: isDark ? navy[900] : neutral[0],
      turnBorder: mint[500],

      upcomingBg: isDark ? sky[500] : sky[600],
      upcomingText: neutral[0],
      upcomingBorder: 'transparent',

      futureBg: isDark ? navy[700] : neutral[0],
      futureText: isDark ? navy[100] : neutral[500],
      futureBorder: isDark ? navy[500] : neutral[200],
    },

    status: {
      success: isDark ? mint[500] : mint[600],
      info: isDark ? sky[500] : sky[600],
      danger: isDark ? danger[500] : danger[600],
      warning: isDark ? warning[500] : warning[600],
      dangerSurface: isDark ? danger[600] : danger[500],

      /**
       * The payment hand on the turn clock, and the ink that labels it.
       *
       * Same yellow in both themes: it is a machine colour, and dimming it for
       * light mode is what turned it to mustard in the first place. The label
       * is what changes — dark ink on light, the yellow itself on dark, where
       * the ground is navy and the yellow reads cleanly on its own.
       */
      machine: machine[500],
      machineInk: isDark ? machine[500] : machine[700],
    },

    money: {
      positive: isDark ? mint[500] : mint[700],
      neutral: isDark ? neutral[0] : neutral[900],
      negative: isDark ? danger[400] : danger[600],
    },
  } as const;
}

export const darkTheme = buildTheme('dark');
export const lightTheme = buildTheme('light');

export type Theme = ReturnType<typeof buildTheme>;

/** Kept as the dark-mode default so existing imports keep working. */
export const colors = darkTheme;
