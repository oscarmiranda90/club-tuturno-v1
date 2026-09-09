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

/*
 * ---------------------------------------------------------------------------
 * Lane 2 — where the perfect-SAN streak comes from
 * ---------------------------------------------------------------------------
 *
 * READ THIS BEFORE WIRING A BACKEND.
 *
 * `club.streak` inside the snapshot is REPORTED BY THE SERVER, not computed
 * here. The app never advances it on its own, and that is deliberate.
 *
 * A perfect SAN is one carried from first installment to last with every
 * payment on time — five installments or ten, it counts once, on completion.
 * Deciding whether a finished SAN was perfect requires the payment ledger, the
 * real settlement dates, and the delinquency episodes. The client holds none of
 * those. Any attempt to derive the streak in the app is a second, weaker
 * implementation of a rule the server already owns, and the two WILL diverge.
 *
 * So the contract is one-directional: the server counts, the app displays.
 *
 * `streakAfterCompletedSan` in the domain layer is the same rule written down
 * (§3.1), kept for the demo and as executable documentation of what the server
 * is expected to do. Production code does not call it.
 *
 * WHAT THE SERVER MUST SUPPLY, in `club.streak`:
 *
 *   step            The last threshold reached: 0, 3, 6 or 12. This is what
 *                   grants benefits — simultaneous SANes and the 0% SAN.
 *   progressToNext  Perfect SANes completed BEYOND `step`, toward the next
 *                   threshold. A user at step 3 with two more perfect SANes
 *                   sends step: 3, progressToNext: 2 — that is 5 perfect SANes
 *                   total, one short of step 6.
 *
 * Both are counts of WHOLE COMPLETED SANES. Never installments — see the
 * warning below.
 *
 * Rules the server owns (§3.1, §3.3), restated so the mapping is unambiguous:
 *
 *   - A SAN that carried ANY late payment does not count toward the streak.
 *   - A delinquency episode drops the user exactly ONE threshold (12 → 6 → 3 →
 *     0), no matter how many installments went late inside that episode.
 *   - Partial progress does NOT survive a fall: someone at step 6 with four
 *     perfect SANes toward 12 drops to step 3 AND loses those four, so the
 *     payload becomes step: 3, progressToNext: 0.
 *   - Nothing here touches points, the medal, or the Diamante amount ladder.
 *
 * IF THE EXISTING BACKEND EXPOSES ONLY A RAW COUNT of perfect SANes, both
 * fields follow from it: `streakStepForCount(count)` in the domain layer gives
 * the threshold, and the remainder is the progress. That keeps the thresholds
 * defined in one place instead of two.
 *
 * ---------------------------------------------------------------------------
 * DO NOT MAP A PAYMENT COUNTER ONTO THIS FIELD
 * ---------------------------------------------------------------------------
 *
 * The Club has exactly one streak, and it counts SANes. If the existing backend
 * has a field called "streak" that counts consecutive on-time INSTALLMENTS,
 * that is not this field, and mapping it here is the single most expensive
 * mistake available: it once let twelve punctual payments buy benefits priced
 * at twelve finished SANes — on a ten-installment SAN, a tenth of the work for
 * the 0% commission.
 *
 * Paying on time is already rewarded, through points, which raise the medal. It
 * does not also move the streak.
 */
