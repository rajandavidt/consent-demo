// apps/insurance/src/pages/NomineesPage.tsx — the nominees on the shared record, read-only here.
//
// Insurance READS the nominee list and never edits it. One list, owned by the app that captures it,
// is the point of requirement 12 — a second editor would let the two apps disagree about who a
// payout belongs to, which is the worst possible thing for them to be inconsistent about.
import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { InfoBanner, KEYS, maskMobile, read, useAuth } from '@finsecure/shared';
import { bankingLink } from '../config';

interface Nominee {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  mobile: string;
  allocation: number;
}

export default function NomineesPage() {
  const { user } = useAuth();
  const nominees = useMemo(
    () => read<Nominee[]>(KEYS.nominees, []).filter((n) => n.userId === user?.id),
    [user?.id],
  );
  if (!user) return null;

  const total = nominees.reduce((sum, n) => sum + n.allocation, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Nominees</h1>
        <p className="mt-1 text-sm text-slate-500">
          Who receives a payout. Shared with FinSecure Bank — change them there and every policy
          follows.
        </p>
      </header>

      {nominees.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
          <Users className="mx-auto h-9 w-9 text-slate-300" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-800">No nominees on file</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Add them once in FinSecure Bank and they appear here automatically.
          </p>
          <a
            href={bankingLink('/nominees')}
            className="focus-ring press mt-4 inline-flex min-h-11 items-center rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Manage nominees in FinSecure Bank →
          </a>
        </div>
      ) : (
        <>
          <InfoBanner tone="success">
            Read from your shared record — nothing was re-entered for insurance.
          </InfoBanner>
          <section className="overflow-hidden rounded-card border border-border-subtle bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Nominee</th>
                  <th className="px-5 py-2.5 font-semibold">Relationship</th>
                  <th className="px-5 py-2.5 font-semibold">Mobile</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {nominees.map((n) => (
                  <tr key={n.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{n.name}</td>
                    <td className="px-5 py-3 text-slate-600">{n.relationship}</td>
                    <td className="num px-5 py-3 text-slate-600">{maskMobile(n.mobile)}</td>
                    <td className="num px-5 py-3 text-right font-semibold text-slate-900">
                      {n.allocation}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-sunken">
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-2.5 text-2xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Total
                  </td>
                  <td
                    className={
                      'num px-5 py-2.5 text-right text-sm font-bold ' +
                      (total === 100 ? 'text-status-verified' : 'text-status-pending')
                    }
                  >
                    {total}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
