import { useCallback, useState } from 'react';

import type { ClubSnapshot } from '../data/clubContract';
import {
  advanceLadder,
  clubUpdateForPayment,
  streakAfterCompletedSan,
  streakCount,
  TIERS,
  type PaymentClubUpdate,
  type Tier,
} from '../domain';
import { INITIAL_DEMO_SNAPSHOT } from './demoState';

const TIER_INDEX: Record<Tier, number> = {
  bronce: 0,
  plata: 1,
  oro: 2,
  diamante: 3,
};

function representativePoints(tier: Tier): number {
  const definition = TIERS[TIER_INDEX[tier]];
  const next = TIERS[TIER_INDEX[tier] + 1];
  return next
    ? Math.round(definition.minPoints + (next.minPoints - definition.minPoints) * 0.48)
    : definition.minPoints + 320;
}

export interface StreakDemoEvent {
  from: number;
  to: number;
}

/**
 * Stateful local adapter used only by the handoff playground.
 * Production should replace this hook with a repository/query adapter that
 * returns the same ClubSnapshot and server-confirmed transition payloads.
 */
export function useClubDemo() {
  const [snapshot, setSnapshot] = useState<ClubSnapshot>(INITIAL_DEMO_SNAPSHOT);
  const [pointsCelebration, setPointsCelebration] = useState<PaymentClubUpdate | null>(null);
  const [streakCelebration, setStreakCelebration] = useState<StreakDemoEvent | null>(null);

  const setTier = useCallback((tier: Tier) => {
    setSnapshot((current) => ({
      ...current,
      pointsProgress: null,
      club: {
        ...current.club,
        points: {
          ...current.club.points,
          tier,
          points: representativePoints(tier),
        },
        ladder: tier === 'diamante'
          ? (current.club.ladder ?? { currentMax: 400, completedAtCurrentMax: 0 })
          : null,
      },
    }));
  }, []);

  /*
    One SAN carried to the end with every installment on time. §3.1

    This is the only event the streak advances on, and the one the celebration
    replays — so the demo control opens it. Which finished SANes were perfect is
    a fact the payment ledger owns; this stands in for it locally.

    A payment is a different thing entirely: it earns points, which raise the
    medal, and `showPaymentCelebration` covers that.
  */
  const completePerfectSan = useCallback(() => {
    const streak = streakAfterCompletedSan(snapshot.club.streak, false);
    setStreakCelebration({
      from: streakCount(snapshot.club.streak),
      to: streakCount(streak),
    });
    setSnapshot({ ...snapshot, club: { ...snapshot.club, streak } });
  }, [snapshot]);

  const completeDiamondSan = useCallback(() => {
    setSnapshot((current) => {
      const ladder = current.club.points.tier === 'diamante'
        ? (current.club.ladder ?? { currentMax: 400, completedAtCurrentMax: 0 })
        : { currentMax: 400, completedAtCurrentMax: 0 };

      return {
        ...current,
        club: {
          ...current.club,
          points: {
            ...current.club.points,
            tier: 'diamante',
            points: Math.max(current.club.points.points, 1820),
          },
          ladder: advanceLadder(ladder, ladder.currentMax, false),
        },
      };
    });
  }, []);

  const showPaymentCelebration = useCallback(() => {
    const update = clubUpdateForPayment(10, 'juntos', 'onTime', snapshot.club);
    setPointsCelebration(update);
    setSnapshot({ ...snapshot, club: update.club });
  }, [snapshot]);

  const showTierCelebration = useCallback(() => {
    const currentIndex = TIER_INDEX[snapshot.club.points.tier];
    const fromTier = currentIndex >= TIERS.length - 1
      ? 'bronce'
      : snapshot.club.points.tier;
    const nextDefinition = TIERS[TIER_INDEX[fromTier] + 1];
    const pointsBefore = nextDefinition.minPoints - 20;
    const before = {
      ...snapshot.club,
      points: {
        ...snapshot.club.points,
        tier: fromTier,
        points: pointsBefore,
      },
      ladder: null,
    };
    const update = clubUpdateForPayment(10, 'juntos', 'onTime', before);
    setPointsCelebration(update);
    setSnapshot({ ...snapshot, club: update.club, pointsProgress: null });
  }, [snapshot]);

  const reset = useCallback(() => {
    setSnapshot(INITIAL_DEMO_SNAPSHOT);
    setPointsCelebration(null);
    setStreakCelebration(null);
  }, []);

  return {
    snapshot,
    pointsCelebration,
    streakCelebration,
    setTier,
    completePerfectSan,
    completeDiamondSan,
    showPaymentCelebration,
    showTierCelebration,
    closePointsCelebration: () => setPointsCelebration(null),
    closeStreakCelebration: () => setStreakCelebration(null),
    reset,
  };
}
