// apps/banking/src/pages/KycPage.tsx — requirement 6, the dedicated KYC status page.
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

      <section className="rounded-card border border-border-subtle bg-surface shadow-card">
        <header className="border-b border-border-subtle px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Verification steps</h2>
        </header>
        <ul className="divide-y divide-border-subtle">
          {STEP_SEQUENCE.map((step) => {
            const state = kyc.steps[step];
            const value = captured(step);
            return (
              <li key={step} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{STEP_LABELS[step]}</p>
                  {value && <p className="num mt-0.5 text-xs text-slate-500">{value}</p>}
                  {state.reason && (
                    <p className="mt-0.5 text-xs text-status-rejected">{state.reason}</p>
                  )}
                  {state.verifiedAt && !state.reason && (
                    <p className="mt-0.5 text-2xs text-slate-400">
                      Verified {new Date(state.verifiedAt).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
                <StatusBadge status={state.status} />
                {state.status !== 'verified' && (
                  <Link
                    to={STEP_ROUTES[step]}
                    className="focus-ring inline-flex items-center gap-0.5 rounded text-xs font-semibold text-brand-600 hover:underline"
                  >
                    {state.status === 'not_started' ? 'Start' : 'Resume'}
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </Link>
                )}
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
