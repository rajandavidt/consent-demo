// apps/banking/src/pages/DashboardPage.tsx — requirement 16.
//
// Two jobs, in this order: tell a customer mid-onboarding what is outstanding, and show someone
// who has finished their money. The order flips on `kycStatus` because a checklist is the most
// important thing on the page exactly once — while it is incomplete.
//
// The KYC block is a ring plus rows rather than ten badges in a list. A count needs to be readable
// at a glance from across a desk in a demo; ten equal-weight rows are not.
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Landmark,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  CircleAlert,
  Clock,
  PiggyBank,
  Send,
} from 'lucide-react';
import {
  AmbientConsentAsk,
  KEYS,
  read,
  formatInr,
  type Account,
  STEP_LABELS,
  STEP_ROUTES,
  STEP_SEQUENCE,
  completedCount,
  maskAccount,
  nextIncompleteStep,
  overallStatus,
  useAuth,
  type VerificationStatus,
} from '@finsecure/shared';

/**
 * Icon per account type. The accounts themselves come from the store, NOT from a literal here — a
 * hardcoded balance does not move when a payment is made, which made this page disagree with the
 * statement and with localStorage.
 */
const TYPE_ICONS = { savings: PiggyBank, current: Building2, fd: Landmark } as const;

export default function DashboardPage() {
  const { user, kyc } = useAuth();

  // Re-read on every render rather than memoising on user id: a payment made on another screen
  // changes these balances, and a memo keyed only on the user would keep showing the old figure.
  const accounts = user
    ? read<Account[]>(KEYS.accounts, []).filter((a) => a.userId === user.id)
    : [];

  if (!user || !kyc) return null;

  const status = overallStatus(kyc);
  const done = completedCount(kyc);
  const total = STEP_SEQUENCE.length;
  const next = nextIncompleteStep(kyc);
  const complete = status === 'verified';
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      {/* Analytics and personalisation have no moment of collection — nobody ever enters their
          device data — so they were published, prompted nowhere, and answerable only by a
          visitor who went looking in the preference centre. Asked here instead, on a screen
          they are already on. One at a time, and ignoring it records nothing. */}
      <AmbientConsentAsk element="device" source="dashboard" />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Good to see you, {user.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Every balance, transaction and verification below is fabricated demo data.
          </p>
        </div>
        {/* `press` — and this is the pattern applied to all eleven brand-600 CTAs across both apps.
            Every one of them is a react-router <Link> rather than the shared Button, so none of them
            inherited a pressed state, and seven had no transition-property at all: the fill snapped
            from brand-600 to brand-700 on hover. `.press` supplies both, and it replaces the
            `transition-colors` that was on the two which had one — it is unlayered, so it would have
            overridden that utility regardless, and its own property list already covers the fill. */}
        <Link
          to="/payments"
          className="focus-ring press inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white shadow-card hover:bg-brand-700"
        >
          <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
          Make a payment
        </Link>
      </header>

      {/* The one thing on the page when onboarding is unfinished. */}
      {!complete && (
        <section className="overflow-hidden rounded-card border border-brand-200 bg-gradient-to-br from-brand-50 to-surface shadow-card">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <ProgressRing done={done} total={total} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Finish verifying your account</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {done === 0
                  ? 'You have not started yet. It takes about five minutes and you can leave and come back — every step is saved as you go.'
                  : `${total - done} of ${total} steps left. Until KYC is complete you cannot apply for insurance or send a payment above the unverified limit.`}
              </p>
              {next && (
                <Link
                  to={STEP_ROUTES[next]}
                  className="focus-ring press mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  {done === 0 ? 'Start verification' : `Continue with ${STEP_LABELS[next]}`}
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Balances */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your accounts
          </h2>
          <p className="text-sm text-slate-500">
            Total{' '}
            <span className="num font-semibold text-slate-900">{formatInr(totalBalance)}</span>
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => {
            const Icon = TYPE_ICONS[account.type];
            return (
            <article
              key={account.id}
              className="rounded-card border border-border-subtle bg-surface p-5 shadow-card"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-control bg-brand-50">
                  <Icon className="h-5 w-5 text-brand-700" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-status-verified-soft px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-status-verified">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  Active
                </span>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">{account.name}</p>
              {/* Masked even for the account holder — requirement 17 has no exception. */}
              <p className="num mt-0.5 text-2xs tracking-wider text-slate-400">
                {maskAccount(account.number)}
              </p>
              <p className="num mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {formatInr(account.balance)}
              </p>
              <p className="mt-3 flex items-center gap-1 text-xs text-status-verified">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                <span className="num font-semibold">+2.4%</span>
                <span className="text-slate-500">vs last month</span>
              </p>
            </article>
            );
          })}
        </div>
      </section>

      {/* KYC detail */}
      <section className="rounded-card border border-border-subtle bg-surface shadow-card">
        <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="h-[18px] w-[18px] text-brand-600" strokeWidth={1.75} aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">KYC verification</h2>
              <p className="text-xs text-slate-500">
                One record, shared with FinSecure Insurance — nothing is asked twice
              </p>
            </div>
          </div>
          <StatusPill status={status} />
        </header>

        <ol className="divide-y divide-border-subtle">
          {STEP_SEQUENCE.map((step, index) => {
            const state = kyc.steps[step];
            return (
              <li key={step} className="flex items-center gap-3 px-5 py-3">
                <StepDot index={index} status={state.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{STEP_LABELS[step]}</p>
                  {state.reason && (
                    <p className="mt-0.5 text-xs text-status-rejected">{state.reason}</p>
                  )}
                </div>
                <StatusPill status={state.status} />
                {state.status !== 'verified' && (
                  <Link
                    to={STEP_ROUTES[step]}
                    className="focus-ring shrink-0 rounded px-1 text-xs font-semibold text-brand-600 hover:underline"
                  >
                    {state.status === 'not_started' ? 'Start' : 'Resume'}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function ProgressRing({ done, total }: { done: number; total: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = total === 0 ? 0 : done / total;

  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      {/* SVG rather than a CSS conic gradient: the stroke animates smoothly and the value is
          readable by assistive tech through the label below. */}
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={radius} className="fill-none stroke-brand-100" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          // --duration-slow, replacing a one-off `duration-500` — the only timing in either app that
          // was not on any scale. 500ms was also simply too long: the ring is the first thing on the
          // page and half a second of a stroke creeping round reads as the number being calculated
          // rather than as it having changed.
          className="fill-none stroke-brand-600 transition-[stroke-dashoffset] duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <span className="absolute text-center">
        <span className="num block text-lg font-bold leading-none text-slate-900">{done}</span>
        <span className="num block text-2xs text-slate-500">of {total}</span>
      </span>
    </div>
  );
}

function StepDot({ index, status }: { index: number; status: VerificationStatus }) {
  if (status === 'verified') {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-status-verified">
        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-status-rejected-soft">
        <CircleAlert className="h-4 w-4 text-status-rejected" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  if (status === 'in_progress' || status === 'pending') {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-status-progress-soft">
        <Clock className="h-3.5 w-3.5 text-status-progress" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  return (
    <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-2xs font-bold text-slate-500">
      {index + 1}
    </span>
  );
}

/** Colour AND an icon/word — never colour alone (§1 color-not-only). */
function StatusPill({ status }: { status: VerificationStatus }) {
  const map: Record<VerificationStatus, { label: string; className: string }> = {
    verified: { label: 'Verified', className: 'bg-status-verified-soft text-status-verified' },
    pending: { label: 'Pending', className: 'bg-status-pending-soft text-status-pending' },
    in_progress: { label: 'In progress', className: 'bg-status-progress-soft text-status-progress' },
    rejected: { label: 'Rejected', className: 'bg-status-rejected-soft text-status-rejected' },
    expired: { label: 'Expired', className: 'bg-status-expired-soft text-status-expired' },
    not_started: { label: 'Not started', className: 'bg-status-idle-soft text-status-idle' },
  };
  const { label, className } = map[status];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
