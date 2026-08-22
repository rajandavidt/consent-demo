// apps/insurance/src/pages/ApplyPage.tsx — requirements 12 and 13.
//
// THE POINT OF THIS SCREEN IS WHAT IT DOES NOT ASK. Requirement 12 says do not make the customer
// enter the same information twice, and the flow enforces it structurally: the KYC stage is
// read-only if the shared record is already verified, and the only editable stages are the ones
// insurance genuinely needs — cover, health, and who the payout goes to.
//
// If KYC is NOT complete, the application refuses to proceed and links into the banking app's
// onboarding rather than growing a second copy of it here. Two apps, one record: duplicating the
// capture would be the exact failure this demo exists to avoid.
//
// THE PREMIUM IS A TOY. A real quote depends on mortality tables, reinsurance terms and medical
// underwriting. This is an arithmetic stand-in, labelled as one on screen — a plausible-looking
// number that a customer might mistake for a quote is worse than an obviously fake one.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  HeartPulse,
  IndianRupee,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import {
  Button,
  Checkbox,
  Field,
  InfoBanner,
  KEYS,
  SelectField,
  StatusBadge,
  isKycComplete,
  maskAadhaar,
  maskPan,
  nextId,
  nowIso,
  overallStatus,
  read,
  useAuth,
  useToast,
  write,
} from '@finsecure/shared';

type Stage = 'cover' | 'kyc' | 'health' | 'nominee' | 'review';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'cover', label: 'Cover' },
  { id: 'kyc', label: 'KYC' },
  { id: 'health', label: 'Health' },
  { id: 'nominee', label: 'Nominee' },
  { id: 'review', label: 'Review' },
];

const PLANS = [
  { value: 'term', label: 'Term life — pure cover, lowest premium', factor: 1 },
  { value: 'endowment', label: 'Endowment — cover with savings', factor: 2.6 },
  { value: 'ulip', label: 'ULIP — cover with market-linked returns', factor: 3.1 },
  { value: 'health', label: 'Health indemnity — hospitalisation cover', factor: 1.8 },
];

const SUMS = [500000, 1000000, 2500000, 5000000, 10000000];
const TERMS = [10, 15, 20, 25, 30];
const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', divisor: 12 },
  { value: 'quarterly', label: 'Quarterly', divisor: 4 },
  { value: 'annual', label: 'Annual', divisor: 1 },
];

interface Policy {
  id: string;
  userId: string;
  planType: string;
  sumAssured: number;
  termYears: number;
  frequency: string;
  premium: number;
  createdAt: string;
  status: 'submitted';
}

interface Nominee {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  allocation: number;
}

export default function ApplyPage() {
  const { user, kyc } = useAuth();
  const toast = useToast();

  const [stage, setStage] = useState<Stage>('cover');
  const [plan, setPlan] = useState('term');
  const [sum, setSum] = useState('2500000');
  const [term, setTerm] = useState('20');
  const [frequency, setFrequency] = useState('monthly');

  const [smoker, setSmoker] = useState(false);
  const [preExisting, setPreExisting] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [existingCover, setExistingCover] = useState('');
  const [declarationTicked, setDeclarationTicked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const nominees = useMemo(
    () => read<Nominee[]>(KEYS.nominees, []).filter((n) => n.userId === user?.id),
    [user?.id],
  );

  if (!user || !kyc) return null;

  const kycReady = isKycComplete(kyc);
  const age = kyc.personal?.dateOfBirth ? ageFrom(kyc.personal.dateOfBirth) : undefined;
  const premium = calculatePremium({
    plan,
    sumAssured: Number(sum),
    termYears: Number(term),
    frequency,
    age: age ?? 30,
    smoker,
    preExisting,
  });

  const stageIndex = STAGES.findIndex((s) => s.id === stage);
  const go = (next: Stage) => setStage(next);

  const submit = () => {
    setSubmitting(true);
    window.setTimeout(() => {
      const policy: Policy = {
        id: nextId('POL'),
        userId: user.id,
        planType: plan,
        sumAssured: Number(sum),
        termYears: Number(term),
        frequency,
        premium,
        createdAt: nowIso(),
        status: 'submitted',
      };
      write(KEYS.policies, [policy, ...read<Policy[]>(KEYS.policies, [])]);
      setSubmitting(false);
      setConfirmOpen(false);
      setSubmittedId(policy.id);
      toast.success('Application submitted', `Reference ${policy.id}`);
    }, 900);
  };

  /* --------------------------------------------------------------- submitted */
  if (submittedId) {
    return (
      <div className="mx-auto max-w-lg space-y-5 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-status-verified">
          <BadgeCheck className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Application submitted
          </h1>
          <p className="num mt-1 text-sm text-slate-600">Reference {submittedId}</p>
        </div>
        <InfoBanner>
          A real application would now go to underwriting. In this demo it is stored in
          <code className="mx-1 rounded bg-white px-1 text-2xs">finsecure_policies</code>
          and appears under My policies.
        </InfoBanner>
        <div className="flex justify-center gap-2">
          <Link
            to="/policies"
            className="focus-ring press inline-flex min-h-11 items-center rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            View my policies
          </Link>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- blocked */
  if (!kycReady) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Buy a policy</h1>
        </header>
        <div className="rounded-card border border-status-pending/25 bg-status-pending-soft p-5">
          <div className="flex items-start gap-3">
            <CircleAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-status-pending"
              strokeWidth={2}
              aria-hidden
            />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Your KYC needs to be complete first
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                We cannot issue a policy until your identity is verified. Your KYC record is shared
                with FinSecure Bank — finish it once there and this application will pick it up
                automatically. We will not ask you for any of it again.
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">Current status</span>
                <StatusBadge status={overallStatus(kyc)} />
              </p>
              <a
                href="http://localhost:5200/kyc"
                className="focus-ring press mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Complete KYC in FinSecure Bank
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------- flow */
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Buy a policy</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your verified details are already filled in. You only need to tell us about cover and
          health.
        </p>
      </header>

      <ol className="flex flex-wrap gap-1.5">
        {STAGES.map((s, index) => (
          <li
            key={s.id}
            className={
              // This horizontal stepper had no transition-property, so a stage completing flipped the
              // pill from brand violet straight to verified green in one frame. --duration-base:
              // this is a state change on something already on screen, and it is the app's only
              // signal that the previous stage was accepted.
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ' +
              (s.id === stage
                ? 'bg-brand-600 text-white'
                : index < stageIndex
                  ? 'bg-status-verified-soft text-status-verified'
                  : 'bg-surface-sunken text-slate-500')
            }
          >
            <span className="num font-semibold">{index < stageIndex ? '✓' : index + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {stage === 'cover' && (
            <section className="rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ScrollText className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
                Cover you want
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <SelectField
                    label="Insurance type"
                    value={plan}
                    onChange={setPlan}
                    options={PLANS.map((p) => ({ value: p.value, label: p.label }))}
                    required
                  />
                </div>
                <SelectField
                  label="Sum assured"
                  value={sum}
                  onChange={setSum}
                  options={SUMS.map((s) => ({ value: String(s), label: formatInr(s) }))}
                  required
                />
                <SelectField
                  label="Policy term"
                  value={term}
                  onChange={setTerm}
                  options={TERMS.map((t) => ({ value: String(t), label: `${t} years` }))}
                  required
                />
                <SelectField
                  label="Premium frequency"
                  value={frequency}
                  onChange={setFrequency}
                  options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
                  required
                />
              </div>
            </section>
          )}

          {/* `reveal-block` on every stage EXCEPT `cover`, which is what /apply looks like when you
              arrive — animating it would perform an entrance for a panel that was always there.
              The other four replace one another in the same slot, and without the fade the swap is a
              hard cut: nothing tells you the stage advanced rather than the fields having been
              rewritten in place. Same reasoning, same class, as the payments wizard in the bank app. */}
          {stage === 'kyc' && (
            <section className="reveal-block rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-status-verified" strokeWidth={1.75} aria-hidden />
                Your verified details
              </h2>
              <InfoBanner tone="success">
                Read from your shared KYC record. Nothing here needs re-entering — change it in
                FinSecure Bank if it is wrong.
              </InfoBanner>
              <dl className="mt-4 divide-y divide-border-subtle text-sm">
                {[
                  ['Name', fullName(kyc)],
                  ['Date of birth', kyc.personal?.dateOfBirth ?? '—'],
                  ['Age', age !== undefined ? `${age} years` : '—'],
                  ['PAN', kyc.pan ? maskPan(kyc.pan.number) : '—'],
                  ['Aadhaar', kyc.aadhaar ? maskAadhaar(kyc.aadhaar.number) : '—'],
                  ['Occupation', kyc.personal?.occupation ?? '—'],
                  ['Annual income', kyc.personal?.annualIncome ?? '—'],
                  [
                    'Address',
                    kyc.address
                      ? `${kyc.address.permanent.city}, ${kyc.address.permanent.state} ${kyc.address.permanent.pincode}`
                      : '—',
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="num text-right font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {stage === 'health' && (
            <section className="reveal-block rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <HeartPulse className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
                Health &amp; existing cover
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                This is the only information insurance needs that banking never asked for.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Height (cm)"
                  value={heightCm}
                  onChange={(v) => setHeightCm(v.replace(/\D/g, '').slice(0, 3))}
                  placeholder="172"
                  maxLength={3}
                />
                <Field
                  label="Weight (kg)"
                  value={weightKg}
                  onChange={(v) => setWeightKg(v.replace(/\D/g, '').slice(0, 3))}
                  placeholder="74"
                  maxLength={3}
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Existing insurance cover"
                    value={existingCover}
                    onChange={setExistingCover}
                    placeholder="e.g. ₹10,00,000 term cover with another insurer"
                    hint="Leave blank if none"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-3 border-t border-border-subtle pt-4">
                <Checkbox checked={smoker} onChange={setSmoker}>
                  <span className="font-medium text-slate-800">
                    I have used tobacco in the last 12 months
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600">
                    This affects the premium — declaring it honestly is what keeps a claim payable.
                  </span>
                </Checkbox>
                <Checkbox checked={preExisting} onChange={setPreExisting}>
                  <span className="font-medium text-slate-800">
                    I have a pre-existing medical condition
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600">
                    Diabetes, hypertension, cardiac or respiratory conditions, or anything under
                    ongoing treatment.
                  </span>
                </Checkbox>
              </div>
            </section>
          )}

          {stage === 'nominee' && (
            <section className="reveal-block rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
                Who the payout goes to
              </h2>
              {nominees.length > 0 ? (
                <>
                  <InfoBanner tone="success">
                    Using the nominees on your shared record. Change them in FinSecure Bank and this
                    policy follows.
                  </InfoBanner>
                  <ul className="mt-4 divide-y divide-border-subtle">
                    {nominees.map((nominee) => (
                      <li key={nominee.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{nominee.name}</p>
                          <p className="text-xs text-slate-500">{nominee.relationship}</p>
                        </div>
                        <p className="num text-sm font-semibold text-slate-900">
                          {nominee.allocation}%
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <InfoBanner tone="warning">
                  No nominees on file. Add at least one in FinSecure Bank before submitting — a
                  policy without a nominee leaves the payout to be settled by succession.
                </InfoBanner>
              )}
            </section>
          )}

          {stage === 'review' && (
            <section className="reveal-block rounded-card border border-border-subtle bg-surface p-5 shadow-card">
              <h2 className="text-sm font-semibold text-slate-900">Review your application</h2>
              <dl className="mt-4 divide-y divide-border-subtle text-sm">
                {[
                  ['Applicant', fullName(kyc)],
                  ['Plan', PLANS.find((p) => p.value === plan)?.label ?? plan],
                  ['Sum assured', formatInr(Number(sum))],
                  ['Term', `${term} years`],
                  ['Frequency', FREQUENCIES.find((f) => f.value === frequency)?.label ?? frequency],
                  ['Tobacco use', smoker ? 'Declared' : 'None declared'],
                  ['Pre-existing condition', preExisting ? 'Declared' : 'None declared'],
                  ['Nominees', nominees.map((n) => `${n.name} (${n.allocation}%)`).join(', ') || 'None'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="num text-right font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 border-t border-border-subtle pt-4">
                <Checkbox checked={declarationTicked} onChange={setDeclarationTicked}>
                  <span className="font-medium text-slate-800">
                    The information in this application is true and complete.
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600">
                    A claim can be refused if a material fact was withheld — this is the one
                    declaration that matters on an insurance application.
                  </span>
                </Checkbox>
              </div>
            </section>
          )}

          <div className="flex items-center justify-between gap-3">
            {stageIndex > 0 ? (
              <Button variant="secondary" onClick={() => go(STAGES[stageIndex - 1]!.id)}>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Back
                </span>
              </Button>
            ) : (
              <span />
            )}
            {stage === 'review' ? (
              <Button onClick={() => setConfirmOpen(true)} disabled={!declarationTicked}>
                Submit application
              </Button>
            ) : (
              <Button onClick={() => go(STAGES[stageIndex + 1]!.id)}>
                <span className="inline-flex items-center gap-1.5">
                  Continue
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* The quote panel, visible at every stage so the cost of a choice is never a surprise. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-brand-200 bg-gradient-to-br from-brand-50 to-surface p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Estimated premium
            </p>
            <p className="num mt-2 flex items-baseline gap-1 text-2xl font-semibold tracking-tight text-slate-900">
              <IndianRupee className="h-5 w-5 text-slate-500" strokeWidth={2} aria-hidden />
              {premium.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500">
              per {FREQUENCIES.find((f) => f.value === frequency)?.label.toLowerCase() ?? 'month'}
            </p>
            <dl className="mt-4 space-y-1.5 border-t border-brand-200 pt-3 text-xs">
              {[
                ['Cover', formatInr(Number(sum))],
                ['Term', `${term} years`],
                ['Age used', age !== undefined ? `${age}` : '30 (default)'],
                ['Tobacco loading', smoker ? '+40%' : 'none'],
                ['Medical loading', preExisting ? '+25%' : 'none'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="num font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-2xs leading-relaxed text-slate-500">
              Illustrative only. A real premium comes from underwriting, not from this arithmetic.
            </p>
          </div>
        </aside>
      </div>

      {/* Confirmation before an irreversible-feeling action (§8 confirmation-dialogs). */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-overlay">
            <h2 className="text-lg font-semibold text-slate-900">Submit this application?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              You are applying for {formatInr(Number(sum))} of cover over {term} years, at an
              estimated <span className="num font-semibold">₹{premium.toLocaleString('en-IN')}</span>{' '}
              per {FREQUENCIES.find((f) => f.value === frequency)?.label.toLowerCase()}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} loading={submitting}>
                Confirm &amp; submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- helpers */

/**
 * A toy premium. Base rate per ₹1,000 of cover, scaled by plan, age band and declarations.
 *
 * Written so each factor is visible and roughly directionally right — age and tobacco dominate,
 * which is true of real life cover — but it is arithmetic, not underwriting.
 */
function calculatePremium(input: {
  plan: string;
  sumAssured: number;
  termYears: number;
  frequency: string;
  age: number;
  smoker: boolean;
  preExisting: boolean;
}): number {
  const planFactor = PLANS.find((p) => p.value === input.plan)?.factor ?? 1;
  const ageFactor = 1 + Math.max(0, input.age - 25) * 0.032;
  const termFactor = 1 + (input.termYears - 10) * 0.012;
  const perThousand = 1.15 * planFactor * ageFactor * termFactor;

  let annual = (input.sumAssured / 1000) * perThousand;
  if (input.smoker) annual *= 1.4;
  if (input.preExisting) annual *= 1.25;

  const divisor = FREQUENCIES.find((f) => f.value === input.frequency)?.divisor ?? 12;
  return Math.round(annual / divisor);
}

function ageFrom(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function fullName(kyc: { personal?: { firstName: string; lastName: string } }): string {
  if (!kyc.personal) return '—';
  return [kyc.personal.firstName, kyc.personal.lastName].filter(Boolean).join(' ') || '—';
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
