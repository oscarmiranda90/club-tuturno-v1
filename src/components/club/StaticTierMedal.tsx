import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import type { Tier } from '../../domain';

interface StaticTierMedalProps {
  tier: Tier;
  size?: number;
  /** Unreached tiers stay recognisable but visually recede. */
  locked?: boolean;
}

const TIER_ASSET: Record<Tier, number> = {
  bronce: require('../../../assets/bronzev2.webp'),
  plata: require('../../../assets/plata_v2.webp'),
  oro: require('../../../assets/orov2.webp'),
  diamante: require('../../../assets/diamantev2.webp'),
};

const TIER_LABEL: Record<Tier, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  diamante: 'Diamante',
};

/** Lightweight tier artwork for compact surfaces; the Club hero owns the 3D version. */
export function StaticTierMedal({ tier, size = 42, locked = false }: StaticTierMedalProps) {
  return (
    <Image
      source={TIER_ASSET[tier]}
      style={[styles.image, { width: size, height: size, opacity: locked ? 0.32 : 1 }]}
      contentFit="contain"
      cachePolicy="memory-disk"
      priority="high"
      recyclingKey={`medal-${tier}`}
      transition={80}
      accessible
      accessibilityLabel={`Medalla ${TIER_LABEL[tier]}`}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    flexShrink: 0,
  },
});
