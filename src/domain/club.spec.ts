/**
 * Tu Turno — Club rule verification
 *
 * Every case below is an example Dirección wrote into the master spec, run
 * against the implementation. Carlos (§3.4), José (§13.1) and Luisa (§11.3) are
 * theirs, not invented here — which is what makes this a check of the rules
 * rather than a check that the code agrees with itself.
 *
 * Run with: npx tsx src/domain/club.spec.ts
 *
 * Written as a standalone script because the project has no test runner yet.
 * When one lands, these assertions move over unchanged.
 */

import { rewardForPayment, clubUpdateForPayment, milestoneReached, reminderCopy, reactivationCopy, stepAfterDelinquency, displayName, advanceLadder, pointsForPayment, tierForPoints, eligibility, commissionForNewSan, delinquencyPhase, graceDaysLeft, projectNextTier, progressAfterCommittedSchedule, mascotMoodForClub, resolveClubPointsProgress } from './club';
import type { ClubState, StreakStep } from './types';

let fail = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
};

// §3.4 Carlos: 12 -> 6 -> 3, then rebuilds 3 -> 6 -> 12
eq('Carlos falls 12->6', stepAfterDelinquency(12), 6);
eq('Carlos falls 6->3', stepAfterDelinquency(6), 3);
eq('falls 3->base', stepAfterDelinquency(3), 0);
eq('base cannot fall further', stepAfterDelinquency(0), 0);

// §13.1 José pays $10 in Juntos at 8:15am -> +40 points
eq('Jose early Juntos $10', pointsForPayment(10, 'juntos', 'early'), 40);
eq('on-time Juntos $10', pointsForPayment(10, 'juntos', 'onTime'), 20);
eq('late earns zero', pointsForPayment(10, 'juntos', 'late'), 0);
eq('Premium on-time $10', pointsForPayment(10, 'premium', 'onTime'), 10);

// §2.1 thresholds
eq('299 is still Bronce', tierForPoints(299), 'bronce');
eq('300 is Plata', tierForPoints(300), 'plata');
eq('1500 is Diamante', tierForPoints(1500), 'diamante');

// §11.3 Luisa: two $400 SANes unlock $500
let ladder = { currentMax: 400, completedAtCurrentMax: 0 };
ladder = advanceLadder(ladder, 400, false);
eq('Luisa 1 of 2', ladder, { currentMax: 400, completedAtCurrentMax: 1 });
ladder = advanceLadder(ladder, 400, false);
eq('Luisa unlocks $500', ladder, { currentMax: 500, completedAtCurrentMax: 0 });
const withMora = advanceLadder(ladder, 500, true);
eq('delinquent SAN does not count', withMora, ladder);
eq('lower amount does not count', advanceLadder(ladder, 100, false), ladder);

// §4 delinquency blocks new SANes at every tier
const diamante: ClubState = {
  points: { points: 2000, tier: 'diamante', pointsExpireAt: null },
  streak: { step: 12 as StreakStep, progressToNext: 0, zeroCommissionSanId: null },
  ladder: { currentMax: 500, completedAtCurrentMax: 0 },
  cuotaStreak: 0,
};
eq('Diamante delinquent is blocked', eligibility(diamante, 1, true).canOpenNewSan, false);
eq('Diamante clean can open', eligibility(diamante, 1, false).canOpenNewSan, true);
eq('4 simultaneous is the cap', eligibility(diamante, 4, false).canOpenNewSan, false);

// §3.2 / §5 commission
eq('0% for first Juntos SAN at step 12', commissionForNewSan('juntos', diamante, false), 0);
eq('second Juntos SAN pays 15%', commissionForNewSan('juntos', diamante, true), 0.15);
eq('Premium NEVER 0%', commissionForNewSan('premium', diamante, false), 0.174);

// Figma comment, Héctor 2026-08-30: six days of chat access, then everything
// locks. Not in the master spec — this is the only place the rule lives.
const episode = (startedAt: string) => ({
  id: 'e', startedAt, resolvedAt: null, surchargeOwed: 2.5, overdueInstallmentIds: ['1'],
});
const at = (days: number) => new Date(Date.parse('2026-08-01T00:00:00Z') + days * 86_400_000);

eq('no episode is current', delinquencyPhase(null), 'current');
eq('day 0 is grace', delinquencyPhase(episode('2026-08-01T00:00:00Z'), at(0)), 'grace');
eq('day 5 still grace', delinquencyPhase(episode('2026-08-01T00:00:00Z'), at(5)), 'grace');
eq('day 6 locks', delinquencyPhase(episode('2026-08-01T00:00:00Z'), at(6)), 'locked');
eq('day 9 still locked', delinquencyPhase(episode('2026-08-01T00:00:00Z'), at(9)), 'locked');
eq('settled returns to current', delinquencyPhase(
  { ...episode('2026-08-01T00:00:00Z'), resolvedAt: '2026-08-03T00:00:00Z' }, at(9)), 'current');
eq('6 days left on day 0', graceDaysLeft(episode('2026-08-01T00:00:00Z'), at(0)), 6);
eq('1 day left on day 5', graceDaysLeft(episode('2026-08-01T00:00:00Z'), at(5)), 1);
eq('0 left once locked', graceDaysLeft(episode('2026-08-01T00:00:00Z'), at(7)), 0);

// --- The experience layer (§1.8) ---------------------------------------
//
// The negative cases carry the weight here. A late payment must confirm
// neutrally: no animation, no "+0 puntos", no reproach. Getting that wrong
// turns a missed bonus into a punishment, which the spec forbids outright.
const bronce: ClubState = {
  points: { points: 144, tier: 'bronce', pointsExpireAt: null },
  streak: { step: 0 as StreakStep, progressToNext: 0, zeroCommissionSanId: null },
  ladder: null,
  cuotaStreak: 8,
};
eq('Club hero points use the deterministic fallback', resolveClubPointsProgress(bronce, null), {
  currentPoints: 144, nextTier: 'plata', pointsNeeded: 156, fraction: 0.48,
});
eq('Club hero accepts a complete backend summary', resolveClubPointsProgress(bronce, {
  currentPoints: 148, nextTier: 'plata', pointsNeeded: 152, fraction: 0.493,
}), {
  currentPoints: 148, nextTier: 'plata', pointsNeeded: 152, fraction: 0.493,
});
eq('Club hero ignores an invalid backend number', resolveClubPointsProgress(bronce, {
  currentPoints: -1,
}), {
  currentPoints: 144, nextTier: 'plata', pointsNeeded: 156, fraction: 0.48,
});

const newAccount: ClubState = {
  points: { points: 0, tier: 'bronce', pointsExpireAt: null },
  streak: { step: 0, progressToNext: 0, zeroCommissionSanId: null },
  ladder: null,
  cuotaStreak: 0,
};

eq('Tutu welcomes a new Club account', mascotMoodForClub(newAccount, false, false), 'idle');
eq('an active SAN suppresses the welcome state', mascotMoodForClub(newAccount, false, true), null);
eq('delinquency has first priority', mascotMoodForClub(newAccount, true, false), 'angry');
eq('point expiry uses the inactive state', mascotMoodForClub({
  ...newAccount,
  points: { points: 820, tier: 'oro', pointsExpireAt: '2026-09-21' },
}, false, false), 'sad');

// §13.1: José pays $10 in Juntos at 8:15am → "+40 puntos"
const early = rewardForPayment(10, 'juntos', 'early', bronce);
eq('early payment celebrates', early.celebrate, true);
eq('José earns +40', early.headline, '+40 puntos');
eq('and sees the distance', early.detail, 'Te faltan 116 para Plata');

const late = rewardForPayment(10, 'juntos', 'late', bronce);
eq('late payment does NOT celebrate', late.celebrate, false);
eq('late shows no "+0 puntos"', late.headline, '');

const topTier: ClubState = {
  ...bronce,
  points: { points: 1820, tier: 'diamante', pointsExpireAt: null },
};
eq('Diamante sees a total, not a distance',
  rewardForPayment(10, 'juntos', 'onTime', topTier).detail, 'Total: 1840 puntos');

const nearPlata: ClubState = {
  ...bronce,
  points: { points: 280, tier: 'bronce', pointsExpireAt: null },
};
const juntosPromotion = clubUpdateForPayment(10, 'juntos', 'early', nearPlata);
eq('payment update carries the server-ready point movement', juntosPromotion.points,
  { before: 280, earned: 40, after: 320 });
eq('Juntos promotion records the medal transition', juntosPromotion.promotion,
  { from: 'bronce', to: 'plata' });
eq('promotion points acknowledge the reached tier', juntosPromotion.reward.detail,
  'Alcanzaste Plata');
eq('Juntos promotion stores the new point total', juntosPromotion.club.points.points, 320);
eq('Juntos promotion stores the new permanent medal', juntosPromotion.club.points.tier, 'plata');
eq('a punctual payment moves the Club streak one quota', juntosPromotion.streak,
  { before: 0, after: 1, milestone: null });

const noPromotion = clubUpdateForPayment(10, 'juntos', 'early', bronce);
eq('the same payment update works without a promotion', noPromotion.points,
  { before: 144, earned: 40, after: 184 });
eq('a normal point movement has no medal event', noPromotion.promotion, null);
eq('the fifth perfect quota unlocks streak 6',
  clubUpdateForPayment(10, 'juntos', 'onTime', {
    ...bronce,
    streak: { step: 3, progressToNext: 2, zeroCommissionSanId: null },
  }).streak,
  { before: 5, after: 6, milestone: 6 });

const lateUpdate = clubUpdateForPayment(10, 'juntos', 'late', bronce);
eq('a late confirmation keeps an explicit zero movement', lateUpdate.points,
  { before: 144, earned: 0, after: 144 });

const nearPlataPremium: ClubState = {
  ...bronce,
  points: { points: 290, tier: 'bronce', pointsExpireAt: null },
};
eq('Premium on-time payment can promote too',
  clubUpdateForPayment(10, 'premium', 'onTime', nearPlataPremium).promotion,
  { from: 'bronce', to: 'plata' });

const expiredDiamante: ClubState = {
  ...bronce,
  points: { points: 0, tier: 'diamante', pointsExpireAt: null },
};
const stillDiamante = clubUpdateForPayment(10, 'premium', 'onTime', expiredDiamante);
eq('an earned medal never appears to move backward', stillDiamante.promotion, null);
eq('an earned medal never moves backward in storage', stillDiamante.club.points.tier, 'diamante');

eq('3 is a milestone', milestoneReached(3), 3);
eq('24 is a milestone', milestoneReached(24), 24);
eq('7 is not', milestoneReached(7), null);

eq('a streak is put at stake',
  reminderCopy(10, bronce, false).includes('racha de 8 pagos perfectos'), true);
eq('no streak, an invitation instead',
  reminderCopy(10, { ...bronce, cuotaStreak: 0 }, false).includes('empieza tu racha'), true);
eq('0% outranks the streak line',
  reminderCopy(10, bronce, true).includes('sin comisión'), true);

eq('reactivation leads with the medal',
  (reactivationCopy(bronce, false) ?? '').includes('sigue intacta'), true);
eq('never sent to a delinquent user', reactivationCopy(bronce, true), null);

// How much of a person appears beside "debe la cuota".
eq('a full name is shortened',
  displayName({ name: 'Daniel Zambrano', isPlatform: false }), 'Daniel Z.');
eq('several surnames use the last',
  displayName({ name: 'Mercibeth de los Angeles', isPlatform: false }), 'Mercibeth A.');
eq('a lone first name stays whole',
  displayName({ name: 'Carol', isPlatform: false }), 'Carol');
eq('the platform is never shortened like a person',
  displayName({ name: 'TuTurno', isPlatform: true }), 'Tu Turno');

// A delinquency episode costs one rung, never more, never below the floor.
eq('6 falls to 3', stepAfterDelinquency(6), 3);
eq('3 falls to 0', stepAfterDelinquency(3), 0);
eq('0 cannot fall further', stepAfterDelinquency(0), 0);
eq('12 falls only to 6', stepAfterDelinquency(12), 6);

// ---------------------------------------------------------------------------
// The mandate's own rules, as assertions.
//
// These were a checklist of things to remember not to break. A rule nobody can
// run is a rule that erodes: every one below is now a test that fails loudly
// the day someone changes it by accident.
// ---------------------------------------------------------------------------

/** Streak step 12: the only place the zero-commission SAN is unlocked. */
const step12: ClubState = {
  ...bronce,
  streak: { step: 12 as StreakStep, progressToNext: 0, zeroCommissionSanId: null },
};

// Points only ever move up. Delinquency takes the streak, never the balance.
eq('points are never subtracted',
  pointsForPayment(10, 'juntos', 'late') >= 0, true);
eq('a late payment earns zero, not a penalty',
  pointsForPayment(10, 'juntos', 'late'), 0);

// The medal is permanent once earned.
eq('the medal never recomputes downward',
  tierForPoints(1500), 'diamante');
eq('and a point total inside a band keeps its tier',
  tierForPoints(299), 'bronce');

// 0% belongs to Juntos alone, one SAN at a time.
eq('Premium never gets 0%',
  commissionForNewSan('premium', step12, false), 0.174);
eq('Juntos at step 12 gets 0%',
  commissionForNewSan('juntos', step12, false), 0);
eq('but only one at a time',
  commissionForNewSan('juntos', step12, true), 0.15);
eq('and never below step 12',
  commissionForNewSan('juntos', bronce, false), 0.15);

// Delinquency blocks new SANes regardless of how high the tier is.
eq('delinquency blocks a Bronce user',
  eligibility(bronce, 0, true).canOpenNewSan, false);
eq('delinquency blocks a Diamante user too',
  eligibility(topTier, 0, true).canOpenNewSan, false);

// The Diamante ladder is cumulative: a rung already earned is never returned,
// and a delinquent SAN simply does not count toward the next one.
eq('a delinquent SAN does not advance the ladder',
  advanceLadder({ currentMax: 500, completedAtCurrentMax: 1 }, 500, true)
    .completedAtCurrentMax, 1);
eq('and never costs a rung already earned',
  advanceLadder({ currentMax: 500, completedAtCurrentMax: 1 }, 500, true).currentMax, 500);
// Two clean SANes at a ceiling raise it, and the count starts again there.
eq('the second clean SAN raises the ceiling',
  advanceLadder({ currentMax: 500, completedAtCurrentMax: 1 }, 500, false).currentMax, 600);
eq('and the count restarts at the new rung',
  advanceLadder({ currentMax: 500, completedAtCurrentMax: 1 }, 500, false)
    .completedAtCurrentMax, 0);
eq('the first one only counts',
  advanceLadder({ currentMax: 500, completedAtCurrentMax: 0 }, 500, false)
    .completedAtCurrentMax, 1);

// ---------------------------------------------------------------------------
// The projection may never outrun the calendar
// ---------------------------------------------------------------------------
//
// A date on this screen is a claim about a specific day, and users check it.
// Two ways to get it wrong shipped before these assertions existed: counting
// periods from today rather than from the real due date, and extrapolating
// past the end of the current SAN — inventing installments for a SAN the user
// has not opened, at an amount and frequency nobody knows.

const projecting: ClubState = {
  points: { points: 144, tier: 'bronce', pointsExpireAt: null },
  streak: { step: 0, progressToNext: 0, zeroCommissionSanId: null },
  ladder: null,
  cuotaStreak: 0,
};
// Five installments left on the active SAN, quincenal, $10 in Modelo Juntos.
const schedule = ['2026-09-05', '2026-09-20', '2026-10-05', '2026-10-20', '2026-11-04'];
const today = new Date('2026-09-03');

// 144 pts, 156 to Plata, 20 pts per installment -> 8 needed, only 5 committed.
eq('no date when the committed schedule cannot reach the next medal',
  projectNextTier(projecting, 10, 'juntos', 15, false, today, schedule), null);
// And the honest answer in its place: where this SAN actually lands.
eq('the SAN ends at 244 points',
  progressAfterCommittedSchedule(projecting, 10, 'juntos', 5)?.pointsAtEnd, 244);
eq('still 56 short of Plata',
  progressAfterCommittedSchedule(projecting, 10, 'juntos', 5)?.stillNeeded, 56);

// When the schedule DOES reach it, the date is a real due date off that
// schedule — never today plus a count of periods.
const nearlyPlata: ClubState = {
  ...projecting,
  points: { points: 280, tier: 'bronce', pointsExpireAt: null },
};
eq('one installment away, and it lands on that installment\'s own due date',
  projectNextTier(nearlyPlata, 10, 'juntos', 15, false, today, schedule)?.date.toISOString().slice(0, 10),
  '2026-09-05');
eq('and reports the installment count that gets there',
  projectNextTier(nearlyPlata, 10, 'juntos', 15, false, today, schedule)?.installments, 1);

// A blocked user is never given a date, whatever their schedule says.
eq('never a date for a delinquent user',
  projectNextTier(nearlyPlata, 10, 'juntos', 15, true, today, schedule), null);

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
