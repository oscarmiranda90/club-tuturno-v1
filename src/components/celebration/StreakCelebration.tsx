import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { benefitsForStep, streakStepForCount, type ClubState, type StreakStep } from '../../domain';
import { borderCurve, radius, spacing, useTheme } from '../../theme';
import { Text } from '../Text';
import { StreakThermometer } from '../club/StreakThermometer';
import { MoneyPattern } from '../club/MoneyPattern';

interface StreakCelebrationProps {
  visible: boolean;
  /** Perfect-SAN count immediately before the SAN that just completed. */
  from: number;
  /** Server-confirmed perfect-SAN count after that completion. */
  to: number;
  onDone: () => void;
}

/*
  Lane 2's thresholds. §3.1

  This screen belongs to the perfect-SAN streak — the one that grants
  simultaneous SANes and the 0% commission. It opens when a SAN COMPLETES with
  every installment paid on time, which is the only event that moves this
  counter.

  The unit here is whole SANes. A payment never opens this screen: paying on
  time earns points, which raise the medal, and that has its own celebration.
*/
const MILESTONES: readonly StreakStep[] = [0, 3, 6, 12];

/**
 * A completion replay of the exact meter shown in Club. This component owns
 * only the celebration framing; the meter itself has one visual implementation.
 */
export function StreakCelebration({ visible, from, to, onDone }: StreakCelebrationProps) {
  const theme = useTheme();
  const [blue, blueDepth, green] = theme.surface.canvasWashClub;
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [arrived, setArrived] = useState(false);
  const reachedStep = streakStepForCount(to);
  const previousStep = streakStepForCount(from);
  const unlocked = reachedStep > previousStep;
  const nextMilestone = MILESTONES.find((milestone) => milestone > to) ?? null;
  const nextBenefits = nextMilestone === null ? null : benefitsForStep(nextMilestone);
  const activeBenefits = benefitsForStep(reachedStep);

  const club = useMemo<Pick<ClubState, 'streak'>>(() => ({
    streak: {
      step: previousStep,
      progressToNext: Math.max(0, from - previousStep),
      zeroCommissionSanId: null,
    },
  }), [from, previousStep]);

  const arrive = useCallback(() => {
    setArrived(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (!visible) setArrived(false);
  }, [visible]);

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
        <View style={[styles.body, { paddingTop: insets.top + spacing.xl }]}>
          <Text variant="labelSm" style={styles.center}>
            {arrived ? 'SAN PERFECTO CONFIRMADO' : 'TU RACHA ESTÁ SUBIENDO'}
          </Text>

          <View style={styles.meterFrame}>
            <StreakThermometer
              club={club}
              blocked={false}
              compact
              celebration={{ from, to, arrived, onArrive: arrive }}
            />
          </View>

          {arrived && (
            <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(220)} style={styles.result}>
              {unlocked ? (
                <View style={[styles.benefits, { backgroundColor: theme.surface.brandInset }]}>
                  <Text variant="labelSm" color="onBrandMuted">BENEFICIOS DE RACHA {to}</Text>
                  <Benefit label={`Hasta ${activeBenefits.simultaneousSanes} SANes a la vez`} />
                  {activeBenefits.zeroCommissionSan && (
                    <Benefit label="1 SAN de Modelo Juntos sin comisión" />
                  )}
                </View>
              ) : nextMilestone && nextBenefits ? (
                <View style={[styles.benefits, { backgroundColor: theme.surface.brandInset }]}>
                  <Text variant="titleSm" color="onBrand" style={styles.center}>
                    {nextMilestone - to} {nextMilestone - to === 1 ? 'SAN perfecto más' : 'SANes perfectos más'} y llegas a {nextMilestone}
                  </Text>
                  <Text variant="labelSm" color="onBrandMuted">AL LLEGAR OBTIENES</Text>
                  <Benefit label={`Hasta ${nextBenefits.simultaneousSanes} SANes a la vez`} />
                  {nextBenefits.zeroCommissionSan && (
                    <Benefit label="1 SAN de Modelo Juntos sin comisión" />
                  )}
                </View>
              ) : (
                <Text variant="body" color="onBrandMuted" style={styles.center}>
                  Tu racha ya alcanzó todos sus beneficios.
                </Text>
              )}
            </Animated.View>
          )}
        </View>

        {arrived && (
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
              <Text variant="button" style={{ color: theme.action.primaryText }}>Seguir</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

function Benefit({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.benefitRow}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path d="M5 13l4.5 4.5L19 7" stroke={theme.action.primary} strokeWidth={3}
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
      <Text variant="bodySm" color="onBrand" style={styles.benefitText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  center: { textAlign: 'center' },
  meterFrame: { height: 390 },
  result: { minHeight: 106 },
  benefits: {
    borderRadius: radius.xl,
    borderCurve,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitText: { flex: 1 },
  footer: { paddingHorizontal: spacing.lg },
  cta: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderCurve,
  },
});
