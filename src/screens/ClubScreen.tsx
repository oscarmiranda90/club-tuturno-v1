import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Defs, Rect, Stop, RadialGradient as SvgRadialGradient } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { ClubHero } from '../components/club/ClubHero';
import { BenefitsCarousel } from '../components/club/BenefitsCarousel';
import { ClubRulesSheet } from '../components/club/ClubRulesSheet';
import { StreakThermometer } from '../components/club/StreakThermometer';
import { MoneyPattern } from '../components/club/MoneyPattern';
import {
  mascotMoodForClub,
  resolveClubPointsProgress,
  type ClubPointsProgressPayload,
} from '../domain';
import type { ClubSnapshot } from '../data/clubContract';
import { spacing, useTheme } from '../theme';

function ClubWash() {
  const theme = useTheme();
  const [blue, mid, green] = theme.surface.canvasWashClub;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[blue, mid, mid] as const}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/*
        `viewBox` with `preserveAspectRatio="none"` lets one 100x100 unit square
        stretch to whatever the sheet's size is, so the lights stay anchored to
        the corners on every screen rather than drifting with the aspect ratio.
      */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          {/* The wide one. Its centre sits below the frame so only the top of
              the falloff is visible — a horizon, not a circle. */}
          <SvgRadialGradient id="clubWhite" cx="0.30" cy="1.06" rx="0.95" ry="0.52">
            <Stop offset="0" stopColor={mid} stopOpacity="1" />
            <Stop offset="0.62" stopColor={mid} stopOpacity="0.62" />
            <Stop offset="1" stopColor={mid} stopOpacity="0" />
          </SvgRadialGradient>

          {/* The small one, tucked into the opposite corner. */}
          <SvgRadialGradient id="clubGreen" cx="1.02" cy="1.02" rx="0.46" ry="0.30">
            <Stop offset="0" stopColor={green} stopOpacity="0.95" />
            <Stop offset="0.55" stopColor={green} stopOpacity="0.5" />
            <Stop offset="1" stopColor={green} stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>

        <Rect x="0" y="0" width="100" height="100" fill="url(#clubWhite)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#clubGreen)" />
      </Svg>
    </View>
  );
}

/** The hero, streak and terms share the available sheet height. */
export function ClubScreen(props: {
  data: ClubSnapshot;
  onBack: () => void;
  /** Filled by the Club endpoint when available; demo values use the local fallback. */
  pointsProgress?: ClubPointsProgressPayload | null;
}) {
  // Measure this modal's safe area, rather than inheriting the home screen's notch inset.
  return <SafeAreaProvider><ClubContent {...props} /></SafeAreaProvider>;
}

function ClubContent({ data, onBack, pointsProgress }: {
  data: ClubSnapshot;
  onBack: () => void;
  pointsProgress?: ClubPointsProgressPayload | null;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const club = data.club;
  const compact = height > 0 && height - insets.top - insets.bottom < 700;
  const mascotMood = mascotMoodForClub(club, data.isDelinquent, data.hasActiveSan);
  const heroPointsProgress = resolveClubPointsProgress(club, pointsProgress);

  return (
    <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={[styles.root, { backgroundColor: theme.surface.canvas }]}>
      <ClubWash />
      <MoneyPattern />
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <ClubHero club={club} progress={heroPointsProgress} mascotMood={mascotMood}
          onBack={onBack} compact={compact} onOpenBenefits={() => setBenefitsOpen(true)} />
        <StreakThermometer club={club} blocked={data.isDelinquent} compact={compact} />
        <Pressable onPress={() => setRulesOpen(true)} accessibilityRole="button"
          accessibilityLabel="Leer los términos completos del Club"
          style={({ pressed }) => [styles.rulesButton, { opacity: pressed ? 0.6 : 1 }]}>
          <Text variant="label" color="secondary">Términos del Club</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M9 6l6 6-6 6" stroke={theme.text.secondary} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
      </View>
      <BenefitsCarousel visible={benefitsOpen} currentTier={club.points.tier} onClose={() => setBenefitsOpen(false)} />
      <ClubRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, gap: spacing.sm },
  rulesButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginHorizontal: 64 },
});
