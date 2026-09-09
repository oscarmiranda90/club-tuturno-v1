import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../Text';
import { TutuMascot } from '../TutuMascot';
import { benefitsForStep, type ClubState } from '../../domain';
import { borderCurve, fontFamily, useTheme, scaled, scaledMin } from '../../theme';

const MAX_STREAK = 12;
// Each landmark owns its colour until the user has gone beyond it. At that
// point its tile turns green: it reads as completed, while the next coloured
// tile keeps the user's eye on what comes next.
const MILESTONES = [3, 6, 9, 12] as const;

/*
  Named in full, never just "racha".

  The unit is what makes this number mean anything: it counts whole SANes
  finished without a single late installment, not payments. "Racha: 5" invites
  the reader to supply their own unit, and the one they reach for is the
  payment they just made.
*/
const LANE_LABEL = 'Racha de Sanes perfectos';

interface StreakMeterCelebration {
  /** The confirmed perfect-SAN count before the SAN that just completed. */
  from: number;
  /** The server-confirmed perfect-SAN count after that completion. */
  to: number;
  /** Lets the labels change only after the marker has physically arrived. */
  arrived: boolean;
  onArrive: () => void;
}

/** Capacity comes from the earned step; partial progress only fills the meter. */
export function StreakThermometer({ club, blocked, compact, scale = 1, celebration }: {
  club: Pick<ClubState, 'streak'>;
  blocked: boolean;
  compact: boolean;
  /**
   * The screen's vertical scale, 0.78–1. Sizes everything that can give a
   * little; `compact` still drives the few choices that are genuinely binary.
   * Defaults to 1 for callers that render this outside the Club screen.
   */
  scale?: number;
  /** Replays the exact Club meter after a confirmed perfect SAN. */
  celebration?: StreakMeterCelebration;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [height, setHeight] = useState(0);
  // The Club's benefits cap at 12, while the player's personal streak keeps
  // growing. The meter uses the cap; the marker keeps the actual record.
  const storedCount = Math.max(0, club.streak.step + club.streak.progressToNext);
  const actualCount = celebration
    ? (celebration.arrived ? celebration.to : celebration.from)
    : storedCount;
  const count = Math.min(MAX_STREAK, actualCount);
  const isOverCap = actualCount > MAX_STREAK;
  const benefits = benefitsForStep(club.streak.step);
  const progress = useSharedValue(count / MAX_STREAK);
  const pulse = useSharedValue(1);
  const shake = useSharedValue(0);
  const trackHeight = Math.max(0, height - 40);
  useEffect(() => {
    if (celebration) {
      progress.value = Math.min(MAX_STREAK, Math.max(0, celebration.from)) / MAX_STREAK;
      shake.value = 0;
      if (!reduceMotion) {
        shake.value = withRepeat(
          withSequence(
            withTiming(-1, { duration: 70, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 70, easing: Easing.inOut(Easing.quad) }),
          ),
          4,
          true,
        );
      }
      progress.value = withDelay(
        reduceMotion ? 180 : 600,
        withTiming(Math.min(MAX_STREAK, Math.max(0, celebration.to)) / MAX_STREAK, {
          duration: reduceMotion ? 450 : 1100,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
          reduceMotion: ReduceMotion.System,
        }, (finished) => {
          if (finished) scheduleOnRN(celebration.onArrive);
        }),
      );
      return;
    }
    progress.value = withTiming(count / MAX_STREAK, {
      duration: 260, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System,
    });
  }, [celebration?.from, celebration?.onArrive, celebration?.to, count, progress, reduceMotion, shake]);
  useEffect(() => {
    if (!isOverCap) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }

    pulse.value = withRepeat(
      withTiming(0.45, {
        duration: 700,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [isOverCap, pulse]);
  // The mask rises from the bottom while the gradient stays pinned to the
  // track. That preserves red at the base, then yellow/orange, then green at
  // the 12-SAN cap instead of dragging the colour stops with the fill.
  const fillMaskStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: trackHeight * (1 - progress.value) }],
  }));
  const fillGradientStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -trackHeight * (1 - progress.value) }],
  }));
  const markerStyle = useAnimatedStyle(() => ({
    // At 17 the meter stops at 12, but the red marker sits just above its cap.
    transform: [
      { translateY: -trackHeight * progress.value - (isOverCap ? 14 : 0) },
      { rotate: `${celebration ? shake.value * 5 : 0}deg` },
    ],
    opacity: isOverCap ? pulse.value : 1,
  }));
  const strength = count / MAX_STREAK;
  const currentStreakColor = count >= 12
    ? theme.status.success
    : count >= 9
      ? theme.status.warning
    : count >= 6
        ? theme.status.machine
        : theme.status.danger;

  return (
    <View style={[styles.root, { paddingTop: scaled(8, scale), paddingBottom: scaled(4, scale) }]}>
      <View style={styles.heading}>
        <Text variant="labelSm" color="accent">RACHA DE SANES PERFECTOS</Text>
        <Text variant="labelSm" color="secondary">
          {isOverCap ? `${actualCount} · tope ${MAX_STREAK}` : `${count} / ${MAX_STREAK}`}
        </Text>
      </View>
      <View
        style={[styles.scene, { marginTop: scaled(8, scale) }]}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.meter} accessible accessibilityRole="progressbar"
          accessibilityLabel={isOverCap
            ? `${LANE_LABEL}: ${actualCount}. El tope de beneficios es ${MAX_STREAK}.`
            : LANE_LABEL}
          accessibilityValue={{ min: 0, max: MAX_STREAK, now: count }}>
          <View style={[styles.track, { backgroundColor: theme.surface.inset, borderColor: theme.border.subtle }]}>
            <View style={styles.clip}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.fillMask, fillMaskStyle]}>
                <Animated.View style={[StyleSheet.absoluteFill, fillGradientStyle]}>
                  <LinearGradient
                    colors={[
                      theme.status.success,
                      theme.status.warning,
                      theme.status.machine,
                      theme.status.danger,
                    ]}
                    locations={[0, 0.33, 0.66, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </Animated.View>
            </View>
            {count > 0 && <View pointerEvents="none" style={[styles.energy, {
              height: `${strength * 100}%`, borderColor: currentStreakColor,
              borderWidth: 1 + strength * 2,
              borderTopRightRadius: 8 + strength * 16,
              boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 8 + strength * 24,
                spreadDistance: strength * 3, color: currentStreakColor }],
              opacity: 0.3 + strength * 0.7,
            }]} />}
          </View>
          {MILESTONES.map((tick) => {
            const surpassed = count > tick;
            const milestoneColor = tick === 3
              ? theme.status.danger
              : tick === 6
                ? theme.status.machine
                : tick === 9
                  ? theme.status.warning
                  : theme.status.success;
            const tileColor = surpassed ? theme.status.success : milestoneColor;
            const tileTextColor = surpassed || tick !== 6
              ? theme.text.onBrand
              : theme.status.machineInk;
            return <View key={tick} style={[styles.tickRow, { bottom: 20 + trackHeight * tick / MAX_STREAK - 14 }]}>
              <View style={{ width: 16, height: 2,
                backgroundColor: tileColor }} />
              <View style={[styles.milestone, {
                backgroundColor: tileColor,
                borderColor: tileColor,
                transform: [{ rotate: tick === 12 || tick === 3 ? '-6deg' : '4deg' }],
              }]}>
                <Text variant="labelSm" maxFontSizeMultiplier={1.15}
                  style={[styles.tickNumber, styles.milestoneNumber, {
                    color: tileTextColor,
                  }]}>{tick}</Text>
              </View>
            </View>;
          })}
          <Animated.View style={[styles.marker, markerStyle, {
            backgroundColor: isOverCap ? theme.status.dangerSurface : theme.surface.brand,
          }]}>
            <Text variant="title" color="onBrand" maxFontSizeMultiplier={1.15} style={styles.currentNumber}>
              {isOverCap ? actualCount : count}
            </Text>
            <View style={[styles.markerPoint, {
              borderLeftColor: isOverCap ? theme.status.dangerSurface : theme.surface.brand,
            }]} />
          </Animated.View>
        </View>
        <View style={[styles.companion, {
          paddingTop: scaled(12, scale),
          paddingBottom: scaled(8, scale),
        }]}>
          <View style={[styles.bubble, {
            paddingVertical: scaledMin(14, scale, 7),
            paddingHorizontal: scaledMin(12, scale, 10),
            // The gap between the two lines never reaches zero: at 0 the title
            // and the sentence read as one run-on block.
            gap: scaledMin(4, scale, 2),
            backgroundColor: theme.surface.raised,
            borderColor: theme.text.primary,
          }]}>
            <Text variant={compact ? 'label' : 'titleSm'} style={styles.center}>
              {celebration
                ? celebration.arrived ? `¡RACHA DE ${celebration.to}!` : `Racha de ${celebration.from}`
                : `Estás en racha ${actualCount}`}
            </Text>
            <Text variant="bodySm" color="secondary" style={styles.center}>
              {celebration ? celebration.arrived
                ? 'Tu racha acaba de subir.'
                : 'Tu San perfecto ya está contando.'
                : blocked ? 'Ponte al día para volver a jugar Sanes.'
                : `Puedes jugar ${benefits.simultaneousSanes} ${benefits.simultaneousSanes === 1 ? 'San' : 'Sanes'} a la vez.`}
            </Text>
            <View style={[styles.tail, { backgroundColor: theme.surface.raised,
              borderBottomColor: theme.text.primary, borderRightColor: theme.text.primary }]} />
          </View>
          {/*
            The mascot rides the scale rather than dropping to a second fixed
            size. Its floor is 96: below that the face stops being readable as
            a face and it is just a coloured blob taking up the same column.
          */}
          <TutuMascot mood="idle" size={scaledMin(148, scale, 96)} />
        </View>
      </View>
      <Text
        variant="labelSm"
        color="secondary"
        style={[styles.caption, { paddingTop: scaled(8, scale) }]}
      >
        {benefits.zeroCommissionSan
          ? '1 San sin comisión en Modelo Juntos, mientras tu racha siga perfecta.'
          : 'Completa Sanes con todos sus pagos a tiempo para subir tu racha.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Vertical padding throughout this file is applied inline from the scale;
  // what stays here is everything the screen's height has no say over.
  root: { flex: 1, minHeight: 0 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingHorizontal: 24 },
  scene: { flex: 1, minHeight: 0, flexDirection: 'row' },
  meter: { width: 104 },
  track: { position: 'absolute', left: -24, width: 72, top: 20, bottom: 20,
    borderWidth: 1, borderRadius: 24, borderCurve },
  clip: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden', borderRadius: 24, borderCurve },
  fillMask: { overflow: 'hidden' },
  energy: { position: 'absolute', bottom: 0, left: 0, right: 0, borderBottomRightRadius: 24 },
  tickRow: { position: 'absolute', left: 52, height: 28, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tickNumber: { fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'], minWidth: 20, textAlign: 'center' },
  milestone: { width: 28, height: 26, borderRadius: 8, borderCurve, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center' },
  milestoneNumber: { fontSize: 18, lineHeight: 22, letterSpacing: -0.7 },
  currentNumber: { fontFamily: fontFamily.bold, fontVariant: ['tabular-nums'], letterSpacing: -1, transform: [{ skewX: '-6deg' }] },
  marker: { position: 'absolute', bottom: 2, left: -8, width: 54, height: 36,
    alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  markerPoint: { position: 'absolute', right: -7, borderTopWidth: 7, borderBottomWidth: 7,
    borderLeftWidth: 8, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  companion: { flex: 1, minWidth: 0, paddingRight: 24, paddingLeft: 4, alignItems: 'center' },
  bubble: { borderWidth: 2,
    // Keep the cloud close to its longest line instead of spanning the companion column.
    borderRadius: 24, borderCurve, width: '80%', maxWidth: 190 },
  center: { textAlign: 'center' },
  tail: { position: 'absolute', bottom: -8, left: '46%', width: 14, height: 14,
    transform: [{ rotate: '45deg' }], borderBottomWidth: 2, borderRightWidth: 2 },
  caption: { textAlign: 'center', paddingHorizontal: 24 },
});
