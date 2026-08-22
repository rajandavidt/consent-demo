// apps/insurance/src/pages/KycPage.tsx — requirement 6, the dedicated KYC status page.
//
// The dashboard shows the same steps, but this page exists for the other question: not "what should
// I do next" but "what does FinSecure hold about me, and what state is it in". So it shows the
// captured values — masked — next to each step, and the consent record with its timestamps.
import { Link } from 'react-router-dom';
import { BadgeCheck, ChevronRight, ShieldCheck } from 'lucide-react';
import {
  useAuth,
  KEYS,
  STATUS_LABELS,
  STEP_LABELS,
  STEP_ICONS,
  STEP_ROUTES,
  STEP_SEQUENCE,
  StatusBadge,
  completedCount,
  isKycComplete,
  maskAadhaar,
  maskEmail,
  maskMobile,
  maskPan,
  overallStatus,
  read,
  type OnboardingStep,
} from '@finsecure/shared';

interface ConsentLogEntry {
  userId: string;
  key: string;
  granted: boolean;
  at: string;
  source: string;
}

/**
 * The steps THIS app has a screen for.
 *
 * The step SEQUENCE is shared with banking, but the routes are not: insurance only carries mobile
 * and email verification. A "Start" link to a step this app does not route is a dead link, which is
 * worse than no link — it looks like a way forward and 404s. So the link is rendered only where
 * there is somewhere to go, and every other step still shows its status.
 */
const ROUTED_HERE: ReadonlySet<OnboardingStep> = new Set<OnboardingStep>(['mobile', 'email']);

export default function KycPage() {
  const { user, kyc } = useAuth();
  if (!user || !kyc) return null;

  const status = overallStatus(kyc);
  const done = completedCount(kyc);
  const complete = isKycComplete(kyc);
  const consents = read<ConsentLogEntry[]>(KEYS.consents, []).filter((c) => c.userId === user.id);

  /** The captured value for a step, masked. Absent where a step holds no single value. */
  const captured = (step: OnboardingStep): string | undefined => {
    switch (step) {
      case 'mobile':
        return kyc.mobile ? maskMobile(kyc.mobile.number) : undefined;
      case 'email':
        return kyc.email ? maskEmail(kyc.email.address) : undefined;
      case 'pan':
        return kyc.pan ? maskPan(kyc.pan.number) : undefined;
      case 'kyc':
        return kyc.aadhaar ? maskAadhaar(kyc.aadhaar.number) : undefined;
      case 'personal':
        return kyc.personal
          ? [kyc.personal.firstName, kyc.personal.lastName].filter(Boolean).join(' ')
          : undefined;
      case 'address':
        return kyc.address ? `${kyc.address.permanent.city}, ${kyc.address.permanent.pincode}` : undefined;
      default:
        return undefined;
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">KYC &amp; verification</h1>
        <p className="mt-1 text-sm text-slate-500">
          What FinSecure holds about you, and the state of each check. Sensitive values are shown
          masked and never in full.
        </p>
      </header>

      <section
        className={
          'flex flex-wrap items-center gap-4 rounded-card border p-5 shadow-card ' +
          (complete
            ? 'border-status-verified/25 bg-status-verified-soft'
            : 'border-border-subtle bg-surface')
        }
      >
        <span
          className={
            'grid h-12 w-12 shrink-0 place-items-center rounded-full ' +
            (complete ? 'bg-status-verified' : 'bg-surface-sunken')
          }
        >
          <BadgeCheck
            className={'h-6 w-6 ' + (complete ? 'text-white' : 'text-slate-400')}
            strokeWidth={2}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900">
            {complete ? 'KYC completed' : `KYC ${STATUS_LABELS[status].toLowerCase()}`}
          </p>
          <p className="num mt-0.5 text-sm text-slate-600">
            {done} of {STEP_SEQUENCE.length} steps verified
            {kyc.updatedAt && ` · last updated ${new Date(kyc.updatedAt).toLocaleString('en-IN')}`}
          </p>
        </div>
        <StatusBadge status={status} />
      </section>

      {/* WIDGET GRID — the same treatment as banking, so the answer to "what do you hold about me"
          looks identical in both products. As rows this was ten near-empty lines with the status and
          the action stranded at the far edge of a full-width page. */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Verification steps</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {STEP_SEQUENCE.map((step) => {
            const state = kyc.steps[step];
            const value = captured(step);
            const Icon = STEP_ICONS[step];
            const done = state.status === 'verified';
            const rejected = state.status === 'rejected';

            return (
              <li
                key={step}
                className={
                  'rounded-card border bg-surface shadow-card p-4 ' +
                  (done
                    ? 'border-status-verified/25'
                    : rejected
                      ? 'border-status-rejected/30'
                      : 'border-border-subtle')
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    className={
                      'grid size-9 shrink-0 place-items-center rounded-full ' +
                      (done
                        ? 'bg-status-verified-soft text-status-verified'
                        : rejected
                          ? 'bg-status-rejected-soft text-status-rejected'
                          : 'bg-surface-sunken text-slate-400')
                    }
                  >
                    <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {STEP_LABELS[step]}
                    </p>
                    {/* Nothing rendered when there is no value: `captured()` returns undefined for the
                        steps that hold no single one, and a placeholder there would claim nothing was
                        collected on a step that is verified. */}
                    {value && (
                      <p className="num mt-0.5 truncate text-xs text-slate-600">{value}</p>
                    )}
                  </div>

                  <StatusBadge status={state.status} />
                </div>

                {state.reason && (
                  <p className="mt-3 text-xs text-status-rejected">{state.reason}</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                  <span className="text-2xs text-slate-400">
                    {state.verifiedAt && !state.reason
                      ? 'Verified ' + new Date(state.verifiedAt).toLocaleDateString('en-IN')
                      : 'Not verified'}
                  </span>
                  {/* ROUTED_HERE preserved: insurance only routes mobile and email, and a Start link
                      to a screen this app does not have is a dead link. */}
                  {state.status !== 'verified' && ROUTED_HERE.has(step) && (
                    <Link
                      to={STEP_ROUTES[step]}
                      className="focus-ring inline-flex items-center gap-0.5 rounded text-xs font-semibold text-brand-600 hover:underline"
                    >
                      {state.status === 'not_started' ? 'Start' : 'Resume'}
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {consents.length > 0 && (
        <section className="rounded-card border border-border-subtle bg-surface shadow-card">
          <header className="flex items-center gap-2 border-b border-border-subtle px-5 py-4">
            <ShieldCheck className="h-[18px] w-[18px] text-brand-600" strokeWidth={1.75} aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Consent record</h2>
              <p className="text-xs text-slate-500">
                Each decision with the time it was made — including the ones you declined
              </p>
            </div>
          </header>
          <ul className="divide-y divide-border-subtle">
            {consents.map((entry, index) => (
              <li key={`${entry.key}-${index}`} className="flex items-center gap-3 px-5 py-2.5">
                <span
                  className={
                    'h-2 w-2 shrink-0 rounded-full ' +
                    (entry.granted ? 'bg-status-verified' : 'bg-slate-300')
                  }
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {humanise(entry.key)}
                </span>
                <span
                  className={
                    'shrink-0 text-xs font-semibold ' +
                    (entry.granted ? 'text-status-verified' : 'text-slate-500')
                  }
                >
                  {entry.granted ? 'Agreed' : 'Declined'}
                </span>
                <span className="num shrink-0 text-2xs text-slate-400">
                  {new Date(entry.at).toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** `personalDataProcessing` → `Personal data processing`. */
function humanise(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
