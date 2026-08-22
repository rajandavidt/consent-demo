// packages/shared/src/onboarding/VerifyEmail.tsx — requirement 3, the same challenge against email.
//
// Deliberately the same shape as VerifyMobile and not a shared abstraction over both: the two differ
// in validation, masking and copy, and folding them together would produce a component with a
// `channel` prop and three conditionals — harder to read than the duplication it removes. The part
// worth sharing (the whole OTP state machine) already is shared.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { CollectionPointConsent } from '../consent/CollectionPointConsent.js';
import { setStepStatus, updateKyc } from '../kyc/store.js';
import { OtpInput } from '../otp/OtpInput.js';
import { Button, Field, useToast } from '../ui/index.js';
import { maskEmail } from '../util/mask.js';
import { validateEmail } from '../util/validate.js';
import { OnboardingLayout } from './OnboardingLayout.js';

export function VerifyEmail({ nextRoute }: { nextRoute: string }) {
  const { session, user, kyc, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState(kyc?.email?.address ?? user?.email ?? '');
  const [error, setError] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [challenging, setChallenging] = useState(false);

  if (!session) return null;

  const sendOtp = () => {
    const problem = validateEmail(email);
    setError(problem);
    if (problem) return;
    setSending(true);
    window.setTimeout(() => {
      updateKyc(session.userId, (record) => ({ ...record, email: { address: email.trim() } }));
      setStepStatus(session.userId, 'email', 'in_progress');
      refresh();
      setSending(false);
      setChallenging(true);
      toast.info('OTP sent', `Demo OTP 123456 — no email was sent to ${maskEmail(email)}`);
    }, 500);
  };

  return (
    <OnboardingLayout
      step="email"
      title="Verify your email address"
      description="Statements, policy documents and security notices go to this address."
      footer={
        challenging ? undefined : (
          <Button onClick={sendOtp} loading={sending}>
            Send OTP
          </Button>
        )
      }
    >
      {/* Shown on landing, before an address is typed: what this email is used for, disclosed and
          asked from the PUBLISHED policy. Returns null once answered, so it never becomes a nag. */}
      <CollectionPointConsent
        element="email"
        source="onboarding-email"
        title="Before you add your email address"
      />

      {!challenging ? (
        <div className="max-w-sm space-y-4">
          <Field
            label="Email address"
            type="email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              setError(undefined);
            }}
            error={error}
            hint="Demo address: customer@finsecure.com"
            placeholder="you@example.com"
            required
          />
        </div>
      ) : (
        <OtpInput
          purpose="email"
          sentTo={maskEmail(email)}
          destinationLabel="email address"
          onVerified={() => {
            setStepStatus(session.userId, 'email', 'verified');
            refresh();
            toast.success('Email verified', 'Your email address has been confirmed.');
            navigate(nextRoute);
          }}
          secondaryAction={
            <button
              type="button"
              onClick={() => setChallenging(false)}
              className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
            >
              Change email address
            </button>
          }
        />
      )}
    </OnboardingLayout>
  );
}
