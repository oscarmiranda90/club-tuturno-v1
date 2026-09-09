import type { ClubSnapshot } from '../data/clubContract';

/** Hardcoded handoff values. Replace the repository, not the UI. */
export const INITIAL_DEMO_SNAPSHOT: ClubSnapshot = {
  club: {
    points: {
      points: 144,
      tier: 'bronce',
      pointsExpireAt: null,
    },
    streak: {
      step: 0,
      progressToNext: 2,
      zeroCommissionSanId: null,
    },
    ladder: null,
  },
  isDelinquent: false,
  hasActiveSan: true,
  pointsProgress: null,
};
