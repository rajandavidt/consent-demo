// apps/banking/src/onboarding/PersonalStep.tsx — requirement 7.
//
// Prefilled from what the customer has already given. The date of birth came with the PAN and the
// name is on it, so asking again would be the "don't ask twice" failure requirement 12 objects to —
// in miniature, inside one flow. Prefilled fields stay editable: the PAN name is often an initial
// or an older surname.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAuth,
  CollectionPointConsent,
  Button,
  Field,
  InfoBanner,
  SelectField,
  hasErrors,
  setStepStatus,
  updateKyc,
  useToast,
  validateDateOfBirth,
  validateRequired,
  type PersonalDetails,
} from '@finsecure/shared';
import { OnboardingLayout } from '@finsecure/shared';

const INCOME_BANDS = [
  { value: '0-3', label: 'Up to ₹3 Lakhs' },
  { value: '3-5', label: '₹3 – ₹5 Lakhs' },
  { value: '5-10', label: '₹5 – ₹10 Lakhs' },
  { value: '10-25', label: '₹10 – ₹25 Lakhs' },
  { value: '25+', label: 'Above ₹25 Lakhs' },
];

const OCCUPATIONS = [
  'Salaried — private sector',
  'Salaried — government',
  'Self-employed professional',
  'Business owner',
  'Retired',
  'Student',
  'Homemaker',
].map((o) => ({ value: o, label: o }));

const SOURCES = ['Salary', 'Business income', 'Professional fees', 'Investments', 'Pension', 'Rental income'].map(
  (s) => ({ value: s, label: s }),
);

export default function PersonalStep() {
  const { session, kyc, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Seeded from the PAN record where possible — see the file header.
  const panName = (kyc?.pan?.nameOnPan ?? '').trim().split(/\s+/);
  const [form, setForm] = useState<PersonalDetails>(
    kyc?.personal ?? {
      firstName: panName[0] ?? '',
      middleName: panName.length > 2 ? panName[1]! : '',
      lastName: panName.length > 1 ? panName[panName.length - 1]! : '',
      dateOfBirth: kyc?.pan?.dateOfBirth ?? '',
      gender: '',
      maritalStatus: '',
      nationality: 'Indian',
      occupation: '',
      annualIncome: '',
      sourceOfIncome: '',
    },
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  const set = <K extends keyof PersonalDetails>(key: K, value: PersonalDetails[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const save = () => {
    const found: Record<string, string | undefined> = {
      firstName: validateRequired(form.firstName, 'First name'),
      lastName: validateRequired(form.lastName, 'Last name'),
      dateOfBirth: validateDateOfBirth(form.dateOfBirth),
      gender: form.gender ? undefined : 'Gender is required',
      maritalStatus: form.maritalStatus ? undefined : 'Marital status is required',
      nationality: validateRequired(form.nationality, 'Nationality'),
      occupation: form.occupation ? undefined : 'Occupation is required',
      annualIncome: form.annualIncome ? undefined : 'Annual income is required',
      sourceOfIncome: form.sourceOfIncome ? undefined : 'Source of income is required',
    };
    setErrors(found);
    if (hasErrors(found)) {
      toast.error('Check the highlighted fields', 'Some required details are missing.');
      return;
    }

    setSaving(true);
    window.setTimeout(() => {
      updateKyc(session.userId, (record) => ({ ...record, personal: form }));
      setStepStatus(session.userId, 'personal', 'verified');
      refresh();
      setSaving(false);
      toast.success('Personal details saved', 'Your identity details are on file.');
      navigate('/onboarding/address');
    }, 600);
  };

  return (
    <OnboardingLayout
      step="personal"
      title="Personal details"
      description="These details appear on your account records and on any policy you take out."
      footer={
        <Button onClick={save} loading={saving}>
          Save &amp; continue
        </Button>
      }
    >
      {/* Disclosed and asked from the PUBLISHED policy. Renders nothing while the policy
          attaches no consent purpose to this field, and starts asking the moment it does. */}
      <CollectionPointConsent
        element="personal"
        source="onboarding-personal"
        title="Before you add your personal details"
      />
      <div className="space-y-6">
        {kyc?.pan?.nameOnPan && (
          <InfoBanner>
            Prefilled from your verified PAN. Correct anything that differs from your legal name.
          </InfoBanner>
        )}

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Name
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="First name"
              value={form.firstName}
              onChange={(v) => set('firstName', v)}
              error={errors.firstName}
              required
            />
            <Field
              label="Middle name"
              value={form.middleName}
              onChange={(v) => set('middleName', v)}
              hint="Optional"
            />
            <Field
              label="Last name"
              value={form.lastName}
              onChange={(v) => set('lastName', v)}
              error={errors.lastName}
              required
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Identity
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(v) => set('dateOfBirth', v)}
              error={errors.dateOfBirth}
              required
            />
            <SelectField
              label="Gender"
              value={form.gender}
              onChange={(v) => set('gender', v as PersonalDetails['gender'])}
              error={errors.gender}
              required
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <SelectField
              label="Marital status"
              value={form.maritalStatus}
              onChange={(v) => set('maritalStatus', v as PersonalDetails['maritalStatus'])}
              error={errors.maritalStatus}
              required
              options={[
                { value: 'single', label: 'Single' },
                { value: 'married', label: 'Married' },
                { value: 'divorced', label: 'Divorced' },
                { value: 'widowed', label: 'Widowed' },
              ]}
            />
            <Field
              label="Nationality"
              value={form.nationality}
              onChange={(v) => set('nationality', v)}
              error={errors.nationality}
              required
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Occupation &amp; income
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Occupation"
              value={form.occupation}
              onChange={(v) => set('occupation', v)}
              error={errors.occupation}
              required
              options={OCCUPATIONS}
            />
            <SelectField
              label="Annual income"
              value={form.annualIncome}
              onChange={(v) => set('annualIncome', v)}
              error={errors.annualIncome}
              required
              options={INCOME_BANDS}
            />
            <SelectField
              label="Source of income"
              value={form.sourceOfIncome}
              onChange={(v) => set('sourceOfIncome', v)}
              error={errors.sourceOfIncome}
              required
              options={SOURCES}
            />
          </div>
        </fieldset>
      </div>
    </OnboardingLayout>
  );
}
