// apps/insurance/src/pages/PoliciesPage.tsx — the policies this customer holds.
//
// Read-only. A policy's terms are fixed at issue, so changing cover is a new application rather than
// an edit here — offering an edit affordance would imply the terms are negotiable after the fact.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, ShieldPlus } from 'lucide-react';
import { KEYS, formatInr, read, useAuth } from '@finsecure/shared';

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

export default function PoliciesPage() {
  const { user } = useAuth();
  const policies = useMemo(
    () => read<Policy[]>(KEYS.policies, []).filter((p) => p.userId === user?.id),
    [user?.id],
  );
  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My policies</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo policies — none is in force and no premium is ever collected.
        </p>
      </header>

      {policies.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
          <ShieldPlus className="mx-auto h-9 w-9 text-slate-300" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-800">No policies yet</p>
          <Link
            to="/apply"
            className="focus-ring press mt-4 inline-flex min-h-11 items-center rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Buy a policy
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {policies.map((policy) => (
            <li
              key={policy.id}
              className="rounded-card border border-border-subtle bg-surface p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-brand-50">
                    <ScrollText className="h-5 w-5 text-brand-700" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {PLAN_LABELS[policy.planType] ?? policy.planType}
                    </p>
                    <p className="num text-2xs tracking-wider text-slate-400">{policy.id}</p>
                  </div>
                </div>
                <span className="rounded-full bg-status-progress-soft px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-status-progress">
                  {policy.status}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 border-t border-border-subtle pt-4 text-sm sm:grid-cols-4">
                {[
                  ['Sum assured', formatInr(policy.sumAssured, false)],
                  ['Term', `${policy.termYears} years`],
                  ['Premium', `${formatInr(policy.premium, false)} / ${policy.frequency}`],
                  ['Applied', new Date(policy.createdAt).toLocaleDateString('en-IN')],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-2xs uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="num mt-0.5 font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
