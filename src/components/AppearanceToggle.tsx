import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from './Text';
import { radius, borderCurve, spacing, duration, useAppearance, useTheme } from '../theme';

interface AppearanceToggleProps {
  /** `row` for a settings list; `icon` for a compact control in a header. */
  variant?: 'row' | 'icon';
}

/**
 * Light / dark switch.
 *
 * Both themes were defined the day the palette was, and every component reads
 * semantic tokens rather than colours — so this control changes the entire app
 * without a single screen knowing it exists. That is the whole return on the
 * token architecture, collected here.
 */
export function AppearanceToggle({ variant = 'row' }: AppearanceToggleProps) {
  const theme = useTheme();
  const { appearance, toggleAppearance } = useAppearance();
  const isDark = appearance === 'dark';

  const press = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAppearance();
  };

  if (variant === 'icon') {
    return (
      <Pressable
        onPress={press}
        hitSlop={spacing.md}
        accessibilityRole="switch"
        accessibilityState={{ checked: isDark }}
        accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        style={[styles.iconButton, { backgroundColor: theme.surface.inset }]}
      >
        <ModeGlyph isDark={isDark} color={theme.text.primary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={press}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Modo oscuro"
      style={[styles.row, { backgroundColor: theme.surface.raised }]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.rowIcon, { backgroundColor: theme.surface.inset }]}>
          <ModeGlyph isDark={isDark} color={theme.text.primary} />
        </View>

        <View style={styles.rowText}>
          <Text variant="label">Modo oscuro</Text>
          <Text variant="labelSm" color="muted">
            {isDark ? 'Activado' : 'Desactivado'}
          </Text>
        </View>
      </View>

      <Switch on={isDark} />
    </Pressable>
  );
}

/** Sun or moon, chosen by the current mode. */
function ModeGlyph({ isDark, color }: { isDark: boolean; color: string }) {
  if (isDark) {
    return (
      <Svg width={19} height={19} viewBox="0 0 24 24">
        <Path
          d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
          stroke={color}
          strokeWidth={1.9}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }

  return (
    <Svg width={19} height={19} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4.2} stroke={color} strokeWidth={1.9} fill="none" />
      <Path
        d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * The track and knob.
 *
 * Hand-built rather than RN's `Switch` because that component takes platform
 * colours and ignores the theme — the one control whose job is changing the
 * theme cannot be the one control that does not follow it.
 */
function Switch({ on }: { on: boolean }) {
  const theme = useTheme();
  const progress = useDerivedValue(() =>
    withTiming(on ? 1 : 0, { duration: duration.fast, easing: Easing.out(Easing.cubic) }),
  );

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_WIDTH - KNOB - 4) }],
  }));

  const track = useAnimatedStyle(() => ({
    backgroundColor: on ? theme.action.primary : theme.surface.inset,
  }));

  return (
    <Animated.View style={[styles.track, track]}>
      <Animated.View style={[styles.knob, knob, { backgroundColor: theme.surface.raised }]} />
    </Animated.View>
  );
}

const TRACK_WIDTH = 50;
const KNOB = 24;

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderRadius: radius.lg,
    borderCurve,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    gap: spacing['2xs'],
  },
  track: {
    width: TRACK_WIDTH,
    height: KNOB + 4,
    borderRadius: radius.pill,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: radius.pill,
  },
});
