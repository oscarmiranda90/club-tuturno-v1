import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { ClubMascotMood } from '../domain';

interface TutuMascotProps {
  mood: ClubMascotMood;
  /** Rendered width in points. Height follows the source animation. */
  size?: number;
  /** Choose a specific welcome loop when a screen gives Tutu a fixed role. */
  idleVariant?: 'alternating' | 'one' | 'two';
}

const ART_W = 592;
const ART_H = 656;

const ANIMATIONS: Record<ClubMascotMood, number> = {
  angry: require('../../assets/piggy/tutu_angry.webp'),
  dance: require('../../assets/piggy/tutu_dance.webp'),
  sad: require('../../assets/piggy/tutu_sad.webp'),
  idle: require('../../assets/piggy/tutu_talk_1.webp'),
};

const POSTERS: Record<ClubMascotMood, number> = {
  angry: require('../../assets/piggy/tutu_angry_poster.png'),
  dance: require('../../assets/piggy/tutu_dance_poster.png'),
  sad: require('../../assets/piggy/tutu_sad_poster.png'),
  idle: require('../../assets/piggy/tutu_talk_1_poster.png'),
};

const TALK_ANIMATIONS = [
  require('../../assets/piggy/tutu_talk_1.webp'),
  require('../../assets/piggy/tutu_talk_2.webp'),
] as const;

const TALK_POSTERS = [
  require('../../assets/piggy/tutu_talk_1_poster.png'),
  require('../../assets/piggy/tutu_talk_2_poster.png'),
] as const;

const TALK_LOOP_MS = 5_063;

const ACCESSIBILITY_LABEL: Record<ClubMascotMood, string> = {
  angry: 'Tutu está molesto por un pago pendiente',
  dance: 'Tutu celebra tu logro',
  sad: 'Tutu te extraña',
  idle: 'Tutu te da la bienvenida al Club TuTurno',
};

/**
 * The animated Club mascot with one asset path for Android and iOS.
 *
 * Animated WebP keeps a real alpha channel on both platforms. The original
 * MP4 files remain as source renders, but they are not used at runtime because
 * MP4 cannot carry the transparent matte consistently across both players.
 */
export function TutuMascot({ mood, size = 112, idleVariant = 'alternating' }: TutuMascotProps) {
  const reduceMotion = useReducedMotion();
  const preferredTalk = idleVariant === 'two' ? 1 : 0;
  const [talkVariant, setTalkVariant] = useState(preferredTalk);

  useEffect(() => {
    setTalkVariant(preferredTalk);

    if (mood !== 'idle' || reduceMotion || idleVariant !== 'alternating') {
      return undefined;
    }

    const nextTalk = setInterval(() => {
      setTalkVariant((current) => (current + 1) % TALK_ANIMATIONS.length);
    }, TALK_LOOP_MS);

    return () => clearInterval(nextTalk);
  }, [idleVariant, mood, preferredTalk, reduceMotion]);

  const source = mood === 'idle'
    ? reduceMotion ? TALK_POSTERS[talkVariant] : TALK_ANIMATIONS[talkVariant]
    : reduceMotion ? POSTERS[mood] : ANIMATIONS[mood];

  return (
    <Image
      source={source}
      style={[styles.image, { width: size, height: size * (ART_H / ART_W) }]}
      contentFit="contain"
      transition={reduceMotion ? 0 : 120}
      cachePolicy="memory-disk"
      priority="high"
      recyclingKey={`${mood}-${talkVariant}`}
      decodeFormat="argb"
      enforceEarlyResizing
      // Apple's decoder is lighter, but Expo documents animation blending and
      // timing differences. libwebp keeps these authored loops intact.
      useAppleWebpCodec={false}
      accessible
      accessibilityLabel={ACCESSIBILITY_LABEL[mood]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});
