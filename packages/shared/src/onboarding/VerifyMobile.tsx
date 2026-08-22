// packages/shared/src/onboarding/VerifyMobile.tsx — requirement 2, mobile OTP verification.
//
// Two phases in one screen: capture the number, then challenge it. Kept together because "change
// mobile number" has to come back HERE, and a separate route for the challenge would either lose
// the number or need it in the URL — which is the one place a mobile number must not go.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { CollectionPointConsent } from '../consent/CollectionPointConsent.js';
import { setStepStatus, updateKyc } from '../kyc/store.js';
import { OtpInput } from '../otp/OtpInput.js';
import { Button, Field, useToast } from '../ui/index.js';
import { maskMobile } from '../util/mask.js';
import { validateMobile } from '../util/validate.js';
import { OnboardingLayout } from './OnboardingLayout.js';

export function VerifyMobile({ nextRoute }: { nextRoute: string }) {
  const { session, kyc, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [mobile, setMobile] = useState(kyc?.mobile?.number ?? '');
  const [error, setError] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [challenging, setChallenging] = useState(false);

  if (!session) return null;

  const sendOtp = () => {
    const problem = validateMobile(mobile);
    setError(problem);
    if (problem) return;

    setSending(true);
    // The pause exists so the loading state is visible — see useOtp for the same reasoning.
    window.setTimeout(() => {
      const digits = mobile.replace(/\D/g, '').slice(-10);
      updateKyc(session.userId, (record) => ({ ...record, mobile: { number: digits } }));
      setStepStatus(session.userId, 'mobile', 'in_progress');
      refresh();
      setSending(false);
      setChallenging(true);
      toast.info('OTP sent', `Demo OTP 123456 — no message was sent to ${maskMobile(digits)}`);
    }, 500);
  };

  const onVerified = () => {
    setStepStatus(session.userId, 'mobile', 'verified');
    refresh();
    toast.success('Mobile verified', 'Your mobile number has been confirmed.');
    navigate(nextRoute);
  };

  return (
    <OnboardingLayout
      step="mobile"
      title="Verify your mobile number"
      description="We use your mobile number for transaction alerts and to confirm changes to your account."
      footer={
        challenging ? undefined : (
          <Button onClick={sendOtp} loading={sending}>
            Send OTP
          </Button>
        )
      }
    >
      {/* Shown on landing, before a digit is typed: what this mobile is used for, disclosed and asked
          from the PUBLISHED policy. Returns null once answered, so it never becomes a nag. */}
      <CollectionPointConsent
        element="phone"
        source="onboarding-mobile"
        title="Before you add your mobile number"
      />

      {!challenging ? (
        <div className="max-w-sm space-y-4">
          <Field
            label="Mobile number"
            value={mobile}
            onChange={(value) => {
              setMobile(value.replace(/\D/g, '').slice(0, 10));
              setError(undefined);
            }}
            error={error}
            hint="10 digits, starting 6–9. Demo number: 9876543210"
            placeholder="9876543210"
            required
            maxLength={10}
          />
        </div>
      ) : (
        <OtpInput
          purpose="mobile"
          sentTo={maskMobile(mobile)}
          destinationLabel="mobile number"
          onVerified={onVerified}
          secondaryAction={
            <button
              type="button"
              onClick={() => setChallenging(false)}
              className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
            >
              Change mobile number
            </button>
          }
        />
      )}
    </OnboardingLayout>
  );
}
