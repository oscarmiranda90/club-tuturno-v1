import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  money,
  maxAmountForTier,
  TIERS,
  type PaymentClubUpdate,
  type Tier,
} from '../../domain';
import { borderCurve, radius, spacing, useTheme } from '../../theme';
import { Text } from '../Text';
import { TutuMascot } from '../TutuMascot';
import { Medal } from '../club/Medal';
import { MoneyPattern } from '../club/MoneyPattern';

interface PointsCelebrationProps {
  visible: boolean;
  /** Atomic result returned after the backend confirms the payment. */
  update: PaymentClubUpdate;
  /** A streak milestone may still be waiting behind this payment result. */
  hasNext?: boolean;
  onDone: () => void;
}

const TIER_LABEL: Record<Tier, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  diamante: 'Diamante',
};

const CONFETTI = Array.from({ length: 52 }, (_, index) => ({
  x: ((index * 37 + 11) % 101) / 100,
  y: ((index * 61 + 7) % 101) / 100,
  rotation: (index % 2 === 0 ? 1 : -1) * (180 + index * 29),
  tall: index % 3 !== 0,
}));

/**
 * One payment, one progress story.
 *
 * The bar makes one continuous sweep to the server-confirmed result. If that
 * result crosses a medal threshold, the same screen changes the medal only
 * after the bar reaches it.
 */
export function PointsCelebration({
  visible,
  update,
  hasNext = false,
  onDone,
}: PointsCelebrationProps) {
  const theme = useTheme();
  const [blue, blueDepth, green] = theme.surface.canvasWashClub;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [finished, setFinished] = useState(false);

  const promotion = update.promotion;
  const tierBefore = promotion?.from ?? update.club.points.tier;
  const tierAfter = promotion?.to ?? update.club.points.tier;
  const tierIndex = TIERS.findIndex((definition) => definition.tier === tierBefore);
  const tierDefinition = TIERS[Math.max(tierIndex, 0)];
  const nextDefinition = promotion
    ? TIERS.find((definition) => definition.tier === promotion.to)
    : TIERS[tierIndex + 1];
  const threshold = nextDefinition?.minPoints ?? update.points.after;
  const span = Math.max(threshold - tierDefinition.minPoints, 1);
  const endProgress = promotion
    ? 1
    : nextDefinition
      ? clamp((update.points.after - tierDefinition.minPoints) / span)
      : 1;

  const progress = useSharedValue(0);
  const previousScale = useSharedValue(1);
  const previousOpacity = useSharedValue(1);
  const newScale = useSharedValue(1);
  const burst = useSharedValue(0);
  const shine = useSharedValue(0);

  const finishProgress = useCallback(() => {
    setFinished(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (!visible || !update.reward.celebrate) {
      setFinished(false);
      return;
    }

    setFinished(false);
    progress.value = 0;
    previousScale.value = 1;
    previousOpacity.value = 1;
    newScale.value = reduceMotion ? 1 : 1.12;
    burst.value = 0;
    shine.value = 0;

    progress.value = withDelay(
      reduceMotion ? 200 : 650,
      withTiming(
        endProgress,
        {
          duration: reduceMotion ? 650 : 2200,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        },
        (didFinish) => {
          if (didFinish) scheduleOnRN(finishProgress);
        },
      ),
    );
  }, [
    burst,
    endProgress,
    finishProgress,
    newScale,
    previousOpacity,
    previousScale,
    progress,
    reduceMotion,
    shine,
    update.reward.celebrate,
    visible,
  ]);

  useEffect(() => {
    if (!finished || !promotion) return;

    previousOpacity.value = withTiming(0, { duration: reduceMotion ? 100 : 140 });
    previousScale.value = withTiming(reduceMotion ? 1 : 0.86, {
      duration: reduceMotion ? 100 : 160,
      easing: Easing.out(Easing.quad),
    });
    newScale.value = reduceMotion
      ? withTiming(1, { duration: 140 })
      : withSequence(
        withTiming(1.12, { duration: 1 }),
        withTiming(0.96, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      );

    if (!reduceMotion) {
      burst.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) });
      shine.value = withDelay(
        180,
        withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
      );
    }
  }, [
    burst,
    finished,
    newScale,
    previousOpacity,
    previousScale,
    promotion,
    reduceMotion,
    shine,
  ]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));
  const previousMedalStyle = useAnimatedStyle(() => ({
    opacity: previousOpacity.value,
    transform: [{ scale: previousScale.value }],
  }));
  const newMedalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: newScale.value }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value < 0.5 ? shine.value * 1.35 : (1 - shine.value) * 1.35,
    transform: [{ translateX: -92 + shine.value * 184 }, { rotate: '18deg' }],
  }));

  if (!update.reward.celebrate) return null;

  const promoted = finished && promotion !== null;
  const destinationLabel = nextDefinition ? TIER_LABEL[nextDefinition.tier] : 'Máximo';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <LinearGradient
          pointerEvents="none"
          colors={[blue, blueDepth, green] as const}
          locations={[0, 0.7, 1]}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.92, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <MoneyPattern color={theme.text.onBrand} opacity={0.12} />
        {promotion && !reduceMotion && (
          <View pointerEvents="none" style={styles.confettiLayer}>
            {CONFETTI.map((particle, index) => (
              <ConfettiParticle
                key={index}
                burst={burst}
                x={particle.x * width - width / 2}
                y={particle.y * height - height * 0.42}
                originX={width / 2}
                originY={height * 0.42}
                rotation={particle.rotation}
                tall={particle.tall}
                color={index % 3 === 0 ? theme.text.onBrand : theme.action.primary}
              />
            ))}
          </View>
        )}

        <View style={[styles.body, { paddingTop: insets.top + spacing.xl }]}>
          <Text variant="labelSm" style={styles.center}>
            {promoted
              ? 'NUEVA MEDALLA DESBLOQUEADA'
              : finished
                ? 'PUNTOS RECIBIDOS'
                : `SUMANDO +${update.points.earned} PUNTOS`}
          </Text>

          <View
            style={styles.progressBlock}
            accessible
            accessibilityLabel={`${update.points.before} puntos antes, ${update.points.after} puntos después`}
          >
            <View style={styles.progressLabels}>
              <Text variant="labelSm">{TIER_LABEL[tierBefore]}</Text>
              <Text variant="labelSm">{destinationLabel}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.surface.brandInset }]}>
              <Animated.View
                style={[
                  styles.fill,
                  { backgroundColor: theme.action.primary },
                  progressStyle,
                ]}
              >
                <View style={[styles.progressHead, { backgroundColor: theme.text.onBrand }]} />
              </Animated.View>
            </View>
            <Text variant="bodySm" color="secondary" style={styles.center}>
              {promotion
                ? finished
                  ? `Meta alcanzada: ${nextDefinition?.minPoints ?? update.points.after} puntos`
                  : `${update.points.before} + ${update.points.earned} puntos`
                : nextDefinition
                ? `${update.points.after} de ${nextDefinition.minPoints} puntos`
                : `Total: ${update.points.after} puntos`}
            </Text>
          </View>

          <View style={styles.medalStage}>
            <View
              style={styles.medalWrap}
              accessible
              accessibilityLabel={`Nueva medalla: ${TIER_LABEL[tierAfter]}`}
            >
              {/* The earned medal is the permanent base layer. The previous
                  medal fades away above it, so a delayed animation callback
                  can never leave this stage empty. */}
              <Animated.View style={[styles.medalLayer, promotion ? newMedalStyle : undefined]}>
                <Medal tier={tierAfter} size={160} />
              </Animated.View>
              {promotion && (
                <Animated.View style={[styles.medalLayer, previousMedalStyle]}>
                  <Medal tier={tierBefore} size={160} />
                </Animated.View>
              )}
              <Animated.View style={[styles.shine, shineStyle]} pointerEvents="none" />
            </View>
          </View>

          <View style={styles.outcome}>
            {promoted ? (
              <Animated.View
                entering={reduceMotion ? undefined : FadeIn.duration(220)}
                style={styles.promotionContent}
              >
                <View style={styles.messageRow}>
                  <TutuMascot mood="dance" size={120} />
                  <View style={[styles.messageBubble, { backgroundColor: theme.surface.raised }]}>
                    <View
                      style={[styles.messageTail, { backgroundColor: theme.surface.raised }]}
                    />
                    <Text variant="titleSm" style={styles.messageTitle}>
                      ¡AHORA ERES{`\n`}NIVEL {TIER_LABEL[tierAfter].toUpperCase()}!
                    </Text>
                  </View>
                </View>
                <View style={styles.text}>
                  <Text variant="title" color="accent" style={styles.center}>
                    ¡Felicitaciones!
                  </Text>
                </View>

                <View style={[styles.unlocked, { backgroundColor: theme.surface.brandInset }]}>
                  <Text variant="labelSm" color="onBrandMuted">
                    BENEFICIOS DESBLOQUEADOS
                  </Text>
                  <Unlock label={`Puedes abrir SANes de hasta ${money(maxAmountForTier(tierAfter))}`} />
                  <Unlock label="Esta Medalla es tuya para siempre" />
                </View>
              </Animated.View>
            ) : (
              <View style={styles.text}>
                <TutuMascot mood="dance" size={112} />
                <Text variant="display" style={styles.center}>
                  +{update.points.earned} puntos
                </Text>
                <Text variant="body" color="secondary" style={styles.center}>
                  {finished ? update.reward.detail : `${update.points.before} → ${update.points.after}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {finished && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(200)}
            style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.action.primary, opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <Text variant="button" style={{ color: theme.action.primaryText }}>
                {hasNext ? 'Continuar' : promotion ? 'Ver mi Club' : 'Seguir'}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(value, 1));
}

function ConfettiParticle({
  burst,
  x,
  y,
  originX,
  originY,
  rotation,
  tall,
  color,
}: {
  burst: SharedValue<number>;
  x: number;
  y: number;
  originX: number;
  originY: number;
  rotation: number;
  tall: boolean;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.08, 0.72, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: x * burst.value },
      { translateY: y * burst.value + 26 * burst.value * burst.value },
      { rotate: `${rotation * burst.value}deg` },
      { scale: interpolate(burst.value, [0, 0.12, 1], [0.35, 1, 0.8]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: originX,
          top: originY,
          width: tall ? 7 : 10,
          height: tall ? 18 : 10,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function Unlock({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={styles.unlockRow}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M5 13l4.5 4.5L19 7"
          stroke={theme.action.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Text variant="bodySm" color="onBrand" style={styles.unlockText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  center: { textAlign: 'center' },
  progressBlock: { alignSelf: 'stretch', gap: spacing.sm },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 18, borderRadius: radius.pill, overflow: 'hidden' },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: radius.pill,
    transformOrigin: 'left center',
  },
  progressHead: {
    position: 'absolute',
    right: 0,
    top: 3,
    bottom: 3,
    width: 6,
    borderRadius: radius.pill,
  },
  medalStage: {
    width: 236,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalWrap: {
    width: 172,
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.pill,
  },
  medalLayer: {
    position: 'absolute',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shine: {
    position: 'absolute',
    width: 40,
    height: 240,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  confettiLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    borderRadius: radius.sm,
  },
  outcome: {
    alignSelf: 'stretch',
    minHeight: 236,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionContent: { alignSelf: 'stretch', gap: spacing.lg },
  messageRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  messageBubble: {
    width: 196,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderCurve,
    justifyContent: 'center',
  },
  messageTail: {
    position: 'absolute',
    left: -6,
    bottom: spacing.base,
    width: 14,
    height: 14,
    transform: [{ rotate: '45deg' }],
  },
  messageTitle: { textAlign: 'center' },
  text: { gap: spacing.xs, alignItems: 'center' },
  unlocked: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderCurve,
  },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unlockText: { flex: 1 },
  footer: { paddingHorizontal: spacing.lg },
  cta: {
    minHeight: 54,
    borderRadius: radius.pill,
    borderCurve,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
