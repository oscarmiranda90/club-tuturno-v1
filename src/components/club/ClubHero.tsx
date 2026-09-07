import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Text } from '../Text';
import { TutuMascot } from '../TutuMascot';
import { InteractiveTierMedal } from './InteractiveBronzeMedal';
import { MoneyPattern, type Placement } from './MoneyPattern';
import {
  LADDER_CEILING,
  LADDER_SANES_REQUIRED,
  LADDER_STEP,
  maxAmountForTier,
  money,
  type ClubState,
  type ClubMascotMood,
  type ClubPointsProgress,
  type Tier,
} from '../../domain';
import {
  borderCurve,
  radius,
  spacing,
  useTheme,
  scaled,
  scaledMin,
} from '../../theme';

interface ClubHeroProps {
  club: ClubState;
  /** Server-confirmed values when available; deterministic local fallback otherwise. */
  progress: ClubPointsProgress;
  onOpenBenefits: () => void;
  onBack?: () => void;
  /**
   * Binary decisions only: which type variant to use, whether an ornament is
   * shown at all. Anything with a size goes through `scale` instead.
   */
  compact?: boolean;
  /**
   * The screen's vertical scale, 0.78–1. Defaults to 1 so this hero renders at
   * its authored proportions wherever it is used outside the Club screen.
   */
  scale?: number;
  mascotMood?: Exclude<ClubMascotMood, 'dance'> | null;
}

const TIER_LABEL: Record<Tier, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  diamante: 'Diamante',
};

// The ladder is built from the same configurable domain parameters that
// advance it. The UI therefore stays in sync if Operations changes either
// the step size or its ceiling for a country.
const DIAMOND_LADDER_AMOUNTS = Array.from(
  { length: (LADDER_CEILING - maxAmountForTier('diamante')) / LADDER_STEP + 1 },
  (_, index) => maxAmountForTier('diamante') + index * LADDER_STEP,
);

/** Keeps the $1,000 ceiling legible below the seven milestones. */
function compactLadderAmount(amount: number): string {
  return amount >= 1000 && amount % 1000 === 0 ? `${money(amount / 1000)}K` : money(amount);
}

const MASCOT_STATUS: Record<Exclude<ClubMascotMood, 'dance'>, string> = {
  angry: 'Tienes un pago pendiente',
  sad: 'Tu medalla sigue contigo',
  idle: 'Bienvenido al Club',
};

// A scattered engraving, with breathing room around the title and navigation.
const HERO_MOSAIC: readonly Placement[] = [
  { motif: 'coin', x: 4, y: 32, size: 26, rotate: -18 },
  { motif: 'bank', x: 24, y: 26, size: 22, rotate: 12 },
  { motif: 'piggy', x: 49, y: 37, size: 36, rotate: -14 },
  { motif: 'sign', x: 68, y: 17, size: 24, rotate: 18 },
  { motif: 'euro', x: 92, y: 25, size: 34, rotate: -12 },
  { motif: 'sign', x: 32, y: 53, size: 22, rotate: -12 },
  { motif: 'bank', x: 63, y: 63, size: 30, rotate: 16 },
  { motif: 'piggy', x: 102, y: 66, size: 44, rotate: -16 },
  { motif: 'euro', x: 8, y: 91, size: 34, rotate: 14 },
  { motif: 'piggy', x: 31, y: 93, size: 28, rotate: -10 },
  { motif: 'coin', x: 51, y: 85, size: 24, rotate: 18 },
  { motif: 'sign', x: 76, y: 96, size: 28, rotate: -18 },
];

/**
 * Lane 1, whole: the medal, what it buys, and how far the next one is.
 *
 * This card owns exactly ONE fact — the maximum amount per SAN — because that
 * is the only thing a medal grants. Everything else the Club gives (SANes at a
 * time, the 0% commission) is bought with perfect SANes and lives in the
 * streak card, which is the only place it appears.
 *
 * That division is the whole point. An earlier version of this hero carried
 * three figures side by side — amount, simultaneous SANes, commission — in the
 * shape of a rewards card. It read well and it taught the wrong model: the
 * three sat under one medal, so they looked like three things the medal gave.
 * They are not. A user who climbs to Oro without finishing perfect SANes gets
 * a bigger amount and the same single SAN, and a card that grouped those
 * figures under the medal has just lied to them about why.
 *
 * The progress bar belongs here rather than in a card of its own for the same
 * reason: points, medal and amount are one story, and telling it in two boxes
 * was what made the screen feel like four topics instead of two.
 *
 * The card wears its tier's own metal. It is the one surface in the product
 * where colour carries identity rather than state, and it earns that: four
 * identical navy tiles would make Bronce and Diamante look like the same
 * achievement, when the whole product is an argument that they are not.
 */
export function ClubHero({ club, progress, onOpenBenefits, onBack, compact = false, scale = 1, mascotMood = null }: ClubHeroProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [lightSize, setLightSize] = useState({ width: 0, height: 0 });

  const tier = club.points.tier;
  const gradient = theme.surface.tierGradient[tier];

  // Diamante's ceiling grows past the tier's base via the ladder.
  const maxAmount =
    tier === 'diamante' && club.ladder
      ? club.ladder.currentMax
      : maxAmountForTier(tier);
  const diamondLadder = club.ladder ?? {
    currentMax: maxAmountForTier('diamante'),
    completedAtCurrentMax: 0,
  };
  const diamondCurrentMax = Math.min(
    LADDER_CEILING,
    Math.max(maxAmountForTier('diamante'), diamondLadder.currentMax),
  );
  const diamondNextMax = Math.min(LADDER_CEILING, diamondCurrentMax + LADDER_STEP);
  const diamondCurrentIndex = Math.max(0, DIAMOND_LADDER_AMOUNTS.indexOf(diamondCurrentMax));
  const diamondProgressAtCurrentLevel = diamondCurrentMax < LADDER_CEILING
    ? Math.min(1, diamondLadder.completedAtCurrentMax / LADDER_SANES_REQUIRED)
    : 0;
  const diamondLadderProgress = Math.min(
    1,
    (diamondCurrentIndex + diamondProgressAtCurrentLevel) / (DIAMOND_LADDER_AMOUNTS.length - 1),
  );

  /*
    The medal settles into place on mount, then breathes.

    The pop matches the payment celebration so the coin behaves the same way
    everywhere it appears. The breath afterwards is very small — 1.5% over four
    seconds — because this screen can sit open while a user reads it, and
    anything more assertive would read as a control asking to be tapped rather
    than an object with presence.
  */
  const pop = useSharedValue(0.86);
  const breath = useSharedValue(0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      pop.value = 1;
      breath.value = 0;
      sheen.value = 0;
      return;
    }
    pop.value = withSequence(
      withSpring(1.06, { damping: 9, stiffness: 200 }),
      withSpring(1, { damping: 14, stiffness: 170 }),
    );

    breath.value = withDelay(
      700,
      withRepeat(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );

    // One sweep across the card on arrival. It says "this is metal" and then
    // gets out of the way — a looping shine turns a surface into a banner ad.
    sheen.value = withDelay(
      380,
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
    );
    return () => {
      cancelAnimation(pop);
      cancelAnimation(breath);
      cancelAnimation(sheen);
    };
  }, [pop, breath, sheen, reducedMotion]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value * (1 + breath.value * 0.015) }],
  }));

  /* The band's own gradient carries the strength; this only gates the pass in
     and out, so the reflection arrives rather than appearing at an edge. */
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: sheen.value < 0.5 ? sheen.value * 2 : (1 - sheen.value) * 2,
    transform: [{ translateX: -180 + sheen.value * 470 }, { rotate: '20deg' }],
  }));

  return (
    <View style={styles.wrapper}>
      {/*
        The identity tile and the figures row are ONE rounded card with a
        divider, not two cards stacked.

        The earlier version overlapped a fully-rounded figures card onto a tile
        whose bottom corners were square, and the tile's corners poked out past
        the curve — two radii fighting at the same seam. Wrapping both in a
        single clipped container removes the seam rather than trying to align
        it: there is one outline, so there is nothing to mismatch.
      */}
      <View style={[styles.card, onBack && styles.edgeCard]}>
        <LinearGradient
          colors={[gradient[0], gradient[1], gradient[0]]}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.identity,
            {
              paddingVertical: scaled(spacing.lg, scale),
              paddingHorizontal: scaledMin(spacing.lg, scale, spacing.base),
              gap: scaledMin(spacing.base, scale, spacing.sm),
            },
            /*
              Room for the back button that floats over this card. It is a
              clearance, not a proportion — scaled below its floor the button
              would sit on the tier name — so it shrinks only as far as the
              control's own height allows.
            */
            onBack && { paddingTop: scaledMin(52, scale, 44) },
          ]}
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="none"
            onLayout={({ nativeEvent: { layout } }) => setLightSize((current) =>
              current.width === layout.width && current.height === layout.height
                ? current : { width: layout.width, height: layout.height })}>
          <Svg width={lightSize.width} height={lightSize.height}
            viewBox="0 0 100 100" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id="heroKeyLight" cx="0.9" cy="0.24" rx="0.85" ry="1.05">
                <Stop offset="0" stopColor={gradient[2]} />
                <Stop offset="0.45" stopColor={gradient[2]} stopOpacity="0.8" />
                <Stop offset="1" stopColor={gradient[2]} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="heroBounceLight" cx="0.02" cy="1.05" rx="0.6" ry="0.85">
                <Stop offset="0" stopColor={gradient[2]} stopOpacity="0.85" />
                <Stop offset="1" stopColor={gradient[1]} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="heroDepth" cx="0.34" cy="0.28" rx="0.55" ry="0.7">
                <Stop offset="0" stopColor={gradient[0]} stopOpacity="0.8" />
                <Stop offset="1" stopColor={gradient[0]} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100" height="100" fill="url(#heroKeyLight)" />
            <Rect width="100" height="100" fill="url(#heroBounceLight)" />
            <Rect width="100" height="100" fill="url(#heroDepth)" />
          </Svg>
          </View>
          <MoneyPattern placements={HERO_MOSAIC} color={theme.text.onBrand} opacity={0.12} />
          {/*
            The sheen rides above the gradient and below the content, so it
            crosses the metal without washing out the type. It is a gradient
            with both edges falling to transparent, not a white block: a hard
            edge sliding across reads as a bar, not as light.
          */}
          <Animated.View style={[styles.sheen, sheenStyle]} pointerEvents="none">
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.45)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {onBack && <View style={styles.navigation}>
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Volver al inicio"
              style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M15 6l-6 6 6 6" stroke={theme.text.onBrand} strokeWidth={2.2}
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <Text variant="labelSm" color="onBrand">Atrás</Text>
            </Pressable>
            <Text variant="label" color="onBrand">Club TuTurno</Text>
            <View style={{ width: 64 }} />
          </View>}
          <View style={styles.identityText}>
            {!compact && <Text variant="labelSm" style={styles.overline}>Tu nivel</Text>}
            <Text variant={compact ? "title" : "displaySm"} color="onBrand">
              {TIER_LABEL[tier]}
            </Text>
            {mascotMood && (
              <Text variant="labelSm" color="onBrand">
                {MASCOT_STATUS[mascotMood]}
              </Text>
            )}
            {compact && <Pressable onPress={onOpenBenefits} accessibilityRole="button"
              accessibilityLabel="Conocer los beneficios de cada medalla"
              style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
              <Text variant="labelSm" color="onBrand">Conocer beneficios ›</Text>
            </Pressable>}
          </View>

          <Animated.View style={[medalStyle, mascotMood && styles.mascotStage]}>
            {mascotMood ? (
              <>
                {/*
                  Each of these keeps its own floor rather than sharing one.

                  The mascot stops reading as a character below 60; the seal
                  beside it is already small enough that a couple of points off
                  turns the tier's engraving into a smudge, so it barely moves.
                */}
                <TutuMascot mood={mascotMood} size={scaledMin(92, scale, 60)} />
                <View style={styles.mascotMedal}>
                  <InteractiveTierMedal tier={tier} size={scaledMin(34, scale, 26)} />
                </View>
              </>
            ) : (
              /*
                Without the mascot the medal is the hero's subject, so it is
                drawn large — and the compact step is a deliberate halving, not
                a proportional trim: at that point it stops being the subject
                and becomes a seal beside the tier name. The scale then works
                within whichever of those two roles the medal is playing.
              */
              <InteractiveTierMedal
                tier={tier}
                size={compact ? scaledMin(44, scale, 38) : scaled(88, scale)}
              />
            )}
          </Animated.View>
        </LinearGradient>

        <View
          style={[
            styles.body,
            onBack && {
              paddingVertical: scaledMin(12, scale, 6),
              paddingHorizontal: 24,
              gap: scaledMin(8, scale, 4),
            },
            {
              backgroundColor: theme.surface.raised,
              borderTopColor: theme.border.subtle,
            },
          ]}
        >
          {/*
            The one thing the medal buys, set as the figure it is. Naming the
            lane in the label — "Tu medalla te da" — is what stops the reader
            attributing the streak's benefits to it three lines later.
          */}
          <View style={styles.amountRow}>
            <View style={styles.amountLabel}>
              {!compact && <Text variant="labelSm" color="secondary">Tu medalla</Text>}
              <Text variant="labelSm" color="muted">Te da por SAN</Text>
            </View>
            <Text variant={compact ? "displaySm" : "display"} style={{ color: theme.status.success }}>
              {money(maxAmount)}
            </Text>
          </View>

          {/*
            Points, and the distance to the next medal. Diamante has none, so
            the bar is replaced by the fact that closes the lane rather than by
            an empty track pointing nowhere.
          */}
          {progress.nextTier ? (
            <View style={styles.progress}>
              <View style={[styles.track, { backgroundColor: theme.surface.inset }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: theme.action.primary,
                      width: `${Math.round(progress.fraction * 100)}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text variant="labelSm" color="secondary" style={styles.pointsCount}>
                  {progress.currentPoints} puntos
                </Text>
                <Text variant="labelSm" color="muted" style={styles.pointsToNext}>
                  {progress.pointsNeeded} puntos para llegar a {TIER_LABEL[progress.nextTier]}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.progress}>
              <View style={styles.progressLabels}>
                <Text variant="labelSm" color="secondary" style={styles.pointsCount}>
                  {progress.currentPoints} puntos
                </Text>
                <Text variant="labelSm" color="muted" style={styles.pointsToNext}>
                  Nivel máximo
                </Text>
              </View>
              {tier === 'diamante' ? (
                <View style={styles.diamondLadder}>
                  <View style={styles.ladderRail} accessible accessibilityRole="text"
                    accessibilityLabel={`Escalera Diamante. Nivel actual ${money(diamondCurrentMax)}. ${diamondCurrentMax < LADDER_CEILING ? `${diamondLadder.completedAtCurrentMax} de ${LADDER_SANES_REQUIRED} SANes completados hacia ${money(diamondNextMax)}.` : 'Llegaste al tope actual.'}`}>
                    <View style={styles.ladderTrackLayer} pointerEvents="none">
                      <View style={[styles.ladderTrackBase, { backgroundColor: theme.surface.inset }]} />
                      <View style={[styles.ladderTrackFill, {
                        backgroundColor: theme.action.primary,
                        width: `${Math.round(diamondLadderProgress * 100)}%`,
                      }]} />
                    </View>
                    <View style={styles.ladderMilestones}>
                    {DIAMOND_LADDER_AMOUNTS.map((amount) => {
                      const unlocked = amount <= diamondCurrentMax;
                      const current = amount === diamondCurrentMax;
                      return <View key={amount} style={styles.ladderMilestone}>
                        <View style={styles.ladderNodeSlot}>
                          <View style={[styles.ladderNode, {
                            backgroundColor: unlocked ? theme.action.primary : theme.surface.raised,
                            borderColor: unlocked ? theme.action.primary : theme.border.subtle,
                          }, current && [styles.ladderNodeCurrent, {
                            borderColor: theme.text.onBrand,
                            boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 6, spreadDistance: 0,
                              color: theme.surface.tierGradient.diamante[2] }],
                          }]]} />
                        </View>
                        <Text variant="labelSm" maxFontSizeMultiplier={1.1} numberOfLines={1}
                          adjustsFontSizeToFit minimumFontScale={0.78} style={{
                          color: current ? theme.text.accent : theme.text.muted,
                          fontVariant: ['tabular-nums'],
                        }}>{compactLadderAmount(amount)}</Text>
                      </View>;
                    })}
                    </View>
                  </View>
                  <Text variant="labelSm" color="secondary">
                    {diamondCurrentMax < LADDER_CEILING
                      ? 'Juega 2 SANes de tu monto actual sin mora y desbloquea el siguiente nivel.'
                      : 'Llegaste al tope actual de la escalera. Es tuyo para siempre.'}
                  </Text>
                </View>
              ) : (
                <Text variant="labelSm" color="secondary">
                  La medalla más alta del Club. Es tuya para siempre.
                </Text>
              )}
            </View>
          )}

          {/*
            Inside the card, at its foot, aligned right.

            It used to sit below the card as a row of its own, which cost a
            band of vertical space to carry four words — and read as a separate
            thing from the medal it describes. It belongs to this card: it
            explains what the medal above it buys, so it lives with it and takes
            the corner that was already empty.
          */}
          {!compact && <Pressable
            onPress={onOpenBenefits}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Conocer los beneficios de cada medalla"
            style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text variant="labelSm" color="accent">
              Conocer beneficios
            </Text>
            <Svg width={15} height={15} viewBox="0 0 24 24">
              <Path
                d="M9 6l6 6-6 6"
                stroke={theme.text.accent}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Pressable>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  edgeCard: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  navigation: { position: 'absolute', top: 4, left: 16, right: 16, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { minWidth: 64, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  wrapper: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: radius.xl,
    borderCurve,
    // Clips the gradient and the sheen to the card's own curve, which is what
    // lets the two halves share one outline instead of each carrying its own.
    overflow: 'hidden',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Padding and gap are applied inline from the vertical scale.
  },
  sheen: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    // Broad enough for the gradient's edges to fall off over a readable
    // distance rather than ending abruptly.
    width: 150,
  },
  identityText: {
    flex: 1,
    gap: spacing['2xs'],
  },
  mascotStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotMedal: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  overline: {
    // On the metal, not on a themed surface: this label follows the gradient,
    // so it stays light in both modes like the tier name beside it.
    //
    // Full opacity, deliberately. The tier gradients clear 4.5:1 against white
    // with little margin, and dimming this label to 75% drops it to roughly
    // 3.3:1 on the card's brightest corner. It reads as secondary because it is
    // small and set in a label face, which costs no contrast to achieve.
    color: '#FFFFFF',
  },
  body: {
    gap: spacing.base,
    padding: spacing.lg,
    // A hairline where the metal ends, rather than a gap. What is below belongs
    // to the medal above it, and a gap would say it does not.
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  amountLabel: {
    flex: 1,
    gap: spacing['2xs'],
  },
  progress: {
    gap: spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pointsCount: {
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  pointsToNext: {
    flex: 1.4,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  diamondLadder: {
    gap: spacing.xs,
  },
  ladderRail: {
    position: 'relative',
  },
  ladderTrackLayer: {
    position: 'absolute',
    // The first and last milestones sit at the centre of their seventh of the
    // rail. Matching those centres keeps the track from protruding past them.
    left: '7.142857%',
    right: '7.142857%',
    top: 8,
    height: 4,
  },
  ladderTrackBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: radius.pill,
  },
  ladderTrackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: radius.pill,
  },
  ladderMilestones: {
    flexDirection: 'row',
  },
  ladderMilestone: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  ladderNodeSlot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ladderNode: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderRadius: radius.pill,
  },
  ladderNodeCurrent: {
    width: 20,
    height: 20,
    borderWidth: 4,
  },
  /**
   * The benefits link, at the card's bottom right.
   *
   * `alignSelf` rather than `justifyContent`: it is one item in a column now,
   * so it has to pull itself to the right edge instead of distributing along
   * a row it no longer owns.
   *
   * The 48pt tap target it used to reserve is gone — that height was the reason
   * it cost a band of its own. `hitSlop` gives the same reachable area without
   * occupying the space, which is the whole point of moving it in here.
   */
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing['2xs'],
    minHeight: 44,
    justifyContent: 'center',
  },
});
