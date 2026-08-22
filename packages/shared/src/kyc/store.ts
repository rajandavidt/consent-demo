// packages/shared/src/kyc/store.ts — reading and advancing the shared KYC record.
//
// Both applications call these functions and neither owns the data. That is deliberate: the moment
// the insurance app keeps its own copy of "is PAN verified", the two drift and requirement 12 turns
// into a bug report.
//
// EVERY MUTATION IS AUDITED. Requirement 18 lists finsecure_audit_logs, and a KYC record without a
// trail of who changed what is not a KYC record. The log is append-only in spirit — nothing here
// edits or removes an entry.
import { KEYS, nowIso, read, update, type StoreKey } from '../storage/index.js';
import {
  STEP_SEQUENCE,
  type KycRecord,
  type OnboardingStep,
  type StepState,
  type VerificationStatus,
} from './types.js';

export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  action: string;
  detail: string;
}

function emptySteps(): Record<OnboardingStep, StepState> {
  const steps = {} as Record<OnboardingStep, StepState>;
  for (const step of STEP_SEQUENCE) steps[step] = { status: 'not_started' };
  return steps;
}

export function emptyRecord(userId: string): KycRecord {
  return { userId, steps: emptySteps(), updatedAt: nowIso() };
}

type KycStoreShape = Record<string, KycRecord>;

/** The record for a user, created empty on first read so callers never handle `undefined`. */
export function getKyc(userId: string): KycRecord {
  const all = read<KycStoreShape>(KEYS.kyc, {});
  return all[userId] ?? emptyRecord(userId);
}

/**
 * Applies a change to a user's record and stamps `updatedAt`.
 *
 * The mutator receives a STRUCTURED CLONE, not the stored object. Handing out the live reference is
 * how a caller ends up mutating state that React already rendered, producing a store that is
 * correct and a screen that never updated.
 */
export function updateKyc(userId: string, mutate: (record: KycRecord) => KycRecord): KycRecord {
  let result = emptyRecord(userId);
  update<KycStoreShape>(KEYS.kyc, {}, (all) => {
    const current: KycRecord = structuredClone(all[userId] ?? emptyRecord(userId));
    result = { ...mutate(current), updatedAt: nowIso() };
    return { ...all, [userId]: result };
  });
  return result;
}

/** Sets one step's status, with an optional rejection reason. Audited. */
export function setStepStatus(
  userId: string,
  step: OnboardingStep,
  status: VerificationStatus,
  reason?: string,
): KycRecord {
  const next = updateKyc(userId, (record) => {
    const state: StepState = { status };
    if (status === 'verified') state.verifiedAt = nowIso();
    if (reason !== undefined) state.reason = reason;
    return { ...record, steps: { ...record.steps, [step]: state } };
  });
  audit(userId, `kyc.${step}.${status}`, reason ?? `Step "${step}" set to ${status}`);
  return next;
}

/**
 * The overall status, rolled up from the ten steps (requirement 6).
 *
 * Order matters and encodes precedence: one rejection makes the whole record rejected however much
 * else passed, because a rejected step blocks onboarding — reporting "in progress" there would hide
 * the only thing the customer needs to act on. Expiry outranks progress for the same reason.
 */
export function overallStatus(record: KycRecord): VerificationStatus {
  const states = STEP_SEQUENCE.map((step) => record.steps[step].status);
  if (states.some((s) => s === 'rejected')) return 'rejected';
  if (states.some((s) => s === 'expired')) return 'expired';
  if (states.every((s) => s === 'verified')) return 'verified';
  if (states.some((s) => s === 'pending')) return 'pending';
  if (states.some((s) => s !== 'not_started')) return 'in_progress';
  return 'not_started';
}

/** True when every step is verified — the gate the dashboard and insurance flow both check. */
export function isKycComplete(record: KycRecord): boolean {
  return overallStatus(record) === 'verified';
}

/** The first step that is not yet verified — where "Continue KYC" should land. */
export function nextIncompleteStep(record: KycRecord): OnboardingStep | undefined {
  return STEP_SEQUENCE.find((step) => record.steps[step].status !== 'verified');
}

/** How many of the ten steps are done, for the progress indicator. */
export function completedCount(record: KycRecord): number {
  return STEP_SEQUENCE.filter((step) => record.steps[step].status === 'verified').length;
}

export function audit(userId: string, action: string, detail: string): void {
  update<AuditEntry[]>(KEYS.auditLogs, [], (log) => [
    { id: `AUD-${log.length + 1}`, at: nowIso(), userId, action, detail },
    ...log,
  ]);
}

export function readAudit(userId?: string): AuditEntry[] {
  const all = read<AuditEntry[]>(KEYS.auditLogs, []);
  return userId ? all.filter((entry) => entry.userId === userId) : all;
}

/** Re-export so app code can subscribe without importing two modules. */
export type { StoreKey };
