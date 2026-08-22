// apps/banking/src/pages/PaymentsPage.tsx — requirement 15, a payment confirmed by OTP.
//
// Compose → review → OTP → done. Four phases, and the review step is not padding: it is the last
// point at which someone can catch that they typed 50,000 instead of 5,000, and the amount is
// therefore shown large and unformatted-for-abbreviation.
//
// THE OTP IS THE SAME COMPONENT AS ONBOARDING. That is the payoff of requirement 14 — a payment
// challenge and an Aadhaar challenge behave identically because they are the same state machine, so
// the countdown, the paste handling and the three-attempt lock cannot drift apart.
//
// KYC GATES THE AMOUNT. An unverified customer is capped, which is both realistic and gives the
// dashboard's "finish your KYC" nudge something concrete to point at.
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  Field,
  InfoBanner,
  OtpInput,
  SelectField,
  formatInr,
  hasErrors,
  isKycComplete,
  maskAccount,
  read,
  recordTransaction,
  useAuth,
  useToast,
  validateRequired,
  KEYS,
  type Account,
  type Transaction,
} from '@finsecure/shared';

type Phase = 'compose' | 'review' | 'otp' | 'done';

/** What an unverified customer may send in one payment. */
const UNVERIFIED_LIMIT = 10000;

const CHANNELS = [
  { value: 'UPI', label: 'UPI — instant, up to ₹1,00,000' },
  { value: 'IMPS', label: 'IMPS — instant, any amount' },
  { value: 'NEFT', label: 'NEFT — settles in batches' },
];

export default function PaymentsPage() {
  const { user, kyc } = useAuth();
  const toast = useToast();

  const accounts = useMemo(
    () => read<Account[]>(KEYS.accounts, []).filter((a) => a.userId === user?.id && a.type !== 'fd'),
    [user?.id],
  );

  const [phase, setPhase] = useState<Phase>('compose');
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '');
  const [payeeName, setPayeeName] = useState('');
  const [payeeAccount, setPayeeAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [channel, setChannel] = useState('UPI');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  if (!user || !kyc) return null;

  const verified = isKycComplete(kyc);
  const from = accounts.find((a) => a.id === fromId);
  const value = Number(amount || 0);
  const cap = verified ? Infinity : UNVERIFIED_LIMIT;

  const validate = () => {
    const found: Record<string, string | undefined> = {
      fromId: fromId ? undefined : 'Choose an account to pay from',
      payeeName: validateRequired(payeeName, 'Payee name'),
      payeeAccount:
        payeeAccount.replace(/\D/g, '').length < 9
          ? 'Enter a valid account number'
          : undefined,
      ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())
        ? undefined
        : 'IFSC looks like FINS0000451 — four letters, a zero, then six characters',
      amount:
        !value || value <= 0
          ? 'Enter an amount'
          : value > (from?.balance ?? 0)
            ? `Insufficient balance — ${formatInr(from?.balance ?? 0)} available`
            : value > cap
              ? `Limit is ${formatInr(cap, false)} until your KYC is verified`
              : undefined,
    };
    setErrors(found);
    return !hasErrors(found);
  };

  const onOtpVerified = () => {
    const txn = recordTransaction({
      userId: user.id,
      accountId: fromId,
      description: `${payeeName}${note ? ` — ${note}` : ''}`,
      channel: channel as Transaction['channel'],
      amount: value,
      reference: `${channel}/${payeeAccount.slice(-4)}/${Date.now().toString().slice(-6)}`,
    });
    setReceipt(txn);
    setPhase('done');
    toast.success('Payment successful', `${formatInr(value)} sent to ${payeeName}`);
  };

  /* --------------------------------------------------------------- done */
  if (phase === 'done' && receipt) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-status-verified">
            <BadgeCheck className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
            Payment successful
          </h1>
          <p className="num mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            {formatInr(receipt.amount)}
          </p>
        </div>

        <div className="rounded-card border border-border-subtle bg-surface shadow-card">
          <dl className="divide-y divide-border-subtle text-sm">
            {[
              ['Paid to', payeeName],
              ['Account', maskAccount(payeeAccount)],
              ['From', from ? `${from.name} · ${maskAccount(from.number)}` : '—'],
              ['Channel', receipt.channel],
              ['Reference', receipt.reference],
              ['Date', new Date(receipt.at).toLocaleString('en-IN')],
              ['Balance after', formatInr(receipt.balanceAfter)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-5 py-2.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="num text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <InfoBanner tone="warning">
          No money moved. This updated the demo balance and added a row to
          <code className="mx-1 rounded bg-white px-1 text-2xs">finsecure_transactions</code>
          in this browser.
        </InfoBanner>

        <Button
          block
          onClick={() => {
            setPhase('compose');
            setReceipt(null);
            setPayeeName('');
            setPayeeAccount('');
            setIfsc('');
            setAmount('');
            setNote('');
          }}
        >
          Make another payment
        </Button>
      </div>
    );
  }

  /* --------------------------------------------------------------- flow */
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Make a payment</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo transfers only — no real payment network is contacted and no money moves.
        </p>
      </header>

      {!verified && (
        <InfoBanner tone="warning">
          <strong>Unverified account.</strong> Payments are capped at{' '}
          <span className="num">{formatInr(UNVERIFIED_LIMIT, false)}</span> until your KYC is
          complete.
        </InfoBanner>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {phase === 'compose' && (
            <section className="rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Landmark className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
                Payment details
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <SelectField
                    label="Pay from"
                    value={fromId}
                    onChange={setFromId}
                    error={errors.fromId}
                    required
                    options={accounts.map((a) => ({
                      value: a.id,
                      label: `${a.name} · ${maskAccount(a.number)} · ${formatInr(a.balance)}`,
                    }))}
                  />
                </div>
                <Field
                  label="Payee name"
                  value={payeeName}
                  onChange={setPayeeName}
                  error={errors.payeeName}
                  placeholder="Lakshmi Raman"
                  required
                />
                <Field
                  label="Payee account number"
                  value={payeeAccount}
                  onChange={(v) => setPayeeAccount(v.replace(/\D/g, '').slice(0, 18))}
                  error={errors.payeeAccount}
                  placeholder="5012340000009999"
                  required
                />
                <Field
                  label="IFSC"
                  value={ifsc}
                  onChange={(v) => setIfsc(v.toUpperCase().slice(0, 11))}
                  error={errors.ifsc}
                  placeholder="FINS0000451"
                  hint="Demo IFSC: FINS0000451"
                  required
                  maxLength={11}
                />
                <SelectField
                  label="Channel"
                  value={channel}
                  onChange={setChannel}
                  options={CHANNELS}
                  required
                />
                <Field
                  label="Amount"
                  value={amount}
                  onChange={(v) => setAmount(v.replace(/[^\d.]/g, '').slice(0, 10))}
                  error={errors.amount}
                  placeholder="5000"
                  required
                />
                <Field
                  label="Note"
                  value={note}
                  onChange={setNote}
                  placeholder="Rent, August"
                  hint="Optional — appears on both statements"
                />
              </div>
              <div className="mt-5 flex justify-end">
                <Button
                  onClick={() => {
                    if (validate()) setPhase('review');
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    Review payment
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                </Button>
              </div>
            </section>
          )}

          {phase === 'review' && (
            <section className="rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <h2 className="text-sm font-semibold text-slate-900">Check before you send</h2>
              {/* Large and exact. This is the last chance to spot an extra zero. */}
              <p className="num mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {formatInr(value)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                to <span className="font-semibold text-slate-900">{payeeName}</span>
              </p>
              <dl className="mt-5 divide-y divide-border-subtle text-sm">
                {[
                  ['Payee account', maskAccount(payeeAccount)],
                  ['IFSC', ifsc.toUpperCase()],
                  ['From', from ? `${from.name} · ${maskAccount(from.number)}` : '—'],
                  ['Channel', channel],
                  ['Note', note || '—'],
                  ['Balance after', formatInr((from?.balance ?? 0) - value)],
                ].map(([label, v]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="num text-right font-medium text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setPhase('compose')}>
                  <span className="inline-flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Edit
                  </span>
                </Button>
                <Button onClick={() => setPhase('otp')}>Confirm with OTP</Button>
              </div>
            </section>
          )}

          {phase === 'otp' && (
            <section className="rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
                Confirm {formatInr(value)} to {payeeName}
              </h2>
              <div className="mt-4">
                <OtpInput
                  purpose="payment"
                  sentTo={kyc.mobile ? maskMobileSafe(kyc.mobile.number) : 'your registered mobile'}
                  destinationLabel="registered mobile number"
                  onVerified={onOtpVerified}
                  verifyLabel={`Pay ${formatInr(value)}`}
                  secondaryAction={
                    <button
                      type="button"
                      onClick={() => setPhase('review')}
                      className="focus-ring rounded font-medium text-slate-600 hover:text-slate-900 hover:underline"
                    >
                      Cancel payment
                    </button>
                  }
                />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {from && (
            <div className="rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paying from
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{from.name}</p>
              <p className="num text-2xs tracking-wider text-slate-400">
                {maskAccount(from.number)}
              </p>
              <p className="num mt-2 text-xl font-semibold tracking-tight text-slate-900">
                {formatInr(from.balance)}
              </p>
              <p className="text-2xs text-slate-500">available</p>
            </div>
          )}
          <div className="rounded-card border border-border-subtle bg-surface p-5">
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              Every payment here is simulated. The OTP is the demo code and no network, payee or
              settlement system exists.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Local wrapper so the import list stays short; the real masking lives in shared. */
function maskMobileSafe(mobile: string): string {
  const digits = mobile.replace(/\D/g, '').slice(-10);
  return digits.length >= 4 ? `+91 ******${digits.slice(-4)}` : '+91 **********';
}
