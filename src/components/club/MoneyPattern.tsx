import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '../../theme';

/**
 * The money motifs, as raw path data rather than an icon package.
 *
 * Lucide and Phosphor both carry these shapes, and either would have meant a
 * dependency measured in hundreds of kilobytes so that six glyphs could print
 * at 5% opacity. `react-native-svg` is already installed and is all that is
 * actually needed.
 *
 * TO REPLACE A MOTIF: paste the `d` attribute of the icon's path here. Both
 * libraries author on the same 24x24 grid this file assumes, so a Lucide or
 * Phosphor path drops in with no other change. Where an icon ships several
 * paths, join them with a space — they render as one stroke either way.
 *
 * The placements, sizing and stroke weight below are independent of which
 * glyphs these are, so swapping artwork never means re-tuning the field.
 */
const MOTIFS = {
  /** lucide/piggy-bank — body with legs and ears, eye, and the coin slot. */
  piggy:
    'M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z M16 10h.01 M2 8v1a2 2 0 0 0 2 2h1',
  /*
    lucide/circle-dollar-sign. Lucide draws the ring as `<circle cx=12 cy=12
    r=10>`; written here as two arcs, which is the same shape and keeps every
    motif a single `d` string.
  */
  coin:
    'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8 M12 18V6',
  /** lucide/circle-euro — the same ring, for the other currency. */
  euro:
    'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z M15 9.4a4 4 0 1 0 0 5.2 M7 12h5',
  /** lucide/landmark — a bank, for where the pot is held. */
  bank:
    'M10 18v-7 M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z M14 18v-7 M18 18v-7 M3 22h18 M6 18v-7',
  /** lucide/dollar-sign — its `<line>` written as a path, same reason as above. */
  sign: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
} as const;

export type Motif = keyof typeof MOTIFS;

export interface Placement {
  motif: Motif;
  /** Percent of the field's width and height, so the layout is resolution free. */
  x: number;
  y: number;
  size: number;
  rotate: number;
}

/**
 * Where the motifs sit.
 *
 * Hand placed, and placed AROUND the content rather than under it. The Club's
 * cards run nearly the full width of the page, so a motif at the centre is
 * simply covered — the first version of this field scattered ten glyphs across
 * the middle and eight of them were never seen. What is left visible is the
 * margin down each side, the band under the header, and the gaps between cards.
 *
 * Not a grid, either. A regular lattice reads as wallpaper and fights the two
 * corner lights the wash is built around; the eye starts counting repeats
 * instead of following the page. Irregular spacing and varying sizes keep it
 * reading as texture.
 *
 * The lower right stays empty. That is where the wash puts its green light,
 * and the two would be arguing over the same corner.
 */
const PLACEMENTS: readonly Placement[] = [
  // The band under the header, above the hero card.
  { motif: 'coin', x: 76, y: 6, size: 46, rotate: 8 },
  { motif: 'sign', x: 92, y: 12, size: 34, rotate: -10 },

  // Down the left margin, outside the cards.
  { motif: 'piggy', x: 3, y: 21, size: 56, rotate: -12 },
  { motif: 'euro', x: -1, y: 43, size: 40, rotate: 6 },
  { motif: 'bank', x: 4, y: 63, size: 48, rotate: 9 },
  { motif: 'coin', x: 0, y: 82, size: 36, rotate: -6 },

  // Down the right margin.
  { motif: 'bank', x: 97, y: 29, size: 44, rotate: -7 },
  { motif: 'piggy', x: 101, y: 52, size: 52, rotate: 10 },
  { motif: 'sign', x: 98, y: 70, size: 36, rotate: -12 },

  // The gap between the hero and the streak card, where the page breathes.
  { motif: 'euro', x: 20, y: 47, size: 38, rotate: -5 },
];

/**
 * Work out each placement's draw-time values.
 *
 * Positions stay percentages, which lets one set of coordinates cover any
 * screen size without a `viewBox` — a stretched viewBox would squash the glyphs
 * themselves along with the field.
 */
function toGlyphs(placements: readonly Placement[]) {
  return placements.map((placement, index) => ({
    ...placement,
    // Motifs are authored on a 24-unit grid; this carries them to `size`.
    scale: placement.size / 24,
    id: `${placement.motif}-${index}`,
  }));
}

/** The page-wide field, resolved once since its input never changes. */
const PAGE_GLYPHS = toGlyphs(PLACEMENTS);

interface MoneyPatternProps {
  /**
   * Which motifs to draw and where, as percentages of THIS component's box.
   *
   * Defaults to the page-wide field. Passing a set makes the component a
   * reusable field over whatever it is placed in — the header band uses that to
   * carry the same texture across its own, much shorter, area.
   */
  placements?: readonly Placement[];
  /**
   * Ink for the motifs. Defaults to the theme's primary text, which is what
   * makes the pattern invert on its own: dark marks on the light wash, light
   * marks on the dark one.
   */
  color?: string;
  /**
   * Deliberately low. This sits under the medal, the tier name and the points
   * bar — everything the screen is actually about — so it may never compete for
   * contrast. Above roughly 0.08 it stops being texture and starts being a
   * second layer of content.
   */
  opacity?: number;
}

/**
 * A field of money motifs, laid under the Club's wash.
 *
 * The Club is the one screen that is purely about standing rather than about
 * doing, so it can carry decoration the rest of the product should not. This is
 * that decoration, and it is kept faint on purpose: it should register as the
 * page having a surface, not as something to look at.
 */
export function MoneyPattern({
  placements,
  color,
  opacity = 0.07,
}: MoneyPatternProps) {
  const theme = useTheme();
  const ink = color ?? theme.text.primary;

  // The default set is already resolved; a caller's set is resolved per render,
  // which is cheap for the handful of glyphs a field ever holds.
  const glyphs = placements ? toGlyphs(placements) : PAGE_GLYPHS;

  /*
    The field is measured, not expressed in percentages.

    Percent coordinates on a `<G>` need a coordinate system to resolve against,
    and an `<Svg>` sized `width="100%"` with no `viewBox` does not establish
    one — so every glyph resolved to nothing and the pattern rendered blank
    while still compiling and running without complaint.

    A `viewBox` would fix the coordinates but break the artwork: stretching a
    square viewBox over a tall screen squashes the glyphs along with the field.
    Measuring gives real pixels for the positions AND leaves each motif at its
    true proportions.
  */
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
      }}
    >
      {/* Nothing to place until the field has been measured. */}
      {size.width > 0 && (
      <Svg width={size.width} height={size.height} opacity={opacity}>
        {glyphs.map((glyph) => (
          <G
            key={glyph.id}
            x={(glyph.x / 100) * size.width}
            y={(glyph.y / 100) * size.height}
          >
            {/*
              Centre the glyph on its placement point.

              The shift is a flat -12, not -12 scaled: it is applied in the
              motif's own 24-unit space, where the centre is at 12,12 whatever
              the glyph's final size. Scaling the shift as well would move each
              motif off its mark by an amount that grew with its size.
            */}
            <G
              scale={glyph.scale}
              rotation={glyph.rotate}
              origin="12, 12"
              translate="-12, -12"
            >
              <Path
                d={MOTIFS[glyph.motif]}
                stroke={ink}
                /*
                  Stated in the 24-unit space the paths are authored in, so this
                  is Lucide's own stroke weight rather than a re-guess of it.
                  The surrounding `scale` carries it to screen size along with
                  the geometry, which is what keeps a large motif from being
                  drawn with a proportionally fatter line than a small one.
                */
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </G>
          </G>
        ))}
      </Svg>
      )}
    </View>
  );
}
