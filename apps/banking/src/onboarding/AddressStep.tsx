// apps/banking/src/onboarding/AddressStep.tsx — requirement 8.
//
// Permanent address, then a "same as permanent" tick that collapses the second block away.
//
// WHEN TICKED, THE CURRENT ADDRESS IS A COPY, NOT A POINTER. Storing a flag and reading the
// permanent address through it looks tidier and is wrong: the day someone unticks the box and edits
// one line, a shared reference silently rewrites their permanent address too. Copying on save keeps
// the two records independent, which is what they are.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import {
  useAuth,
  CollectionPointConsent,
  Button,
  Checkbox,
  Field,
  SelectField,
  StatusBadge,
  hasErrors,
  setStepStatus,
  updateKyc,
  useToast,
  validatePincode,
  validateRequired,
  type Address,
} from '@finsecure/shared';
import { OnboardingLayout } from '@finsecure/shared';

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'West Bengal',
].map((s) => ({ value: s, label: s }));

const emptyAddress: Address = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
};

export default function AddressStep() {
  const { session, kyc, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [permanent, setPermanent] = useState<Address>(kyc?.address?.permanent ?? emptyAddress);
  const [current, setCurrent] = useState<Address>(kyc?.address?.current ?? emptyAddress);
  const [same, setSame] = useState(kyc?.address?.currentSameAsPermanent ?? true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  const validateBlock = (address: Address, prefix: string): Record<string, string | undefined> => ({
    [`${prefix}.line1`]: validateRequired(address.line1, 'Address line 1'),
    [`${prefix}.city`]: validateRequired(address.city, 'City'),
    [`${prefix}.state`]: address.state ? undefined : 'State is required',
    [`${prefix}.country`]: validateRequired(address.country, 'Country'),
    [`${prefix}.pincode`]: validatePincode(address.pincode),
  });

  const save = () => {
    const found = {
      ...validateBlock(permanent, 'permanent'),
      ...(same ? {} : validateBlock(current, 'current')),
    };
    setErrors(found);
    if (hasErrors(found)) {
      toast.error('Check the highlighted fields', 'The address is incomplete.');
      return;
    }

    setSaving(true);
    window.setTimeout(() => {
      updateKyc(session.userId, (record) => ({
        ...record,
        address: {
          permanent,
          currentSameAsPermanent: same,
          // The copy, deliberately — see the file header.
          current: same ? { ...permanent } : current,
          status: 'verified',
        },
      }));
      setStepStatus(session.userId, 'address', 'verified');
      refresh();
      setSaving(false);
      toast.success('Address saved', 'Your address has been recorded and marked verified.');
      navigate('/onboarding/nominee');
    }, 700);
  };

  const block = (
    address: Address,
    setAddress: (next: Address) => void,
    prefix: string,
    disabled = false,
  ) => {
    const set = <K extends keyof Address>(key: K, value: Address[K]) => {
      setAddress({ ...address, [key]: value });
      setErrors((c) => ({ ...c, [`${prefix}.${key}`]: undefined }));
    };
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            label="Address line 1"
            value={address.line1}
            onChange={(v) => set('line1', v)}
            error={errors[`${prefix}.line1`]}
            placeholder="Flat / house number, building"
            required
            disabled={disabled}
          />
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Address line 2"
            value={address.line2}
            onChange={(v) => set('line2', v)}
            placeholder="Street, locality"
            hint="Optional"
            disabled={disabled}
          />
        </div>
        <Field
          label="City"
          value={address.city}
          onChange={(v) => set('city', v)}
          error={errors[`${prefix}.city`]}
          required
          disabled={disabled}
        />
        <SelectField
          label="State"
          value={address.state}
          onChange={(v) => set('state', v)}
          error={errors[`${prefix}.state`]}
          required
          options={STATES}
        />
        <Field
          label="Country"
          value={address.country}
          onChange={(v) => set('country', v)}
          error={errors[`${prefix}.country`]}
          required
          disabled={disabled}
        />
        <Field
          label="PIN code"
          value={address.pincode}
          onChange={(v) => set('pincode', v.replace(/\D/g, '').slice(0, 6))}
          error={errors[`${prefix}.pincode`]}
          placeholder="600001"
          required
          disabled={disabled}
          maxLength={6}
        />
      </div>
    );
  };

  return (
    <OnboardingLayout
      step="address"
      title="Address details"
      description="Your permanent address is used on statements and policy documents; your current address is where post is delivered."
      footer={
        <Button onClick={save} loading={saving}>
          Save &amp; continue
        </Button>
      }
    >
      {/* Disclosed and asked from the PUBLISHED policy. Renders nothing while the policy
          attaches no consent purpose to this field, and starts asking the moment it does. */}
      <CollectionPointConsent
        element="address"
        source="onboarding-address"
        title="Before you add your address"
      />
      <div className="space-y-7">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MapPin className="h-4 w-4 text-brand-600" strokeWidth={1.75} aria-hidden />
              Permanent address
            </h3>
            {kyc?.address?.status && <StatusBadge status={kyc.address.status} />}
          </div>
          {block(permanent, setPermanent, 'permanent')}
        </section>

        <section className="space-y-4 border-t border-border-subtle pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Current address</h3>
          <Checkbox checked={same} onChange={setSame}>
            <span className="font-medium text-slate-800">Current address is the same as permanent</span>
          </Checkbox>
          {!same && block(current, setCurrent, 'current')}
          {same && (
            <p className="text-xs text-slate-500">
              We will use your permanent address for post. Untick the box to enter a different one.
            </p>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Address verification is simulated in this demo — no document is checked and no field visit
          is scheduled.
        </p>
      </div>
    </OnboardingLayout>
  );
}
