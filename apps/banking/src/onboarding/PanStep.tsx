// apps/banking/src/onboarding/PanStep.tsx — requirement 4, PAN verification.
//
// The format check is real; the verification is not. That split is the honest version of a mock: a
// wrong-shaped PAN is rejected here exactly as a real system would reject it, and then the
// "verification" is a timer. The screen says which is which rather than implying a registry lookup.
//
// One deliberate behaviour worth keeping: the mock only "verifies" the demo PAN. A mock that accepts
// any well-formed value cannot demonstrate the rejected state, and requirement 6 lists `rejected` as
// a status the KYC page has to be able to show.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAuth,
  CollectionPointConsent,
  Button,
  Field,
  InfoBanner,
  StatusBadge,
  maskPan,
  setStepStatus,
  updateKyc,
  useToast,
  validateDateOfBirth,
  validatePan,
  validateRequired,
  hasErrors,
} from '@finsecure/shared';
import { OnboardingLayout } from '@finsecure/shared';

/** The PAN this demo treats as genuine. Anything else well-formed comes back rejected. */
const DEMO_PAN = 'ABCDE1234F';

export default function PanStep() {
  const { session, kyc, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [pan, setPan] = useState(kyc?.pan?.number ?? '');
  const [name, setName] = useState(kyc?.pan?.nameOnPan ?? '');
  const [dob, setDob] = useState(kyc?.pan?.dateOfBirth ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [verifying, setVerifying] = useState(false);

  const status = kyc?.steps.pan.status ?? 'not_started';
  const verified = status === 'verified';

  if (!session) return null;

  const verify = () => {
    const found = {
      pan: validatePan(pan),
      name: validateRequired(name, 'Full name as printed on the PAN'),
      dob: validateDateOfBirth(dob),
    };
    setErrors(found);
    if (hasErrors(found)) return;

    setVerifying(true);
    window.setTimeout(() => {
      const clean = pan.toUpperCase().trim();
      updateKyc(session.userId, (record) => ({
        ...record,
        pan: { number: clean, nameOnPan: name.trim(), dateOfBirth: dob },
      }));

      if (clean === DEMO_PAN) {
        setStepStatus(session.userId, 'pan', 'verified');
        toast.success('PAN verified', `${maskPan(clean)} matched the demo record.`);
      } else {
        setStepStatus(
          session.userId,
          'pan',
          'rejected',
          'The PAN could not be matched. In this demo only ABCDE1234F verifies.',
        );
        toast.error('PAN not verified', 'No matching record. Use the demo PAN ABCDE1234F.');
      }
      refresh();
      setVerifying(false);
    }, 900);
  };

  return (
    <OnboardingLayout
      step="pan"
      title="PAN details"
      description="Your PAN is required for tax reporting on interest and for policies above the reporting threshold."
      footer={
        verified ? (
          <Button onClick={() => navigate('/onboarding/aadhaar')}>Continue</Button>
        ) : (
          <Button onClick={verify} loading={verifying}>
            Verify PAN
          </Button>
        )
      }
    >
      <div className="space-y-5">
        {/* Shown on landing, before a digit is typed: what this PAN is used for, disclosed and
            asked from the PUBLISHED policy. Returns null once answered, so it never becomes a nag. */}
        <CollectionPointConsent
          element="pan"
          source="onboarding-pan"
          title="Before you add your PAN"
        />

        {status !== 'not_started' && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Verification status</span>
            <StatusBadge status={status} />
            {verified && kyc?.pan && (
              <span className="font-mono text-sm text-slate-700">{maskPan(kyc.pan.number)}</span>
            )}
          </div>
        )}

        {status === 'rejected' && kyc?.steps.pan.reason && (
          <InfoBanner tone="danger">{kyc.steps.pan.reason}</InfoBanner>
        )}

        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <Field
            label="PAN number"
            value={pan}
            onChange={(value) => setPan(value.toUpperCase().slice(0, 10))}
            error={errors.pan}
            hint="Demo PAN: ABCDE1234F"
            placeholder="ABCDE1234F"
            required
            disabled={verified}
            maxLength={10}
          />
          <Field
            label="Date of birth"
            type="date"
            value={dob}
            onChange={setDob}
            error={errors.dob}
            required
            disabled={verified}
          />
          <div className="sm:col-span-2">
            <Field
              label="Full name as printed on the PAN"
              value={name}
              onChange={setName}
              error={errors.name}
              placeholder="RAJAN KUMAR"
              required
              disabled={verified}
            />
          </div>
        </div>

        {/* Said plainly, because the alternative is a screen that looks like it called the income
            tax department. */}
        <p className="text-xs text-slate-500">
          This demo does not contact any PAN verification service. The format is checked locally and
          the result is simulated.
        </p>
      </div>
    </OnboardingLayout>
  );
}
