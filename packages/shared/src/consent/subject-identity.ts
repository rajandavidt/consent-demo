// packages/shared/src/consent/subject-identity.ts — "reset consent", for demos.
//
// THE PROBLEM. A consent decision cannot be un-made. `consent_events` is append-only and the runtime
// role has no UPDATE or DELETE grant on it; the record is the evidence that somebody consented, and a
// system that could quietly erase it would be worth nothing. So once a demo customer answers "may we
// send you marketing SMS?", every collection point for that element goes quiet — correctly — and the
// demo cannot be shown again. Clearing localStorage does not help: consent lives on the server, which
// is the entire point.
//
// THE SOLUTION, and it deletes nothing. The subject is derived server-side as
// `HMAC(appId + "\0" + sub)`, so a DIFFERENT `sub` is a DIFFERENT subject with no history at all.
// Presenting a new `sub` therefore returns every purpose to "needs a decision" without touching a
// single ledger row. It is not an erasure and does not pretend to be one — it is a new person.
//
// WHY THIS IS NOT THE USER ID. The user id keys the accounts, the KYC record, the policies and the
// nominees. Rotating THAT to reset consent would wipe the customer's whole demo world as a side
// effect, which is not what "reset consent" means to anybody. So the consent subject is the user id
// plus a round marker, and only the marker moves.
//
// WHAT IT COSTS, stated plainly: every reset leaves another subject in the console's Consents list.
// That is the honest trade for not deleting anything, and on a demo site it is a fair one.
import { KEYS, read, write } from '../storage/index.js';

/** Round marker per user id. Absent or 0 means the original, unsuffixed subject. */
type Rounds = Record<string, number>;

/**
 * The `sub` to present for this user right now.
 *
 * Round 0 returns the user id UNCHANGED, so an existing demo — and every consent decision already on
 * file against it — keeps working exactly as before this file existed. Only an explicit reset moves it.
 *
 * The separator is `~`. Not `#` (reads as a URL fragment), not `-` (the ids are already
 * `u-customer-001`, so a dash-suffixed id looks like a different customer rather than the same one on
 * a later round), and not `.` (used inside purpose keys, so it invites confusion in a log).
 */
export function consentSubjectId(userId: string): string {
  const round = read<Rounds>(KEYS.consentIdentity, {})[userId] ?? 0;
  return round > 0 ? `${userId}~r${String(round)}` : userId;
}

/** Which round this user is on. 0 is the original subject. */
export function consentIdentityRound(userId: string): number {
  return read<Rounds>(KEYS.consentIdentity, {})[userId] ?? 0;
}

/**
 * Moves this user to a fresh consent subject, and returns the new round.
 *
 * The write publishes to in-page subscribers, which is what makes the consent context rebuild — see
 * AkkuProvider, whose manager is keyed on the value of `consentSubjectId`.
 */
export function resetConsentIdentity(userId: string): number {
  const rounds = read<Rounds>(KEYS.consentIdentity, {});
  const next = (rounds[userId] ?? 0) + 1;
  write(KEYS.consentIdentity, { ...rounds, [userId]: next });
  return next;
}
