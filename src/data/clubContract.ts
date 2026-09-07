import type { ClubPointsProgressPayload, ClubState } from '../domain';

/**
 * The only payload the isolated Club UI consumes.
 *
 * The demo and the future backend adapter both implement this shape. Keeping
 * transport details outside the components lets the integration team replace
 * hardcoded values without touching the visual layer.
 */
export interface ClubSnapshot {
  club: ClubState;
  isDelinquent: boolean;
  hasActiveSan: boolean;
  pointsProgress?: ClubPointsProgressPayload | null;
}

export interface ClubRepository {
  getSnapshot(): Promise<ClubSnapshot>;
}
