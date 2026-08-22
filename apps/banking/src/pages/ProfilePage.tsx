// apps/banking/src/pages/ProfilePage.tsx — what the bank holds about you, and the audit trail.
//
// Read-only on purpose. Every value here was captured by a verified step, and letting someone edit a
// PAN on a profile screen would silently invalidate the verification attached to it. Changes go back
// through the step that owns them, which is what the "Update" links do.
//
// The audit trail is included because it is the honest counterpart to a KYC record: not just what
// is held, but every change made to it and when.
import { Link } from 'react-router-dom';
import { ExternalLink, ScrollText, ShieldCheck, UserRound } from 'lucide-react';
import {
  STEP_ROUTES,
  StatusBadge,
  maskAadhaar,
  maskEmail,
  maskMobile,
  maskPan,
  readAudit,
  useAuth,
} from '@finsecure/shared';

export default function ProfilePage() {
  const { user, kyc } = useAuth();
  if (!user || !kyc) return null;

  const audit = readAudit(user.id).slice(0, 15);

  const rows: { label: string; value: string; step?: keyof typeof STEP_ROUTES }[] = [
    { label: 'Full name', value: fullName(kyc) || user.name, step: 'personal' },
    { label: 'Email', value: kyc.email ? maskEmail(kyc.email.address) : user.email, step: 'email' },
    { label: 'Mobile', value: kyc.mobile ? maskMobile(kyc.mobile.number) : '—', step: 'mobile' },
    { label: 'PAN', value: kyc.pan ? maskPan(kyc.pan.number) : '—', step: 'pan' },
    { label: 'Aadhaar', value: kyc.aadhaar ? maskAadhaar(kyc.aadhaar.number) : '—', step: 'kyc' },
    { label: 'Date of birth', value: kyc.personal?.dateOfBirth ?? '—', step: 'personal' },
    { label: 'Gender', value: capitalise(kyc.personal?.gender ?? ''), step: 'personal' },
    { label: 'Marital status', value: capitalise(kyc.personal?.maritalStatus ?? ''), step: 'personal' },
    { label: 'Nationality', value: kyc.personal?.nationality ?? '—', step: 'personal' },
    { label: 'Occupation', value: kyc.personal?.occupation ?? '—', step: 'personal' },
    { label: 'Annual income', value: kyc.personal?.annualIncome ?? '—', step: 'personal' },
    {
      label: 'Permanent address',
      value: kyc.address
        ? [
            kyc.address.permanent.line1,
            kyc.address.permanent.line2,
            kyc.address.permanent.city,
            kyc.address.permanent.state,
            kyc.address.permanent.pincode,
          ]
            .filter(Boolean)
            .join(', ')
        : '—',
      step: 'address',
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Held against your verified KYC record. Sensitive values are always masked.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-card border border-border-subtle bg-surface shadow-card lg:col-span-2">
          <header className="flex items-center gap-2.5 border-b border-border-subtle px-5 py-4">
            <UserRound className="h-[18px] w-[18px] text-brand-600" strokeWidth={1.75} aria-hidden />
            <h2 className="text-sm font-semibold text-slate-900">Your details</h2>
          </header>
          <dl className="divide-y divide-border-subtle text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <dt className="w-40 shrink-0 text-slate-500">{row.label}</dt>
                <dd className="num min-w-0 flex-1 font-medium text-slate-900">
                  {row.value || '—'}
                </dd>
                {row.step && (
                  <Link
                    to={STEP_ROUTES[row.step]}
                    className="focus-ring inline-flex shrink-0 items-center gap-1 rounded text-xs font-semibold text-brand-600 hover:underline"
                  >
                    Update
                    <ExternalLink className="h-3 w-3" strokeWidth={2} aria-hidden />
                  </Link>
                )}
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-card border border-border-subtle bg-surface p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
              Verification
            </h2>
            <div className="mt-3 space-y-2">
              {(['mobile', 'email', 'pan', 'kyc', 'address'] as const).map((step) => (
                <div key={step} className="flex items-center justify-between gap-2">
                  <span className="text-xs capitalize text-slate-600">
                    {step === 'kyc' ? 'Aadhaar' : step}
                  </span>
                  <StatusBadge status={kyc.steps[step].status} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-border-subtle bg-surface shadow-card">
            <header className="flex items-center gap-2 border-b border-border-subtle px-5 py-4">
              <ScrollText className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
              <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
            </header>
            {audit.length === 0 ? (
              <p className="px-5 py-6 text-xs text-slate-500">Nothing recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {audit.map((entry) => (
                  <li key={entry.id} className="px-5 py-2.5">
                    <p className="text-xs font-medium text-slate-800">{entry.detail}</p>
                    <p className="num mt-0.5 text-2xs text-slate-400">
                      {entry.action} · {new Date(entry.at).toLocaleString('en-IN')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function fullName(kyc: { personal?: { firstName: string; middleName: string; lastName: string } }): string {
  if (!kyc.personal) return '';
  return [kyc.personal.firstName, kyc.personal.middleName, kyc.personal.lastName]
    .filter(Boolean)
    .join(' ');
}

function capitalise(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
}
