// apps/insurance/src/pages/ClaimsPage.tsx — raising and tracking a claim.
//
// A claim can only be raised against a policy that exists, so the empty state points at the
// application flow rather than offering a form that could not go anywhere. The status ladder is
// real (submitted → under review → approved → settled, or rejected) because a claim screen whose
// only state is "submitted" teaches nothing about how claims actually feel.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, HeartPulse, Plus, ShieldPlus } from 'lucide-react';
import {
  Button,
  Field,
  InfoBanner,
  KEYS,
  SelectField,
  formatInr,
  hasErrors,
  nextId,
  nowIso,
  read,
  useAuth,
  useToast,
  validateRequired,
  write,
} from '@finsecure/shared';

interface Policy {
  id: string;
  userId: string;
  planType: string;
  sumAssured: number;
}

interface Claim {
  id: string;
  userId: string;
  policyId: string;
  type: string;
  amount: number;
  raisedAt: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'settled';
  note: string;
}

const CLAIM_TYPES = [
  'Hospitalisation',
  'Day-care procedure',
  'Critical illness',
  'Accidental injury',
  'Maternity',
].map((t) => ({ value: t, label: t }));

const STATUS_STYLES: Record<Claim['status'], { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'bg-status-progress-soft text-status-progress' },
  under_review: { label: 'Under review', className: 'bg-status-pending-soft text-status-pending' },
  approved: { label: 'Approved', className: 'bg-status-verified-soft text-status-verified' },
  rejected: { label: 'Rejected', className: 'bg-status-rejected-soft text-status-rejected' },
  settled: { label: 'Settled', className: 'bg-status-verified-soft text-status-verified' },
};

export default function ClaimsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const policies = useMemo(
    () => read<Policy[]>(KEYS.policies, []).filter((p) => p.userId === user?.id),
    [user?.id],
  );
  const [claims, setClaims] = useState<Claim[]>(() =>
    read<Claim[]>(KEYS.claims, []).filter((c) => c.userId === user?.id),
  );

  const [formOpen, setFormOpen] = useState(false);
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? '');
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = () => {
    const policy = policies.find((p) => p.id === policyId);
    const value = Number(amount || 0);
    const found: Record<string, string | undefined> = {
      policyId: policyId ? undefined : 'Choose the policy you are claiming against',
      type: type ? undefined : 'Claim type is required',
      amount:
        !value || value <= 0
          ? 'Enter the amount claimed'
          : policy && value > policy.sumAssured
            ? `Cannot exceed the sum assured of ${formatInr(policy.sumAssured, false)}`
            : undefined,
      note: validateRequired(note, 'A short description'),
    };
    setErrors(found);
    if (hasErrors(found)) return;

    setBusy(true);
    window.setTimeout(() => {
      const claim: Claim = {
        id: nextId('CLM'),
        userId: user.id,
        policyId,
        type,
        amount: value,
        raisedAt: nowIso(),
        status: 'submitted',
        note: note.trim(),
      };
      const next = [claim, ...claims];
      const others = read<Claim[]>(KEYS.claims, []).filter((c) => c.userId !== user.id);
      write(KEYS.claims, [...others, ...next]);
      setClaims(next);
      setBusy(false);
      setFormOpen(false);
      setType('');
      setAmount('');
      setNote('');
      toast.success('Claim submitted', `Reference ${claim.id} — we will be in touch.`);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Claims</h1>
          <p className="mt-1 text-sm text-slate-500">
            Raise and track claims against your policies. Demo only — nothing is assessed or paid.
          </p>
        </div>
        {policies.length > 0 && !formOpen && (
          <Button onClick={() => setFormOpen(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Raise a claim
            </span>
          </Button>
        )}
      </header>

      {policies.length === 0 && (
        <div className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
          <ShieldPlus className="mx-auto h-9 w-9 text-slate-300" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-800">No policies to claim against</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            A claim needs a policy. Take out cover first and it will appear here.
          </p>
          <Link
            to="/apply"
            className="focus-ring mt-4 inline-flex min-h-11 items-center rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Buy a policy
          </Link>
        </div>
      )}

      {formOpen && (
        <section className="rounded-card border border-brand-200 bg-brand-50/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <HeartPulse className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
            New claim
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Policy"
              value={policyId}
              onChange={setPolicyId}
              error={errors.policyId}
              required
              options={policies.map((p) => ({
                value: p.id,
                label: `${p.id} · ${formatInr(p.sumAssured, false)}`,
              }))}
            />
            <SelectField
              label="Claim type"
              value={type}
              onChange={setType}
              error={errors.type}
              required
              options={CLAIM_TYPES}
            />
            <Field
              label="Amount claimed"
              value={amount}
              onChange={(v) => setAmount(v.replace(/[^\d]/g, '').slice(0, 9))}
              error={errors.amount}
              placeholder="185000"
              required
            />
            <div className="sm:col-span-2">
              <Field
                label="What happened"
                value={note}
                onChange={setNote}
                error={errors.note}
                placeholder="Three-day hospitalisation for a fractured wrist, Apollo Hospitals"
                required
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={submit} loading={busy}>
              Submit claim
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {claims.length > 0 && (
        <section className="rounded-card border border-border-subtle bg-surface shadow-card">
          <header className="border-b border-border-subtle px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Your claims</h2>
          </header>
          <ul className="divide-y divide-border-subtle">
            {claims.map((claim) => {
              const style = STATUS_STYLES[claim.status];
              return (
                <li key={claim.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-surface-sunken">
                    <FileText className="h-4 w-4 text-slate-500" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{claim.type}</p>
                    <p className="truncate text-xs text-slate-500">{claim.note}</p>
                    <p className="num mt-0.5 text-2xs text-slate-400">
                      {claim.id} · policy {claim.policyId} ·{' '}
                      {new Date(claim.raisedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm font-semibold text-slate-900">
                    {formatInr(claim.amount, false)}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wide ${style.className}`}
                  >
                    {style.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {claims.length > 0 && (
        <InfoBanner tone="warning">
          Claims here stay at <strong>Submitted</strong> — there is no assessor, no adjudication and
          no payment. A real claim would move through review, approval and settlement.
        </InfoBanner>
      )}
    </div>
  );
}
