// apps/banking/src/pages/AccountsPage.tsx — accounts, and one account's statement.
//
// The statement carries a running closing balance, and it reconciles: read down the rows and each
// one's closing balance is the next one's opening. The seed computes it backwards from the current
// balance precisely so this holds — a demo statement whose arithmetic does not work is the first
// thing anyone from a bank notices.
import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Building2, Landmark, PiggyBank } from 'lucide-react';
import {
  KEYS,
  formatInr,
  maskAccount,
  read,
  useAuth,
  type Account,
  type Transaction,
} from '@finsecure/shared';

const ICONS = { savings: PiggyBank, current: Building2, fd: Landmark } as const;

export default function AccountsPage() {
  const { user } = useAuth();
  const accounts = useMemo(
    () => read<Account[]>(KEYS.accounts, []).filter((a) => a.userId === user?.id),
    [user?.id],
  );
  const allTxns = useMemo(
    () => read<Transaction[]>(KEYS.transactions, []).filter((t) => t.userId === user?.id),
    [user?.id],
  );
  const [selected, setSelected] = useState(accounts[0]?.id ?? '');

  if (!user) return null;

  const account = accounts.find((a) => a.id === selected);
  const statement = allTxns.filter((t) => t.accountId === selected);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My accounts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo balances and statements. Account numbers are shown masked throughout.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {accounts.map((a) => {
          const Icon = ICONS[a.type];
          const active = a.id === selected;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              aria-pressed={active}
              className={
                'focus-ring rounded-card border p-5 text-left shadow-card transition-colors ' +
                (active
                  ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                  : 'border-border-subtle bg-surface hover:border-border-strong')
              }
            >
              <span className="grid h-10 w-10 place-items-center rounded-control bg-brand-50">
                <Icon className="h-5 w-5 text-brand-700" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="mt-4 text-sm font-medium text-slate-700">{a.name}</p>
              <p className="num text-2xs tracking-wider text-slate-400">{maskAccount(a.number)}</p>
              <p className="num mt-2 text-xl font-semibold tracking-tight text-slate-900">
                {formatInr(a.balance)}
              </p>
            </button>
          );
        })}
      </div>

      {account && (
        <section className="rounded-card border border-border-subtle bg-surface shadow-card">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{account.name}</h2>
              <p className="num mt-0.5 text-xs text-slate-500">
                {maskAccount(account.number)} · {account.ifsc} · {account.branch}
              </p>
            </div>
            <p className="num text-xs text-slate-500">
              Opened {new Date(account.openedAt).toLocaleDateString('en-IN')}
            </p>
          </header>

          {statement.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No transactions on this account yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-5 py-2.5 font-semibold">Description</th>
                    <th className="px-5 py-2.5 font-semibold">Channel</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Amount</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {statement.map((t) => (
                    <tr key={t.id}>
                      <td className="num whitespace-nowrap px-5 py-3 text-slate-600">
                        {new Date(t.at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{t.description}</p>
                        <p className="num text-2xs text-slate-400">{t.reference}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-2xs font-semibold text-slate-600">
                          {t.channel}
                        </span>
                      </td>
                      <td
                        className={
                          'num whitespace-nowrap px-5 py-3 text-right font-semibold ' +
                          (t.direction === 'credit'
                            ? 'text-status-verified'
                            : 'text-slate-900')
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {t.direction === 'credit' ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                          )}
                          {formatInr(t.amount)}
                        </span>
                      </td>
                      <td className="num whitespace-nowrap px-5 py-3 text-right text-slate-600">
                        {formatInr(t.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
