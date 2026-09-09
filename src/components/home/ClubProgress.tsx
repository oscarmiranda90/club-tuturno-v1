import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { StaticTierMedal } from '../club/StaticTierMedal';

import { Text } from '../Text';
import { progressToNextTier, streakCount, type ClubState } from '../../domain';
import { radius, borderCurve, spacing, duration, useTheme } from '../../theme';

interface ClubProgressProps {
  club: ClubState;
  /** Opens the Club. Without it the card is inert. */
  onPress?: () => void;
  /** Review-only presentation of the same card on the brand-green surface. */
  tone?: 'default' | 'green';
}

const TIER_LABEL: Record<string, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  diamante: 'Diamante',
};

/**
 * Club standing, on the home.
 *
 * The master spec splits this deliberately: points appear HERE and never on the
 * Club screen, which shows only the medal and active benefits. So this is the
 * one place in the app that answers "how far am I".
 *
 * The installment streak sits alongside it but is a different thing entirely —
 * it grants nothing and resets on a single late payment. It earns its place by
 * being the number a user can move today, where the medal is months away.
 */
export function ClubProgress({ club, onPress, tone = 'default' }: ClubProgressProps) {
  const theme = useTheme();
  const progress = progressToNextTier(club);
  const perfectSanes = streakCount(club.streak);
  const isGreen = tone === 'green';
  const foreground = isGreen ? theme.action.primaryText : theme.text.primary;
  const secondary = isGreen ? theme.action.primaryText : theme.text.secondary;
  const muted = isGreen ? theme.action.primaryText : theme.text.muted;

  return (
    <Animated.View entering={FadeIn.duration(duration.normal)}>
      <Pressable
        onPress={() => {
          if (!onPress) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={
          onPress ? `Club TuTurno, nivel ${TIER_LABEL[club.points.tier]}` : undefined
        }
        style={[
          styles.card,
          { backgroundColor: isGreen ? theme.action.primary : theme.surface.raised },
        ]}
      >
      <View style={styles.row}>
        {/*
          The medal, not just the word. It is the thing users recognise and the
          thing they want to tap — a row of text about a tier invites reading;
          the coin invites opening.
        */}
        <StaticTierMedal tier={club.points.tier} size={48} />

        <View style={styles.labelGroup}>
          <Text variant="labelSm" style={{ color: muted }}>
            TU NIVEL
          </Text>
          <Text variant="titleSm" style={{ color: foreground }}>
            {TIER_LABEL[club.points.tier]}
          </Text>
        </View>

        <View style={styles.spacer} />

        {/*
          The perfect-SAN streak, the Club's only streak.

          This chip used to show a separate count of consecutive on-time
          installments. That counter is gone: paying on time is already paid for
          in points, and a second number beside this one taught users that the
          two were the same mechanic.
        */}
        {perfectSanes > 0 && (
          <View
            style={[
              styles.streak,
              {
                backgroundColor: isGreen
                  ? theme.action.primaryText + '1F'
                  : theme.surface.inset,
              },
            ]}
          >
            {/*
              A drawn flame rather than the 🔥 emoji. Two attempts to render the
              emoji failed — Outfit carries no emoji glyphs, and neither a
              nested Text nor a sibling with its own style reaches a fallback
              font here. A vector always renders, takes its color from the
              theme like everything else, and cannot regress on a device whose
              emoji set differs.
            */}
            <Svg width={13} height={13} viewBox="0 0 24 24">
              <Path
                d="M12 2.5c1.6 3.2.6 5-1 6.6-1.7 1.7-3.5 3.2-3.5 6.1a4.5 4.5 0 009 0c0-1.6-.7-2.9-1.6-4 .3 1.5-.4 2.5-1.2 2.5-.9 0-1.4-.7-1.2-1.9.3-2 1.4-3.4-.5-9.3z"
                fill={theme.status.warning}
              />
            </Svg>
            <Text variant="labelSm" style={{ color: secondary }}>
              {perfectSanes} {perfectSanes === 1 ? 'SAN perfecto' : 'SANes perfectos'}
            </Text>
          </View>
        )}
      </View>

      {progress.nextTier ? (
        <>
          <View
            style={[
              styles.track,
              {
                backgroundColor: isGreen
                  ? theme.action.primaryText + '42'
                  : theme.surface.inset,
              },
            ]}
          >
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: isGreen ? theme.action.primaryText : theme.action.primary,
                  width: `${Math.round(progress.fraction * 100)}%`,
                },
              ]}
            />
          </View>

          <Text variant="labelSm" style={{ color: muted }}>
            {club.points.points} pts · te faltan {progress.pointsNeeded} para{' '}
            {TIER_LABEL[progress.nextTier]}
          </Text>
        </>
      ) : (
        // Diamante has no next medal, so a progress bar toward nothing would be
        // a bar that never moves. The accumulated total replaces it.
        <Text variant="labelSm" style={{ color: muted }}>
          {club.points.points} pts acumulados
        </Text>
      )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderCurve,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  labelGroup: {
    gap: spacing['2xs'],
  },
  spacer: { flex: 1 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.pill,
    borderCurve,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
