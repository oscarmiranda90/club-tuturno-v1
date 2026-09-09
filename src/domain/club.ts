/**
 * Tu Turno — Club rules
 *
 * The two lanes as pure functions. Nothing here reads a component, and nothing
 * in a component should reimplement any of it: these rules decide real money
 * and real benefits, so they get one home, are testable in isolation, and stay
 * traceable to the clause that mandates them.
 *
 * Every function below cites the section of the master spec it implements.
 */

import { moneyExact } from './money';
import {
  DELINQUENCY_GRACE_DAYS,
  type AmountLadder,
  type DelinquencyEpisode,
  type DelinquencyPhase,
  type ClubState,
  type ClubMascotMood,
  type SanModel,
  type StreakStep,
  type Tier,
  LADDER_CEILING,
  LADDER_SANES_REQUIRED,
  LADDER_STEP,
  POINTS_PER_UNIT,
  STREAK_BENEFITS,
  TIERS,
} from './types';

/**
 * Persistent mascot state for the Club screen.
 *
 * Celebration is deliberately absent here: `dance` is an event shown after a
 * punctual payment, while these states describe what is true while the Club
 * is open. Priority matters — an overdue payment must never be softened by an
 * inactivity or welcome state.
 */
export function mascotMoodForClub(
  club: ClubState,
  isDelinquent: boolean,
  hasActiveSan: boolean,
): Exclude<ClubMascotMood, 'dance'> | null {
  if (isDelinquent) return 'angry';
  if (club.points.pointsExpireAt) return 'sad';

  const isNewAccount =
    !hasActiveSan &&
    club.points.points === 0 &&
    club.streak.step === 0 &&
    club.streak.progressToNext === 0;

  return isNewAccount ? 'idle' : null;
}

// ---------------------------------------------------------------------------
// Lane 1 — Points
// ---------------------------------------------------------------------------

export type PaymentTiming = 'early' | 'onTime' | 'late';

/**
 * Points for one payment. §2.2
 *
 * Late payments earn zero — they neither add nor subtract. The distinction
 * matters at the UI layer: a late payment must be confirmed neutrally, never
 * shown as "+0 puntos", which reads as a penalty the spec explicitly forbids.
 */
export function pointsForPayment(
  amountPaid: number,
  model: SanModel,
  timing: PaymentTiming,
): number {
  return Math.round(amountPaid * POINTS_PER_UNIT[model][timing]);
}

/**
 * The tier a points balance qualifies for. §2.1
 *
 * Use this ONLY to decide whether a user has earned a promotion. Never to
 * display or store the current tier: medals never retreat, and points expire
 * after six months while the medal survives — so a legitimate Diamante can sit
 * at zero points, and this function would demote them.
 */
export function tierForPoints(points: number): Tier {
  let earned: Tier = 'bronce';
  for (const definition of TIERS) {
    if (points >= definition.minPoints) earned = definition.tier;
  }
  return earned;
}

/** §2.1 — the base maximum for a tier, before the Diamante ladder. */
export function maxAmountForTier(tier: Tier): number {
  return TIERS.find((definition) => definition.tier === tier)?.maxSanAmount ?? 100;
}

/**
 * Progress toward the next medal. The same deterministic result can feed the
 * Home and the compact points summary now requested in the Club hero.
 */
export interface ClubPointsProgress {
  /** Confirmed balance shown in the Club hero. */
  currentPoints: number;
  nextTier: Tier | null;
  pointsNeeded: number;
  fraction: number;
}

/**
 * Optional values the Club endpoint may return for the hero.
 *
 * Until the endpoint exists, every value comes from the deterministic local
 * rules. The payload remains partial so the API can be rolled out field by
 * field without causing the display to go blank.
 */
export interface ClubPointsProgressPayload {
  currentPoints?: number | null;
  nextTier?: Tier | null;
  pointsNeeded?: number | null;
  fraction?: number | null;
}

/** Deterministic local summary for the points lane. */
export function progressToNextTier(club: ClubState): ClubPointsProgress {
  const index = TIERS.findIndex((definition) => definition.tier === club.points.tier);
  const next = TIERS[index + 1];

  if (!next) {
    return {
      currentPoints: Math.max(0, club.points.points),
      nextTier: null,
      pointsNeeded: 0,
      fraction: 1,
    };
  }

  const floor = TIERS[index].minPoints;
  const span = next.minPoints - floor;
  const travelled = Math.max(0, club.points.points - floor);

  return {
    currentPoints: Math.max(0, club.points.points),
    nextTier: next.tier,
    pointsNeeded: Math.max(0, next.minPoints - club.points.points),
    fraction: Math.min(1, travelled / span),
  };
}

const isFiniteNonNegative = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * The one adapter between the Club API payload and the hero. A valid value
 * from the backend is authoritative; a missing or invalid field uses the
 * pure local calculation, so fixture and offline renders are deterministic.
 */
export function resolveClubPointsProgress(
  club: ClubState,
  payload: ClubPointsProgressPayload | null | undefined,
): ClubPointsProgress {
  const fallback = progressToNextTier(club);
  if (!payload) return fallback;

  return {
    currentPoints: isFiniteNonNegative(payload.currentPoints)
      ? payload.currentPoints
      : fallback.currentPoints,
    nextTier: payload.nextTier === undefined ? fallback.nextTier : payload.nextTier,
    pointsNeeded: isFiniteNonNegative(payload.pointsNeeded)
      ? payload.pointsNeeded
      : fallback.pointsNeeded,
    fraction: isFiniteNonNegative(payload.fraction)
      ? Math.min(1, payload.fraction)
      : fallback.fraction,
  };
}

// ---------------------------------------------------------------------------
// Lane 2 — Perfect SANes
// ---------------------------------------------------------------------------

const STEPS: StreakStep[] = [0, 3, 6, 12];

/**
 * Where a delinquency episode leaves the streak. §3.3
 *
 * Exactly one step down per episode, regardless of how many installments went
 * late inside it — and never below the base. Successive episodes do step down
 * successively; this function is called once per episode, not once per missed
 * installment.
 */
export function stepAfterDelinquency(current: StreakStep): StreakStep {
  const index = STEPS.indexOf(current);
  return index <= 0 ? 0 : STEPS[index - 1];
}

/** §3.1 — what a streak step grants. */
export function benefitsForStep(step: StreakStep) {
  return STREAK_BENEFITS[step];
}

/**
 * Perfect SANes still needed to reach the next step. §3.3
 *
 * Progress is consecutive and does not survive a fall: someone at step 6 with
 * four perfect SANes toward 12 drops to step 3 and loses those four.
 */
export function sanesToNextStep(step: StreakStep, progress: number): number | null {
  const index = STEPS.indexOf(step);
  const next = STEPS[index + 1];
  if (next === undefined) return null;
  return Math.max(0, next - step - progress);
}

/** The visible count for the Club's streak meter. */
export function streakCount(streak: ClubState['streak']): number {
  return streak.step + streak.progressToNext;
}

/** The last benefit threshold a visible streak count has earned. */
export function streakStepForCount(count: number): StreakStep {
  if (count >= 12) return 12;
  if (count >= 6) return 6;
  if (count >= 3) return 3;
  return 0;
}

/**
 * Advance the perfect-SAN streak after a SAN completes. §3.1
 *
 * The unit here is a whole SAN, not an installment. A perfect SAN is one
 * carried from beginning to end with every installment paid on time — five
 * installments or ten, it counts once, and only on completion.
 *
 * This used to advance per punctual payment, which handed out lane 2's real
 * benefits for a fraction of the work: three on-time installments of a single
 * SAN bought step 3, where §3.1 asks for three finished SANes. On a ten-payment
 * SAN that reached step 12 — four simultaneous SANes and the 0% commission —
 * after twelve installments instead of a hundred and twenty.
 *
 * A SAN that carried any late payment does not count. It does not reduce the
 * streak either: the fall is `stepAfterDelinquency`, driven by the delinquency
 * episode itself, and charging for the same lateness twice would take two steps
 * for one mistake.
 *
 * The server will become the authority for this transition; keeping the rule
 * pure gives the app one temporary implementation and one response shape to
 * replace when that endpoint arrives.
 */
export function streakAfterCompletedSan(
  streak: ClubState['streak'],
  wasDelinquent: boolean,
): ClubState['streak'] {
  if (wasDelinquent) return streak;

  const nextCount = streakCount(streak) + 1;
  const step = streakStepForCount(nextCount);

  return {
    ...streak,
    step,
    progressToNext: Math.max(0, nextCount - step),
  };
}

// ---------------------------------------------------------------------------
// Commission
// ---------------------------------------------------------------------------

/**
 * The rate to freeze onto a SAN at the moment it opens. §3.2, §5
 *
 * Call this once, when the SAN is created, and store the result on the SAN.
 * Never call it to render an existing SAN: conditions are frozen at opening and
 * a SAN that started at 0% ends at 0%, even if the user later goes delinquent.
 */
export function commissionForNewSan(
  model: SanModel,
  club: ClubState,
  hasZeroCommissionSanActive: boolean,
): number {
  const zeroApplies =
    model === 'juntos' &&
    benefitsForStep(club.streak.step).zeroCommissionSan &&
    !hasZeroCommissionSanActive;

  if (zeroApplies) return 0;
  return model === 'juntos' ? 0.15 : 0.174;
}

// ---------------------------------------------------------------------------
// The Diamante ladder
// ---------------------------------------------------------------------------

/**
 * Advance the ladder after a SAN completes. §11
 *
 * Only SANes at the current maximum count, and only when completed without
 * delinquency. Counting is cumulative rather than consecutive — a delinquency
 * along the way punishes through its own channels and leaves ladder progress
 * intact.
 */
export function advanceLadder(
  ladder: AmountLadder,
  completedAmount: number,
  wasDelinquent: boolean,
): AmountLadder {
  if (wasDelinquent) return ladder;
  if (completedAmount !== ladder.currentMax) return ladder;
  if (ladder.currentMax >= LADDER_CEILING) return ladder;

  const completed = ladder.completedAtCurrentMax + 1;

  if (completed < LADDER_SANES_REQUIRED) {
    return { ...ladder, completedAtCurrentMax: completed };
  }

  return {
    currentMax: Math.min(LADDER_CEILING, ladder.currentMax + LADDER_STEP),
    completedAtCurrentMax: 0,
  };
}

// ---------------------------------------------------------------------------
// The experience layer
// ---------------------------------------------------------------------------

/**
 * What a payment earns the user, in the second it is confirmed.
 *
 * The rules here are as binding as the arithmetic, and most of them are about
 * the negative case: a late payment gets a NEUTRAL confirmation — no animation,
 * no "+0 puntos", no reproach. Showing a zero would turn a missed bonus into a
 * punishment, and the spec forbids it.
 */
export interface PaymentReward {
  points: number;
  /** False for late payments: confirm the payment, celebrate nothing. */
  celebrate: boolean;
  /** Headline. Empty when there is nothing to celebrate. */
  headline: string;
  /** The distance still to travel, or the running total at Diamante. */
  detail: string;
}

/**
 * The Club result of an already-confirmed payment.
 *
 * The API will eventually be the authority that persists this change. Keeping
 * the transition as one domain result now prevents the payment UI from having
 * to independently calculate points, decide whether to celebrate, and guess
 * which medal is safe to store.
 */
export interface PaymentClubUpdate {
  club: ClubState;
  reward: PaymentReward;
  /**
   * Server-confirmed point movement. The celebration consumes these values
   * directly; it never guesses a previous balance from rendered app state.
   */
  points: {
    before: number;
    earned: number;
    after: number;
  };
  /*
    No streak field: a payment moves no streak at all.

    Paying on time earns points, and points are what raise the medal. The
    perfect-SAN streak moves on one event only — a SAN completing with every
    installment paid on time — and that is `streakAfterCompletedSan`.
  */
  /** Present only when this payment earned a strictly higher permanent medal. */
  promotion: { from: Tier; to: Tier } | null;
}

export function rewardForPayment(
  amountPaid: number,
  model: SanModel,
  timing: PaymentTiming,
  club: ClubState,
): PaymentReward {
  const points = pointsForPayment(amountPaid, model, timing);

  if (timing === 'late' || points === 0) {
    return { points: 0, celebrate: false, headline: '', detail: '' };
  }

  const after: ClubState = {
    ...club,
    points: { ...club.points, points: club.points.points + points },
  };
  const progress = progressToNextTier(after);

  return {
    points,
    celebrate: true,
    headline: `+${points} puntos`,
    // Diamante has no next medal, so the running total replaces the distance —
    // a bar toward nothing is a bar that never moves.
    detail: progress.nextTier
      ? `Te faltan ${progress.pointsNeeded} para ${TIER_NAME[progress.nextTier]}`
      : `Total: ${after.points.points} puntos`,
  };
}

/**
 * Apply the Club portion of a confirmed payment. §1.8 / §2.1 / §2.2
 *
 * A tier is a permanent entitlement. Therefore a balance that happens to sit
 * below its old threshold (for example after point expiry) can never create a
 * false "promotion" or lower the stored medal.
 */
export function clubUpdateForPayment(
  amountPaid: number,
  model: SanModel,
  timing: PaymentTiming,
  club: ClubState,
): PaymentClubUpdate {
  const reward = rewardForPayment(amountPaid, model, timing, club);
  if (!reward.celebrate) {
    return {
      club,
      reward,
      points: {
        before: club.points.points,
        earned: 0,
        after: club.points.points,
      },
      promotion: null,
    };
  }

  const totalPoints = club.points.points + reward.points;
  /*
    A payment earns points and nothing else. It does not advance the perfect-SAN
    streak: §3.1 counts whole SANes finished without a late installment, which is
    `streakAfterCompletedSan`.
  */
  const qualifiedTier = tierForPoints(totalPoints);
  const previousIndex = TIERS.findIndex((definition) => definition.tier === club.points.tier);
  const qualifiedIndex = TIERS.findIndex((definition) => definition.tier === qualifiedTier);
  const promotion = qualifiedIndex > previousIndex
    ? { from: club.points.tier, to: qualifiedTier }
    : null;

  return {
    reward: promotion
      ? { ...reward, detail: `Alcanzaste ${TIER_NAME[promotion.to]}` }
      : reward,
    promotion,
    points: {
      before: club.points.points,
      earned: reward.points,
      after: totalPoints,
    },
    club: {
      ...club,
      points: {
        ...club.points,
        points: totalPoints,
        // Do not infer a downward change from the balance. Once unlocked, a
        // medal belongs to the person even if their points later expire.
        tier: promotion?.to ?? club.points.tier,
      },
      // Lane 2 is untouched by a payment. It moves on SAN completion only.
      streak: club.streak,
    },
  };
}

const TIER_NAME: Record<Tier, string> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  diamante: 'Diamante',
};

/**
 * When the user reaches the next medal, given their current pace.
 *
 * The spec asks for a date, not an encouragement: "llegas a Oro el 4 de
 * septiembre" is checkable, "si pagas a tiempo llegas a Oro" is not — and a
 * promise the user can verify is the one they act on.
 *
 * Returns null when there is nothing HONEST to project: no next medal, no
 * active SAN, a user in arrears, or — the case that matters — a next medal
 * that the installments already on the calendar do not reach. Never project a
 * date for someone who is blocked, and never past the schedule they have
 * actually committed to. Use `progressAfterCommittedSchedule` for that case.
 */
export function projectNextTier(
  club: ClubState,
  installmentAmount: number,
  model: SanModel,
  frequencyDays: number,
  isDelinquent: boolean,
  from: Date = new Date(),
  /**
   * Due dates of the installments still unpaid, ascending. The projection lands
   * on a real one whenever the schedule reaches far enough.
   */
  upcomingDueDates: readonly string[] = [],
): { installments: number; date: Date } | null {
  if (isDelinquent || installmentAmount <= 0) return null;

  const progress = progressToNextTier(club);
  if (!progress.nextTier) return null;

  const perInstallment = pointsForPayment(installmentAmount, model, 'onTime');
  if (perInstallment <= 0) return null;

  const installments = Math.ceil(progress.pointsNeeded / perInstallment);

  /*
    Land on the real due date, or return nothing at all.

    Two things are being refused here, and both were shipped as dates.

    The first: counting `installments * frequencyDays` forward from TODAY
    assumes the user pays the first one today, when it is actually due on its
    own date, days away. That error is a whole payment period at its worst and
    it always errs early — the app naming a day sooner than the calendar can
    deliver it.

    The second, and the serious one: extrapolating PAST the end of the current
    SAN. A user with five installments left who needs eight does not have three
    more coming — they have five, and then a decision. Whether they open
    another SAN, at what amount, on what frequency, is unknown and unknowable
    here. A date built on those three assumptions is not a projection; it is a
    promise the product cannot keep, made to someone who will remember it.

    So when the committed schedule does not reach the next medal, this returns
    null and the UI says what IS true: how far this SAN gets them. Silence
    about a date beats a date the calendar cannot support.
  */
  const landing = upcomingDueDates[installments - 1];
  if (!landing) return null;

  return { installments, date: new Date(landing) };
}

/**
 * How far the installments the user has already committed to will carry them.
 *
 * The honest answer when `projectNextTier` cannot name a date: this SAN does
 * not reach the next medal, and here is where it does land. It gives the user
 * something checkable to act on — finish this SAN, then open another — instead
 * of a date resting on a SAN they have not opened.
 */
export function progressAfterCommittedSchedule(
  club: ClubState,
  installmentAmount: number,
  model: SanModel,
  remainingInstallments: number,
): { pointsAtEnd: number; stillNeeded: number } | null {
  const progress = progressToNextTier(club);
  if (!progress.nextTier || remainingInstallments <= 0) return null;

  const perInstallment = pointsForPayment(installmentAmount, model, 'onTime');
  const pointsAtEnd = club.points.points + perInstallment * remainingInstallments;
  const stillNeeded = Math.max(
    0,
    TIERS.find((definition) => definition.tier === progress.nextTier)!.minPoints -
      pointsAtEnd,
  );

  return { pointsAtEnd, stillNeeded };
}

/** Frequency in days, for projecting dates. */
export const FREQUENCY_DAYS: Record<'semanal' | 'quincenal', number> = {
  semanal: 7,
  quincenal: 15,
};

/**
 * The reminder sent the day before an installment is due.
 *
 * Same notification, same timing, same frequency as today — only the content
 * changes. The spec is explicit that volume never rises; what rises is what the
 * message puts at stake.
 *
 * What is at stake is the SAN in progress: one late installment is what stops it
 * being perfect, and a perfect SAN is the only thing that moves the streak.
 * Being reminded of what you stand to lose is stronger than being reminded of
 * what you owe.
 *
 * `hasActiveSan` gates that framing. With no SAN open there is nothing to keep
 * perfect, so the message offers a start instead of naming a stake that does not
 * exist.
 */
export function reminderCopy(
  amount: number,
  club: ClubState,
  hasZeroCommissionSan: boolean,
  hasActiveSan: boolean,
): string {
  const money = moneyExact(amount);

  if (hasZeroCommissionSan) {
    return `Mañana vence tu cuota. Tu SAN sin comisión depende de tu racha perfecta — no la sueltes.`;
  }

  if (hasActiveSan) {
    return `¡Mañana vence tu cuota de ${money}! Tu SAN perfecto está en juego, no lo dejes caer.`;
  }

  return `Mañana vence tu cuota de ${money}. Págala a tiempo y empieza tu racha.`;
}

/**
 * The message that brings an inactive user back.
 *
 * The hook is the medal, because it is the one thing that survives absence.
 * Never sent to a delinquent user: the block stops them opening a SAN, so
 * inviting them to play would be a contradiction.
 */
/**
 * The line under the medal, one per tier.
 *
 * A single sentence for every level said the same thing to someone who just
 * arrived and to someone one step from the ceiling, which is the definition of
 * saying nothing. Each line instead names where the user stands and what the
 * next medal is — the medal is the reward, so the copy should point at it.
 *
 * Diamante has no next tier, so its line closes rather than points: there is
 * nothing above it, and inventing a further goal would be a promise the Club
 * does not keep.
 */
export function tierCopy(tier: Tier): string {
  switch (tier) {
    case 'bronce':
      return 'Empiezas tu camino. Paga a tiempo y llegas a Plata.';
    case 'plata':
      return 'Ya tienes tu primera medalla. Oro es el siguiente paso.';
    case 'oro':
      return 'Estás cerca de lo más alto. Diamante te espera.';
    case 'diamante':
      return 'Llegaste al nivel más alto del Club. La medalla es tuya para siempre.';
  }
}

export function reactivationCopy(
  club: ClubState,
  isDelinquent: boolean,
): string | null {
  if (isDelinquent) return null;

  const tier = TIER_NAME[club.points.tier];

  if (club.points.pointsExpireAt) {
    return `Tus ${club.points.points} puntos vencen el ${club.points.pointsExpireAt}. Tu medalla es tuya para siempre — juega antes y consérvalos.`;
  }

  return `Tu medalla de ${tier} sigue intacta. Tu próximo SAN arranca desde donde llegaste, no desde cero.`;
}

// ---------------------------------------------------------------------------
// Delinquency phases
// ---------------------------------------------------------------------------

/**
 * Which phase an open delinquency episode is in.
 *
 * The grace window exists because cutting someone off the moment an installment
 * slips would punish a late bank transfer as harshly as an abandonment. Six days
 * is the team's number, and after it the lockout is total — not just new SANes,
 * but every section.
 *
 * `now` is a parameter rather than read from the clock so this stays pure and
 * testable; callers pass the server's time, never the device's.
 */
export function delinquencyPhase(
  episode: DelinquencyEpisode | null,
  now: Date = new Date(),
): DelinquencyPhase {
  if (!episode || episode.resolvedAt !== null) return 'current';

  const started = new Date(episode.startedAt).getTime();
  const elapsedDays = (now.getTime() - started) / 86_400_000;

  return elapsedDays < DELINQUENCY_GRACE_DAYS ? 'grace' : 'locked';
}

/** Whole days left before the lockout. Zero once it has already happened. */
export function graceDaysLeft(
  episode: DelinquencyEpisode | null,
  now: Date = new Date(),
): number {
  if (!episode || episode.resolvedAt !== null) return 0;

  const started = new Date(episode.startedAt).getTime();
  const elapsedDays = (now.getTime() - started) / 86_400_000;

  return Math.max(0, Math.ceil(DELINQUENCY_GRACE_DAYS - elapsedDays));
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

export interface Eligibility {
  canOpenNewSan: boolean;
  /** Present only when blocked; ready to show to the user. */
  reason: string | null;
  maxAmount: number;
  simultaneousRemaining: number;
}

/**
 * Whether the user may open another SAN, and up to what amount. §4
 *
 * Delinquency blocks new SANes at every tier, with no exception. Existing SANes
 * continue — the obligation to those groups stands — but nothing new opens
 * until installments and surcharges are settled.
 */
export function eligibility(
  club: ClubState,
  activeSanCount: number,
  isDelinquent: boolean,
): Eligibility {
  const benefits = benefitsForStep(club.streak.step);
  const remaining = Math.max(0, benefits.simultaneousSanes - activeSanCount);

  const maxAmount =
    club.points.tier === 'diamante' && club.ladder
      ? club.ladder.currentMax
      : maxAmountForTier(club.points.tier);

  if (isDelinquent) {
    return {
      canOpenNewSan: false,
      reason:
        'Con una cuota vencida activa no puedes abrir SANes nuevos. Regulariza (cuota + recargo) y sigues jugando.',
      maxAmount,
      simultaneousRemaining: remaining,
    };
  }

  if (remaining === 0) {
    return {
      canOpenNewSan: false,
      reason: `Ya estás jugando ${benefits.simultaneousSanes} ${
        benefits.simultaneousSanes === 1 ? 'SAN' : 'SANes'
      } a la vez. Completa uno para abrir otro.`,
      maxAmount,
      simultaneousRemaining: 0,
    };
  }

  return { canOpenNewSan: true, reason: null, maxAmount, simultaneousRemaining: remaining };
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/**
 * A member's name as it appears beside their payment state.
 *
 * "Daniel Zambrano" becomes "Daniel Z." — the Figma's own convention on the
 * delinquency popup and both payment histories. It is enough for the group to
 * recognise each other and not enough to publish a legal name next to "debe la
 * cuota", which is a different thing to do to somebody.
 *
 * TuTurno takes seats to complete groups and appears in these lists like any
 * participant. It is named as the platform, never shortened as if it were a
 * person.
 */
export function displayName(member: { name: string; isPlatform: boolean }): string {
  if (member.isPlatform) return 'Tu Turno';

  const [first, ...rest] = member.name.trim().split(/\s+/);
  if (!rest.length) return first;

  return `${first} ${rest[rest.length - 1][0]}.`;
}
