import type { Tier } from '../../domain';

import { StaticTierMedal } from './StaticTierMedal';

interface MedalProps {
  tier: Tier;
  size?: number;
  /** Kept for callers that still supply the former vector-only detail. */
  amount?: string;
  locked?: boolean;
}

/**
 * Shared Club medal surface.
 *
 * All medal contexts use the final exported artwork; keeping this compatibility
 * wrapper prevents a vector fallback from slipping back into celebrations,
 * pickers, or the tier rail.
 */
export function Medal({ tier, size = 96, locked = false }: MedalProps) {
  return <StaticTierMedal tier={tier} size={size} locked={locked} />;
}
