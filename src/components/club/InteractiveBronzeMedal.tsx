import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import type { Tier } from '../../domain';
import { duration } from '../../theme';
import { StaticTierMedal } from './StaticTierMedal';
import TierCoin3D from './BronzeCoin3D.dom';

interface InteractiveTierMedalProps {
  tier: Tier;
  size?: number;
}

const TIER_LABEL: Record<Tier, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  diamante: 'Diamante',
};

/**
 * Hosts a real Three.js scene in Expo's DOM view. This keeps WebGL working in
 * Expo Go's iOS simulator, where the native expo-gl surface can be blank.
 *
 * The scene is expensive to start — a web runtime boots, Three.js parses,
 * shaders compile, and the coin's face texture loads — and none of that can be
 * optimised away, because it is the cost of running WebGL inside a web view.
 * So the wait is covered rather than hidden: the flat artwork for the same tier
 * shows from the first frame, and the 3D coin fades in over it once it has
 * genuinely drawn something.
 *
 * A skeleton would be the wrong instrument here. Skeletons stand in for content
 * whose shape is known and whose pixels are not — but these pixels ARE known,
 * they ship in the bundle, and the flat image is the very texture the 3D coin
 * wraps around its face. The user sees their medal immediately; a moment later
 * it gains depth and starts to turn.
 */
export function InteractiveTierMedal({ tier, size = 152 }: InteractiveTierMedalProps) {
  const frame = size + 28;
  const effectPadding = tier === 'oro' || tier === 'diamante' ? 144 : 0;
  const viewport = frame + effectPadding;
  const viewportScale = viewport / frame;

  /*
    Readiness is tracked as WHICH tier is ready, not as a boolean.

    A boolean would stay true across a tier change while the new face fetched
    its own texture, and the coin would sit there showing the previous medal.
    Comparing against the current tier makes the flat artwork come back for the
    new one, which is the same treatment a first load gets.
  */
  const [readyTier, setReadyTier] = useState<Tier | null>(null);
  const ready = readyTier === tier;

  const handleReady = useCallback(() => setReadyTier(tier), [tier]);

  return (
    <View
      style={[
        styles.frame,
        {
          width: viewport,
          height: viewport,
          marginHorizontal: -effectPadding / 2,
          marginVertical: -effectPadding / 2,
        },
      ]}
      accessibilityRole="adjustable"
      accessibilityLabel={`Medalla de ${TIER_LABEL[tier]} tridimensional`}
      accessibilityHint="Arrastra hacia los lados para girarla"
    >
      {/*
        The flat medal, underneath, until the scene has a frame to show.

        Sized to `frame` rather than `viewport`: the extra padding on gold and
        diamond exists for effects that overflow the coin, and matching it here
        would print the artwork larger than the 3D coin that replaces it — the
        hand-off would read as a jump in scale.
      */}
      {!ready && (
        <Animated.View
          exiting={FadeOut.duration(duration.normal)}
          style={styles.placeholder}
          pointerEvents="none"
        >
          <StaticTierMedal tier={tier} size={frame} />
        </Animated.View>
      )}

      {/*
        Held at zero opacity rather than unmounted: it has to be mounted to
        load at all, and revealing it before its first frame is what the flat
        medal is there to prevent.
      */}
      <View
        style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
      >
        <TierCoin3D
          key={tier}
          tier={tier}
          viewportScale={viewportScale}
          onReady={handleReady}
          dom={{
            style: {
              width: viewport,
              height: viewport,
              backgroundColor: 'transparent',
            },
            scrollEnabled: false,
            bounces: false,
            showsHorizontalScrollIndicator: false,
            showsVerticalScrollIndicator: false,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'visible',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
