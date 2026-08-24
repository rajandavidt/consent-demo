// apps/banking/src/onboarding/AadhaarStep.tsx — requirement 5, the three-phase Aadhaar KYC.
//
// Number → OTP to the registered mobile → verified. One route, three phases, because the
// number must not survive in a URL and because "back" between phases has to mean "re-enter", not
// "browser history".
//
// NO CONSENT CHECKBOX HERE, DELIBERATELY. Identity verification for account opening rests on a
// statutory obligation, not on consent — the bank must verify and would not proceed if asked and
// refused. A tickbox implying a choice that does not exist is the dark pattern this platform is
// supposed to demonstrate the absence of. The obligation is DISCLOSED instead, on the KYC screen,
// where it is stated as something that happens rather than offered as a decision.
//
// NOTHING HERE CONTACTS UIDAI. There is no Aadhaar service, no request, no partner API. The digits
// are format-checked locally, the OTP is the demo code, and the "verifying" pause is a timer. Said
// on screen as well as here, because a screen that looks like a registry call is a screen someone
// will believe.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Loader2, ShieldCheck } from 'lucide-react';
import {
  useAuth,
  Button,
  CollectionPointConsent,
  Field,
  InfoBanner,
  OtpInput,
  maskAadhaar,
  maskMobile,
  setStepStatus,
  updateKyc,
  useToast,
  validateAadhaar,
} from '@finsecure/shared';
import { OnboardingLayout } from '@finsecure/shared';

type Phase = 'capture' | 'otp' | 'verifying' | 'done';

export default function AadhaarStep() {
  const { session, kyc, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const alreadyVerified = kyc?.steps.kyc.status === 'verified';
  const [phase, setPhase] = useState<Phase>(alreadyVerified ? 'done' : 'capture');
  const [aadhaar, setAadhaar] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  if (!session) return null;

  const registeredMobile = kyc?.mobile?.number ?? '';

  const sendOtp = () => {
    const problem = validateAadhaar(aadhaar);
    setError(problem);
    if (problem) return;

    setSending(true);
    window.setTimeout(() => {
      const digits = aadhaar.replace(/\s/g, '');
      updateKyc(session.userId, (record) => ({
        ...record,
        aadhaar: { number: digits },
      }));
      setStepStatus(session.userId, 'kyc', 'in_progress');
      refresh();
      setSending(false);
      setPhase('otp');
      toast.info('OTP sent', 'Demo OTP 123456 — nothing was sent to any registered mobile.');
    }, 600);
  };

  const onOtpVerified = () => {
    // A visible "verifying" phase, because this is the step where a real system does the most work
    // and a demo that snaps straight to a tick teaches the wrong expectation.
    setPhase('verifying');
    window.setTimeout(() => {
      setStepStatus(session.userId, 'kyc', 'verified');
      refresh();
      setPhase('done');
      toast.success('Identity verified', 'Your Aadhaar-based verification is complete.');
    }, 1400);
  };

  return (
    <OnboardingLayout
      step="kyc"
      title="Aadhaar verification"
      description="Aadhaar-based verification confirms your identity against your registered details."
      footer={
        phase === 'capture' ? (
          <Button onClick={sendOtp} loading={sending}>
            Send OTP
          </Button>
        ) : phase === 'done' ? (
          <Button onClick={() => navigate('/onboarding/personal')}>Continue</Button>
        ) : undefined
      }
    >
      {/* Shown on landing, before a digit is typed: what this Aadhaar is used for, disclosed
          and asked from the PUBLISHED policy. Returns null once answered, so it never nags. */}
      <CollectionPointConsent
        element="identity"
        source="onboarding-aadhaar"
        title="Before you add your Aadhaar"
      />

      {phase === 'capture' && (
        <div className="max-w-md space-y-5">
          <Field
            label="Aadhaar number"
            value={formatAadhaarInput(aadhaar)}
            onChange={(value) => {
              setAadhaar(value.replace(/\D/g, '').slice(0, 12));
              setError(undefined);
            }}
            error={error}
            hint="12 digits. It is masked as soon as you continue and never shown in full again."
            placeholder="1234 5678 9012"
            required
          />

          <p className="text-xs text-slate-500">
            This demo does not contact UIDAI or any verification partner. The number is checked for
            format only and the result is simulated.
          </p>
        </div>
      )}

      {phase === 'otp' && (
        <div className="space-y-4">
          <InfoBanner tone="info">
            Aadhaar entered as <strong className="num">{maskAadhaar(aadhaar)}</strong>. Only the last
            four digits are shown from here on.
          </InfoBanner>
          <OtpInput
            purpose="aadhaar"
            sentTo={registeredMobile ? maskMobile(registeredMobile) : 'your registered mobile'}
            destinationLabel="registered mobile number"
            onVerified={onOtpVerified}
            verifyLabel="Verify identity"
            secondaryAction={
              <button
                type="button"
                onClick={() => setPhase('capture')}
                className="focus-ring rounded font-medium text-slate-600 hover:text-slate-900 hover:underline"
              >
                Re-enter Aadhaar
              </button>
            }
          />
        </div>
      )}

      {phase === 'verifying' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
          <p className="text-sm font-medium text-slate-800">Verifying your identity…</p>
          <p className="max-w-sm text-xs text-slate-500">
            Matching your details against the demo record. No external service is being contacted.
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-control border border-status-verified/20 bg-status-verified-soft p-4">
            <BadgeCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-status-verified"
              strokeWidth={2}
              aria-hidden
            />
            <div>
              <p className="text-sm font-semibold text-status-verified">Identity verified</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Aadhaar{' '}
                <span className="num font-medium">
                  {kyc?.aadhaar ? maskAadhaar(kyc.aadhaar.number) : 'XXXX XXXX XXXX'}
                </span>{' '}
                — verified
                {kyc?.steps.kyc.verifiedAt
                  ? ` on ${new Date(kyc.steps.kyc.verifiedAt).toLocaleDateString('en-IN')}`
                  : ''}
                .
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Your full Aadhaar number is not displayed anywhere in this application after
            verification.
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}

/** Groups as `1234 5678 9012` while typing — how the number is printed and read aloud. */
function formatAadhaarInput(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
