// apps/insurance/src/pages/DashboardPage.tsx — the insurance overview.
//
// Leads with the shared-KYC fact, because that is the whole story of this app: it knows who the
// customer is without having asked. When the record is complete it says so and gets out of the way;
// when it is not, it explains that the gap is filled in the banking app rather than growing a second
// onboarding flow here.
import { Link } from 'react-router-dom';
import { BadgeCheck, CircleAlert, PlusCircle, ScrollText, ShieldPlus } from 'lucide-react';
import {
  KEYS,
  STEP_SEQUENCE,
  StatusBadge,
  completedCount,
  isKycComplete,
  overallStatus,
  read,
  useAuth,
} from '@finsecure/shared';
import { bankingLink } from '../config';

interface Policy {
  id: string;
  userId: string;
  planType: string;
  sumAssured: number;
  termYears: number;
  frequency: string;
  premium: number;
  createdAt: string;
  status: string;
}

const PLAN_LABELS: Record<string, string> = {
  term: 'Term life',
  endowment: 'Endowment',
  ulip: 'ULIP',
  health: 'Health indemnity',
};

export default function DashboardPage() {
  const { user, kyc } = useAuth();
  if (!user || !kyc) return null;

  const policies = read<Policy[]>(KEYS.policies, []).filter((p) => p.userId === user.id);
  const ready = isKycComplete(kyc);
  const done = completedCount(kyc);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {user.name.split(' ')[0]}&apos;s cover
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Demo insurance platform — no policy here is real and no premium is ever collected.
          </p>
        </div>
        {ready && (
          <Link
            to="/apply"
            className="focus-ring press inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white shadow-card hover:bg-brand-700"
          >
            <PlusCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
            Buy a policy
          </Link>
        )}
      </header>

      {/* The shared-record story, stated either way. */}
      <section
        className={
          'rounded-card border p-5 shadow-card ' +
          (ready
            ? 'border-status-verified/25 bg-status-verified-soft'
            : 'border-status-pending/25 bg-status-pending-soft')
        }
      >
        <div className="flex items-start gap-3">
          <span
            className={
              'grid h-10 w-10 shrink-0 place-items-center rounded-full ' +
              (ready ? 'bg-status-verified' : 'bg-status-pending')
            }
          >
            {ready ? (
              <BadgeCheck className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
            ) : (
              <CircleAlert className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                {ready ? 'Your identity is already verified' : 'Your KYC is not complete yet'}
              </h2>
              <StatusBadge status={overallStatus(kyc)} />
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {ready ? (
                <>
                  We read your KYC from the record you completed with FinSecure Bank — name, PAN,
                  Aadhaar, address and nominees. Applying for a policy will not ask you for any of it
                  again; we only need cover and health details.
                </>
              ) : (
                <>
                  <span className="num font-semibold">
                    {done} of {STEP_SEQUENCE.length}
                  </span>{' '}
                  steps are verified. Finish it once in FinSecure Bank and this app picks it up
                  automatically — we deliberately do not collect it twice.
                </>
              )}
            </p>
            {!ready && (
              <a
                href={bankingLink('/kyc')}
                className="focus-ring press mt-3 inline-flex min-h-11 items-center rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Continue KYC in FinSecure Bank →
              </a>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          My policies
        </h2>
        {policies.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
            <ShieldPlus className="mx-auto h-9 w-9 text-slate-300" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-800">No policies yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {ready
                ? 'Apply for cover — it takes four short stages because your identity details are already on file.'
                : 'Once your KYC is verified you can apply for cover in a few minutes.'}
            </p>
            {ready && (
              <Link
                to="/apply"
                className="focus-ring press mt-4 inline-flex min-h-11 items-center rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Buy a policy
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {policies.map((policy) => (
              <li
                key={policy.id}
                className="rounded-card border border-border-subtle bg-surface p-5 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-control bg-brand-50">
                    <ScrollText className="h-5 w-5 text-brand-700" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="rounded-full bg-status-progress-soft px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-status-progress">
                    {policy.status}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  {PLAN_LABELS[policy.planType] ?? policy.planType}
                </p>
                <p className="num text-2xs tracking-wider text-slate-400">{policy.id}</p>
                <p className="num mt-2 text-xl font-semibold tracking-tight text-slate-900">
                  ₹{policy.sumAssured.toLocaleString('en-IN')}
                </p>
                <p className="num mt-1 text-xs text-slate-500">
                  {policy.termYears} years · ₹{policy.premium.toLocaleString('en-IN')} /{' '}
                  {policy.frequency}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
