/** Types and configurable Venezuela parameters required by Club TuTurno V1. */

export type SanModel = 'juntos' | 'premium';

export const COMMISSION: Record<SanModel, number> = {
  juntos: 0.15,
  premium: 0.174,
};

export type Tier = 'bronce' | 'plata' | 'oro' | 'diamante';

export interface TierDefinition {
  tier: Tier;
  minPoints: number;
  maxPoints: number | null;
  maxSanAmount: number;
}

/** Replace this table with versioned country configuration when available. */
export const TIERS: readonly TierDefinition[] = [
  { tier: 'bronce', minPoints: 0, maxPoints: 299, maxSanAmount: 100 },
  { tier: 'plata', minPoints: 300, maxPoints: 799, maxSanAmount: 200 },
  { tier: 'oro', minPoints: 800, maxPoints: 1499, maxSanAmount: 300 },
  { tier: 'diamante', minPoints: 1500, maxPoints: null, maxSanAmount: 400 },
] as const;

export const POINTS_PER_UNIT: Record<
  SanModel,
  { onTime: number; early: number; late: 0 }
> = {
  juntos: { onTime: 2, early: 4, late: 0 },
  premium: { onTime: 1, early: 2, late: 0 },
};

export interface PointsLane {
  points: number;
  /** Stored entitlement; never derive a downward change from points. */
  tier: Tier;
  pointsExpireAt: string | null;
}

export type StreakStep = 0 | 3 | 6 | 12;

export interface StreakBenefits {
  simultaneousSanes: number;
  zeroCommissionSan: boolean;
}

export const STREAK_BENEFITS: Record<StreakStep, StreakBenefits> = {
  0: { simultaneousSanes: 1, zeroCommissionSan: false },
  3: { simultaneousSanes: 2, zeroCommissionSan: false },
  6: { simultaneousSanes: 3, zeroCommissionSan: false },
  12: { simultaneousSanes: 4, zeroCommissionSan: true },
};

export interface StreakLane {
  step: StreakStep;
  progressToNext: number;
  zeroCommissionSanId: string | null;
}

export interface AmountLadder {
  currentMax: number;
  completedAtCurrentMax: number;
}

export const LADDER_SANES_REQUIRED = 2;
export const LADDER_STEP = 100;
export const LADDER_CEILING = 1000;

export const DELINQUENCY_GRACE_DAYS = 6;

export interface DelinquencyEpisode {
  id: string;
  startedAt: string;
  resolvedAt: string | null;
  surchargeOwed: number;
  overdueInstallmentIds: string[];
}

export type DelinquencyPhase = 'current' | 'grace' | 'locked';

export interface ClubState {
  points: PointsLane;
  /**
   * Benefit streak based on completed perfect SANes. §3.1
   *
   * The Club has exactly one streak. An earlier draft also carried a visible
   * count of consecutive on-time installments; it was dropped, because paying
   * on time already has its own reward — points, which raise the medal — and a
   * second counter next to this one only invited users to read the two as one
   * mechanic.
   */
  streak: StreakLane;
  ladder: AmountLadder | null;
}

export type ClubMascotMood = 'idle' | 'sad' | 'angry' | 'dance';
