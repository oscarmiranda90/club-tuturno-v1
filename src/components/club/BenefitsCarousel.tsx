import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Text } from '../Text';
import { Medal } from './Medal';
import { MoneyPattern, type Placement } from './MoneyPattern';
import {
  LADDER_CEILING,
  LADDER_SANES_REQUIRED,
  LADDER_STEP,
  TIERS,
  money,
  type Tier,
} from '../../domain';
import {
  borderCurve,
  borderWidth,
  duration,
  radius,
  spacing,
  useTheme,
} from '../../theme';

interface BenefitsCarouselProps {
  visible: boolean;
  /** The tier the user holds today, so their own slide opens first. */
  currentTier: Tier;
  onClose: () => void;
}

interface TierSlide {
  tier: Tier;
  label: string;
  /** Points band, written the way the map writes it. */
  band: string;
  /** One line on where this medal sits in the journey. */
  standing: string;
  /** The caption above the amount: "Hasta", or "Desde" at Diamante. */
  amountCaption: string;
  amount: string;
  /** The perfect-SAN condition and what it opens. */
  unlock: string;
}

/**
 * The four medals, verbatim from the Club map.
 *
 * Amounts read from `TIERS` rather than being typed here: the bands are a
 * per-country parameter, and a slide that hardcoded them would drift the day
 * a country is added.
 */
const SLIDES: readonly TierSlide[] = [
  {
    tier: 'bronce',
    label: 'Bronce',
    band: '0 – 299 pts',
    standing: 'Tu punto de partida en el Club.',
    amountCaption: 'Hasta',
    amount: money(TIERS[0].maxSanAmount),
    unlock: 'Acceso a la app y a tu primer SAN. Juegas 1 SAN a la vez.',
  },
  {
    tier: 'plata',
    label: 'Plata',
    band: '300 – 799 pts',
    standing: 'Vas creciendo dentro del Club.',
    amountCaption: 'Hasta',
    amount: money(TIERS[1].maxSanAmount),
    unlock: 'Completa 3 SANes perfectos y juegas 2 SANes a la vez.',
  },
  {
    tier: 'oro',
    label: 'Oro',
    band: '800 – 1.499 pts',
    standing: 'Casi en la cima del Club.',
    amountCaption: 'Hasta',
    amount: money(TIERS[2].maxSanAmount),
    unlock: 'Completa 6 SANes perfectos y juegas 3 SANes a la vez.',
  },
  {
    tier: 'diamante',
    label: 'Diamante',
    band: '1.500+ pts',
    standing: 'La cima. Montos sin tope.',
    amountCaption: 'Desde · sin tope',
    amount: money(TIERS[3].maxSanAmount),
    unlock:
      'Completa 12 SANes perfectos: juegas 4 a la vez y 1 de tus SANes va al 0% de comisión en Modelo Juntos. Los demás pagan comisión normal.',
  },
] as const;

/** The ladder rungs, built from the domain constants rather than typed out. */
const LADDER_RUNGS = Array.from(
  { length: (LADDER_CEILING - TIERS[3].maxSanAmount) / LADDER_STEP },
  (_, index) => TIERS[3].maxSanAmount + (index + 1) * LADDER_STEP,
);

// The same money SVGs that sit behind the Club HERO. Kept around the medal so
// they read as engraving in the tier metal, never as another set of controls.
const BENEFIT_MOSAIC: readonly Placement[] = [
  { motif: 'coin', x: 9, y: 18, size: 30, rotate: -16 },
  { motif: 'bank', x: 90, y: 19, size: 28, rotate: 12 },
  { motif: 'piggy', x: 5, y: 68, size: 40, rotate: -12 },
  { motif: 'sign', x: 94, y: 65, size: 28, rotate: 16 },
  { motif: 'euro', x: 84, y: 91, size: 30, rotate: -10 },
  { motif: 'coin', x: 20, y: 92, size: 24, rotate: 14 },
];

/*
  The same field, re-placed for a short stage.

  The placements above are percentages of the stage's height, and they are
  positioned to fall in the gaps a TALL stage leaves — the piggy at 68% sits
  under the medal, clear of the tier name. A compact stage drops its padding,
  so those same percentages land on top of the type instead of beside it.

  This set keeps the motifs hard against the left and right edges and out of
  the vertical centre, where the medal and the label live. Smaller, too: the
  field should read as surface on a card half the height, not as artwork
  competing for it.
*/
const BENEFIT_MOSAIC_COMPACT: readonly Placement[] = [
  { motif: 'coin', x: 6, y: 14, size: 24, rotate: -16 },
  { motif: 'bank', x: 95, y: 16, size: 22, rotate: 12 },
  { motif: 'piggy', x: 2, y: 52, size: 30, rotate: -12 },
  { motif: 'sign', x: 98, y: 55, size: 24, rotate: 16 },
  { motif: 'euro', x: 93, y: 90, size: 24, rotate: -10 },
  { motif: 'coin', x: 5, y: 88, size: 20, rotate: 14 },
];

/**
 * The Club's benefits, one medal per slide.
 *
 * This is the screen's answer to "what am I playing for". The Club screen
 * itself shows only what the user HAS; everything above and below them lives
 * here, behind one deliberate tap.
 *
 * Each slide states the two lanes separately and in that order — the medal
 * sets the amount, the perfect SANes open the capacity. The map is emphatic
 * about this ("Dos caminos, un solo jugador") and it is the single thing users
 * get wrong: they reach Oro, keep playing one SAN at a time, and conclude the
 * Club did nothing for them.
 *
 * Diamante carries the amount ladder, because that is where the medals stop
 * and the amount keeps going.
 */
export function BenefitsCarousel({
  visible,
  currentTier,
  onClose,
}: BenefitsCarouselProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  /*
    The same short-screen threshold the Club screen uses, measured here because
    the sheet is its own full-screen Modal rather than a child of that layout.
    On a short device the stage gives back its generous padding so the facts
    below the medal stay on screen.
  */
  const compact = height - insets.top - insets.bottom < 700;

  const startIndex = Math.max(
    0,
    SLIDES.findIndex((slide) => slide.tier === currentTier),
  );
  const [index, setIndex] = useState(startIndex);
  const scroller = useRef<ScrollView>(null);

  /*
    The sheet is inset from the screen edges, so a slide is narrower than the
    window. Paging works off this width, not the window's — otherwise every
    page lands a little further off than the last.
  */
  const slideWidth = width - spacing.lg * 2;

  /*
    Open on the user's own medal rather than at Bronce. Someone at Oro opening
    a carousel that starts two slides behind them has to work to find
    themselves, and the first thing they read is a level they left months ago.

    Reset on every open: the carousel is a reference, not a place the user is
    expected to have left a bookmark in.
  */
  useEffect(() => {
    if (!visible) return;
    setIndex(startIndex);
    /*
      `scrollTo` before layout is a no-op on Android, so this waits a frame.
      `animated: false` because the sheet is still sliding in — an animated
      jump underneath it reads as a glitch, not as a transition.
    */
    const frame = requestAnimationFrame(() => {
      scroller.current?.scrollTo({ x: startIndex * slideWidth, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, startIndex, slideWidth]);

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
    if (clamped === index) return;

    // A light tick per medal. Paging through four levels is the one moment the
    // Club is browsed rather than read, and the haptic is what makes it feel
    // like flipping coins instead of scrolling a document.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIndex(clamped);
    scroller.current?.scrollTo({ x: clamped * slideWidth, animated: true });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.text.primary + '66' }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface.canvas,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: theme.border.strong }]} />

        {/*
          The money motifs, the same field the Club itself carries.

          The sheet is a room in the same building, so it gets the same walls.
          Underneath the header and the slides, and faint enough that it reads
          as surface rather than as content.
        */}
        <MoneyPattern opacity={0.05} />

        <View style={styles.headerRow}>
          {/*
            A visible way out, matching the Club's own.

            The sheet can be swiped down and the backdrop can be tapped, but
            neither announces itself — a user who does not already know the
            gesture has no way in to find it. The button is the door.
          */}
          <Pressable
            onPress={onClose}
            hitSlop={spacing.md}
            accessibilityRole="button"
            accessibilityLabel="Volver al Club"
            style={[styles.backButton, { backgroundColor: theme.surface.inset }]}
          >
            <Svg width={19} height={19} viewBox="0 0 24 24">
              <Path
                d="M15 6l-6 6 6 6"
                stroke={theme.text.primary}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Pressable>

          <View style={styles.header}>
            <Text variant="titleSm">Beneficios del Club</Text>
            <Text variant="bodySm" color="secondary">
              Mientras mejor juegas, más ganas.
            </Text>
          </View>
        </View>

        {/*
          Horizontal paging with visible arrows. The map calls for arrows
          explicitly, and they earn their place beyond that: a swipe is
          discoverable only by users who already suspect there is more, and the
          whole point of this sheet is to show people a level they have not
          reached yet.
        */}
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            setIndex(Math.round(event.nativeEvent.contentOffset.x / slideWidth));
          }}
          /*
            `flex: 1` claims the space left between the header and the controls
            rather than sizing to the tallest slide. That is what bounds each
            slide's own vertical ScrollView, so a slide that does not fit
            scrolls instead of squeezing.
          */
          style={{ width: slideWidth, flex: 1 }}
        >
          {SLIDES.map((slide, slideIndex) => (
            <Slide
              key={slide.tier}
              slide={slide}
              width={slideWidth}
              isCurrent={slide.tier === currentTier}
              // Only the visible slide animates its coin. Four medals popping
              // at once behind a viewport that shows one is work the device
              // does for nobody.
              active={visible && slideIndex === index}
              compact={compact}
            />
          ))}
        </ScrollView>

        <View style={styles.controls}>
          <Arrow
            direction="prev"
            disabled={index === 0}
            onPress={() => goTo(index - 1)}
          />

          <View style={styles.dots}>
            {SLIDES.map((slide, dotIndex) => (
              <Pressable
                key={slide.tier}
                onPress={() => goTo(dotIndex)}
                hitSlop={spacing.sm}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${slide.label}`}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        dotIndex === index
                          ? theme.action.primary
                          : theme.border.subtle,
                      // The active dot stretches rather than growing round, so
                      // the row's height never shifts as it moves.
                      width: dotIndex === index ? 22 : 7,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <Arrow
            direction="next"
            disabled={index === SLIDES.length - 1}
            onPress={() => goTo(index + 1)}
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * One medal's slide.
 *
 * The coin is the slide's subject here, unlike on the Club hero where it is a
 * seal beside the tier name. This sheet exists to make somebody want a level
 * they have not earned, and that is a job for the object, not for a paragraph
 * about it — so it is large, it sits on its own metal, and it moves.
 */
function Slide({
  slide,
  width,
  isCurrent,
  active,
  compact,
}: {
  slide: TierSlide;
  width: number;
  isCurrent: boolean;
  active: boolean;
  /** Short screen: the stage trades its generous padding for content room. */
  compact: boolean;
}) {
  const theme = useTheme();
  const gradient = theme.surface.tierGradient[slide.tier];

  const pop = useSharedValue(0.8);
  const float = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (!active) return;

    /*
      Land, then float. The spring is the same shape the tier celebration uses,
      so a coin behaves like itself wherever it turns up; the float afterwards
      is a slow six-second rise and fall that keeps the medal feeling like an
      object suspended rather than an image pasted on.
    */
    pop.value = withSequence(
      withSpring(1.08, { damping: 9, stiffness: 190 }),
      withSpring(1, { damping: 13, stiffness: 165 }),
    );

    float.value = withDelay(
      500,
      withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );

    sheen.value = withDelay(
      260,
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
    );

    return () => {
      // Reset so re-entering the slide plays the entrance again rather than
      // showing a coin already at rest.
      pop.value = 0.8;
      float.value = 0;
      sheen.value = 0;
    };
  }, [active, pop, float, sheen]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pop.value },
      { translateY: -float.value * 7 },
    ],
  }));

  /* Fades in over the first half of the pass and back out over the second, so
     the reflection arrives and leaves rather than appearing at an edge. The
     band's own gradient carries the strength; this only gates the pass. */
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: sheen.value < 0.5 ? sheen.value * 2 : (1 - sheen.value) * 2,
    transform: [{ translateX: -200 + sheen.value * 520 }, { rotate: '20deg' }],
  }));

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.slide}
      showsVerticalScrollIndicator={false}
    >
      {/*
        The stage: the medal on its own metal, filling the top of the slide.
        Everything factual sits on the neutral cards below it, which is what
        keeps the colour from having to carry information it cannot.
      */}
      <View
        style={[
          styles.stage,
          compact && { paddingVertical: spacing.base, gap: spacing.sm },
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <MoneyPattern
          placements={compact ? BENEFIT_MOSAIC_COMPACT : BENEFIT_MOSAIC}
          color={theme.text.onBrand}
          // Fainter on a short stage: the motifs sit closer to the type there,
          // so the same 0.12 that reads as engraving on a tall card reads as a
          // second layer of marks behind the tier name.
          opacity={compact ? 0.09 : 0.12}
        />
        {/*
          A reflection crossing the metal, drawn as a gradient rather than a
          white block. Hard-edged, a pass like this reads as a bar sliding over
          the card; with the edges falling to transparent it reads as light.
        */}
        <Animated.View style={[styles.stageSheen, sheenStyle]} pointerEvents="none">
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.5)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {isCurrent && (
          <View style={[styles.youBadge, { backgroundColor: theme.action.primary }]}>
            <Text variant="labelSm" style={{ color: theme.action.primaryText }}>
              TU MEDALLA
            </Text>
          </View>
        )}

        {/*
          The coin, with nothing behind it.

          An earlier version put a soft white disc under it to "seat" it on the
          metal. It did the opposite: the coin's artwork is transparent past its
          own rim, so the disc showed around the edge as a pale ring, and
          because it breathed with the float that ring pulsed. A light source
          you can see the edge of is not a light source — it is a shape.

          The medal already carries its own highlight, and the stage's sheen
          crosses it. It does not need help.
        */}
        <Animated.View style={medalStyle}>
          <Medal tier={slide.tier} size={176} />
        </Animated.View>

        <Animated.View
          entering={FadeIn.duration(duration.normal)}
          style={styles.stageText}
        >
          <Text variant="display" style={styles.onMetal}>
            {slide.label}
          </Text>
          <View style={styles.bandChip}>
            <Text variant="labelSm" style={styles.onMetal}>
              {slide.band}
            </Text>
          </View>
          <Text variant="bodySm" style={[styles.onMetalSoft, styles.centered]}>
            {slide.standing}
          </Text>
        </Animated.View>
      </View>

      {/*
        Lane 1. The amount is what the medal itself buys, and it is the figure
        the user came here to compare between levels — so it is set large, as a
        figure, not buried in a sentence.
      */}
      <Animated.View
        entering={FadeInDown.duration(duration.normal).delay(60)}
        style={[styles.amountTile, { backgroundColor: theme.surface.raised }]}
      >
        <View style={styles.amountText}>
          <Text variant="labelSm" color="secondary">
            TU MONTO POR SAN
          </Text>
          <Text variant="labelSm" color="muted">
            {slide.amountCaption}
          </Text>
        </View>
        <Text variant="display" style={{ color: theme.status.success }}>
          {slide.amount}
        </Text>
      </Animated.View>

      {/*
        Lane 2, and labelled as a different currency on purpose. "TU BENEFICIO"
        is the map's own heading for this box.
      */}
      <Animated.View
        entering={FadeInDown.duration(duration.normal).delay(110)}
        style={[
          styles.unlockTile,
          {
            backgroundColor: theme.surface.raised,
            borderColor: theme.status.success,
          },
        ]}
      >
        <Text variant="labelSm" color="accent">
          TU BENEFICIO
        </Text>
        <Text variant="bodySm">{slide.unlock}</Text>
      </Animated.View>

      {slide.tier === 'diamante' && <LadderPanel />}
    </ScrollView>
  );
}

/**
 * The Diamante ladder.
 *
 * It lives on the last slide because it is the answer to the question that
 * slide provokes: if Diamante is the top medal, what is left to play for. The
 * amount is — it keeps climbing one rung at a time long after the medals have
 * run out.
 */
function LadderPanel() {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(duration.normal).delay(160)}
      style={[
        styles.ladderPanel,
        { backgroundColor: theme.surface.raised, borderColor: theme.status.info },
      ]}
    >
      <Text variant="labelSm" color="accent">
        LA ESCALERA DIAMANTE
      </Text>
      <Text variant="bodySm" color="secondary">
        A partir de Diamante tu monto no se queda en{' '}
        {money(TIERS[3].maxSanAmount)}. Juega {LADDER_SANES_REQUIRED} SANes de tu
        monto actual y págalos sin mora: desbloqueas {money(LADDER_STEP)} más.
        Lo que desbloqueas es tuyo para siempre.
      </Text>

      {/*
        The rungs scroll horizontally rather than wrapping. Wrapped, the ladder
        breaks into two ragged rows and stops reading as a climb — which is the
        one thing this row has to communicate.
      */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rungs}
      >
        <View style={[styles.rungChip, { borderColor: theme.border.subtle }]}>
          <Text variant="labelSm" color="muted">
            {money(TIERS[3].maxSanAmount)}
          </Text>
        </View>

        {LADDER_RUNGS.map((rung, rungIndex) => (
          <View key={rung} style={styles.rungRow}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M9 6l6 6-6 6"
                stroke={theme.text.muted}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
            <View
              style={[
                styles.rungChip,
                {
                  borderColor: theme.status.info,
                  // The last rung is the ceiling, so it is filled rather than
                  // outlined: the row should end on a destination, not on one
                  // more identical step.
                  backgroundColor:
                    rungIndex === LADDER_RUNGS.length - 1
                      ? theme.status.info
                      : 'transparent',
                },
              ]}
            >
              <Text
                variant="labelSm"
                style={{
                  color:
                    rungIndex === LADDER_RUNGS.length - 1
                      ? theme.text.inverse
                      : theme.status.info,
                }}
              >
                {money(rung)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Text variant="labelSm" color="muted">
        Una mora en el camino no te borra el avance: tus SANes contados se
        quedan contados y tu monto desbloqueado no retrocede.
      </Text>
    </Animated.View>
  );
}

function Arrow({
  direction,
  disabled,
  onPress,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={spacing.sm}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={direction === 'prev' ? 'Medalla anterior' : 'Medalla siguiente'}
      style={({ pressed }) => [
        styles.arrow,
        {
          backgroundColor: theme.surface.raised,
          borderColor: theme.border.subtle,
          // Disabled arrows stay in place rather than disappearing: a control
          // that vanishes at the ends makes the row jump on every page.
          opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
          d={direction === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
          stroke={theme.text.primary}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    /*
      Absolute, not `flex: 1`.

      In flow the backdrop claims the whole modal and the sheet's definite
      height stacks on top of it, pushing the sheet off the bottom of the
      screen. Taking it out of flow leaves the sheet as the only laid-out
      child, so its height resolves against the modal and the pager below it
      gets a real box to fill.
    */
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.base,
    /*
      A fixed height, not a ceiling.

      `maxHeight` let the sheet size to its tallest slide, which meant the
      slides had no bounded height to scroll against: on a short screen the
      content had nowhere to go and compressed instead of scrolling. A definite
      height gives the pager a box to fill and each slide something to overflow,
      and it also holds the sheet still as the user pages between medals.
    */
    height: '92%',
    // Anchored to the bottom: with the backdrop out of flow there is nothing
    // above the sheet to push it down, and a sheet that slides up should end
    // its travel at the bottom edge.
    marginTop: 'auto',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
  },
  /** The way out and the title, on one line. */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flex: 1,
    gap: spacing['2xs'],
  },
  slide: {
    gap: spacing.md,
    paddingBottom: spacing.base,
    // Fills the pager when the slide is shorter than the box, so a tall screen
    // gets the stage sitting on its own space instead of the whole slide
    // bunched against the header.
    flexGrow: 1,
  },
  stage: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderCurve,
    overflow: 'hidden',
  },
  stageSheen: {
    position: 'absolute',
    top: -80,
    bottom: -80,
    // Wider than the block it replaces: the colour now lives in the middle of
    // the band with the edges falling away, so the band has to be broad enough
    // for that falloff to happen over a readable distance.
    width: 170,
  },
  youBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingVertical: spacing['2xs'],
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderCurve,
  },
  stageText: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  /* Type on the metal follows the gradient, not the theme: the stage is the
     tier's own colour in both modes, so these stay white in both.

     Neither is dimmed. The gradients are tuned so white clears 4.5:1 on their
     lightest stop with almost nothing to spare, and dropping the type to 82%
     opacity spends exactly that margin — measured 3.64:1 on silver, which is
     a caption nobody can read on the brightest corner of the card. Hierarchy
     here comes from size and weight instead. */
  onMetal: {
    color: '#FFFFFF',
  },
  onMetalSoft: {
    color: '#FFFFFF',
  },
  bandChip: {
    paddingVertical: spacing['2xs'],
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderCurve,
    /* Darkens the metal rather than lightening it. A white scrim at any useful
       opacity raises the ground under its own label — white-on-chip measured
       3.3:1 — so the chip that was meant to separate the band from the card
       was the thing making it illegible. Black at 22% lands every tier above
       6.6:1. */
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  centered: {
    textAlign: 'center',
  },
  amountTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.base,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderCurve,
  },
  amountText: {
    gap: spacing['2xs'],
  },
  unlockTile: {
    gap: spacing.xs,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderCurve,
    borderWidth: borderWidth.thin,
  },
  ladderPanel: {
    gap: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderCurve,
    borderWidth: borderWidth.thin,
  },
  rungs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing['2xs'],
  },
  rungRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rungChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderCurve,
    borderWidth: borderWidth.thin,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    // The 48pt minimum touch target, written out: this block runs as the module
    // loads, inside the Club's import graph.
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 7,
    borderRadius: radius.pill,
  },
});
