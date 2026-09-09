import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '../components/Text';
import { Medal } from '../components/club/Medal';
import { money, TIERS, type ClubState, type Tier } from '../domain';
import { borderCurve, radius, spacing, useTheme } from '../theme';

interface DevControlsProps {
  club: ClubState;
  onTier: (tier: Tier) => void;
  onIncreaseStreak: () => void;
  onCompleteDiamondSan: () => void;
  onPaymentCelebration: () => void;
  onTierCelebration: () => void;
  onReset: () => void;
}

const TIER_LABEL: Record<Tier, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  diamante: 'Diamante',
};

/** Visible in this handoff build only; the production app must omit it. */
export function DevControls({
  club,
  onTier,
  onIncreaseStreak,
  onCompleteDiamondSan,
  onPaymentCelebration,
  onTierCelebration,
  onReset,
}: DevControlsProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const run = (action: () => void) => {
    void Haptics.selectionAsync();
    action();
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => run(() => setOpen(true))}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.handle,
          {
            backgroundColor: theme.surface.inset,
            borderColor: theme.border.subtle,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text variant="labelSm" color="secondary">Abrir controles DEV</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.panel, { backgroundColor: theme.surface.inset }]}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text variant="titleSm">Controles DEV</Text>
          <Text variant="bodySm" color="secondary">
            Cambia los datos demo y abre cada celebración.
          </Text>
        </View>
        <Pressable onPress={() => run(() => setOpen(false))} hitSlop={12}>
          <Text variant="labelSm" color="secondary">Ocultar</Text>
        </Pressable>
      </View>

      <Text variant="labelSm" color="muted">MEDALLA</Text>
      <View style={styles.tierRow}>
        {TIERS.map((definition) => {
          const selected = club.points.tier === definition.tier;
          return (
            <Pressable
              key={definition.tier}
              onPress={() => run(() => onTier(definition.tier))}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Nivel ${TIER_LABEL[definition.tier]}`}
              style={[
                styles.tier,
                {
                  backgroundColor: selected ? theme.surface.raised : 'transparent',
                  borderColor: selected ? theme.action.primary : theme.border.subtle,
                },
              ]}
            >
              <Medal tier={definition.tier} size={34} locked={!selected} />
              <Text variant="labelSm" color={selected ? 'primary' : 'secondary'}>
                {TIER_LABEL[definition.tier]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="labelSm" color="muted">ESTADO ACTUAL</Text>
      <Text variant="bodySm" color="secondary">
        {club.points.points} puntos · racha visible {club.streak.step + club.streak.progressToNext}
        {club.ladder
          ? ` · escalera ${money(club.ladder.currentMax)} (${club.ladder.completedAtCurrentMax}/2 SANes)`
          : ''}
      </Text>

      <View style={styles.actions}>
        <Action label="Felicitar pago" onPress={() => run(onPaymentCelebration)} />
        <Action label="Subir de nivel" onPress={() => run(onTierCelebration)} />
        <Action label="Completar SAN perfecto" onPress={() => run(onIncreaseStreak)} />
        <Action label="Avanzar escalera" onPress={() => run(onCompleteDiamondSan)} />
        <Action label="Reiniciar demo" quiet onPress={() => run(onReset)} />
      </View>
    </View>
  );
}

function Action({ label, onPress, quiet = false }: {
  label: string;
  onPress: () => void;
  quiet?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: quiet ? theme.surface.raised : theme.action.primary,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Text
        variant="labelSm"
        style={{ color: quiet ? theme.text.primary : theme.action.primaryText }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  handle: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderCurve,
    borderWidth: StyleSheet.hairlineWidth,
  },
  panel: {
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.xl,
    borderCurve,
  },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headingCopy: { flex: 1, gap: spacing['2xs'] },
  tierRow: { flexDirection: 'row', gap: spacing.xs },
  tier: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2xs'],
    borderRadius: radius.md,
    borderCurve,
    borderWidth: 1,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderCurve,
  },
});
