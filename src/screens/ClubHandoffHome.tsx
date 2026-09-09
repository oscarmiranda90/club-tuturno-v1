import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { AppearanceToggle } from '../components/AppearanceToggle';
import { PointsCelebration } from '../components/celebration/PointsCelebration';
import { StreakCelebration } from '../components/celebration/StreakCelebration';
import { ClubProgress } from '../components/home/ClubProgress';
import { Text } from '../components/Text';
import { DevControls } from '../demo/DevControls';
import { useClubDemo } from '../demo/useClubDemo';
import { spacing, useTheme } from '../theme';
import { ClubScreen } from './ClubScreen';

/** Minimal host screen that represents the legacy app integration point. */
export function ClubHandoffHome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const demo = useClubDemo();
  const [green, setGreen] = useState(false);
  const [clubOpen, setClubOpen] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: theme.surface.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topControls}>
          <Text variant="labelSm" color="muted" style={styles.buildLabel}>CLUB V1 · DEMO</Text>
          <AppearanceToggle variant="icon" />
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setGreen((current) => !current);
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: green }}
            style={({ pressed }) => [
              styles.greenButton,
              {
                backgroundColor: green ? theme.action.primary : theme.surface.raised,
                borderColor: green ? theme.action.primary : theme.border.subtle,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={[styles.greenDot, {
              backgroundColor: green ? theme.action.primaryText : theme.action.primary,
            }]} />
            <Text
              variant="labelSm"
              style={{ color: green ? theme.action.primaryText : theme.text.primary }}
            >
              Verde
            </Text>
          </Pressable>
        </View>

        <ClubProgress
          club={demo.snapshot.club}
          tone={green ? 'green' : 'default'}
          onPress={() => setClubOpen(true)}
        />

        <DevControls
          club={demo.snapshot.club}
          onTier={demo.setTier}
          onIncreaseStreak={demo.completePerfectSan}
          onCompleteDiamondSan={demo.completeDiamondSan}
          onPaymentCelebration={demo.showPaymentCelebration}
          onTierCelebration={demo.showTierCelebration}
          onReset={demo.reset}
        />
      </ScrollView>

      <Modal
        visible={clubOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setClubOpen(false)}
      >
        <ClubScreen
          data={demo.snapshot}
          pointsProgress={demo.snapshot.pointsProgress}
          onBack={() => setClubOpen(false)}
        />
      </Modal>

      {demo.pointsCelebration && (
        <PointsCelebration
          visible
          update={demo.pointsCelebration}
          onDone={demo.closePointsCelebration}
        />
      )}
      {demo.streakCelebration && (
        <StreakCelebration
          visible
          from={demo.streakCelebration.from}
          to={demo.streakCelebration.to}
          onDone={demo.closeStreakCelebration}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buildLabel: { flex: 1 },
  greenButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  greenDot: { width: 10, height: 10, borderRadius: 5 },
});
