// apps/banking/src/onboarding/ConsentStep.tsx — requirement 11, against the LIVE policy.
//
// TWO DIFFERENT THINGS ON ONE SCREEN, kept visibly apart:
//
//   1. Privacy CHOICES — rendered by Akku's own surface from the published policy. This app names no
//      purpose, no legal basis and no expiry window; all of it is fetched. A policy in source drifts,
//      and the drifted copy is the one the customer sees.
//   2. The DECLARATION — accepting terms and confirming your details. Contractual acknowledgements,
//      not a lawful basis for processing. An earlier version of this screen mixed the two, and one of
//      its checkboxes read "I consent to identity verification" for processing that rests on a legal
//      obligation. Asking consent for something that happens regardless implies a choice that does not
//      exist. Letting the policy decide which purposes get a control makes that mistake unavailable.
//
// The choices block is the same shared component as the standing Privacy centre, so the answer to
// "what am I agreeing to" cannot differ between onboarding and the settings screen.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Lock } from 'lucide-react';
import {
  Button,
  Checkbox,
  ConsentCentre,
  InfoBanner,
  nowIso,
  setStepStatus,
  updateKyc,
  useAuth,
  useToast,
} from '@finsecure/shared';
import { OnboardingLayout } from '@finsecure/shared';

export default function ConsentStep() {
  const { session, kyc, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [infoCorrect, setInfoCorrect] = useState(kyc?.consent?.informationCorrect ?? false);
  const [termsAccepted, setTermsAccepted] = useState(kyc?.consent?.termsAccepted ?? false);
  const [privacyRead, setPrivacyRead] = useState(kyc?.consent?.privacyPolicyRead ?? false);
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  const acknowledged = infoCorrect && termsAccepted && privacyRead;

  const submit = () => {
    if (!acknowledged) return;
    setSaving(true);
    window.setTimeout(() => {
      updateKyc(session.userId, (rec) => ({
        ...rec,
        consent: {
          informationCorrect: infoCorrect,
          // Kept for the record's shape only. NOT presented as consent anywhere — the published
          // policy carries identity verification as a legal obligation, and the surface above states
          // it as such rather than asking.
          identityVerification: true,
          personalDataProcessing: true,
          termsAccepted,
          privacyPolicyRead: privacyRead,
          acceptedAt: nowIso(),
        },
      }));
      setStepStatus(session.userId, 'consent', 'verified');
      refresh();
      setSaving(false);
      toast.success('Declaration submitted', 'Your KYC is now complete.');
      navigate('/kyc');
    }, 700);
  };

  return (
    <OnboardingLayout
      step="consent"
      title="Your data & your choices"
      description="What we do with your information, which parts of it are your choice, and what you are agreeing to."
      footer={
        <Button onClick={submit} loading={saving} disabled={!acknowledged}>
          Submit declaration
        </Button>
      }
    >
      <div className="space-y-7">
        <ConsentCentre source="kyc-onboarding" />

        <section className="space-y-3 border-t pt-6">
          <h3 className="text-sm font-semibold">Declaration</h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            These are things you agree to, rather than processing you consent to — which is why they
            are separate from your privacy choices above. Your choices never block this.
          </p>
          {[
            {
              checked: infoCorrect,
              set: setInfoCorrect,
              label: 'I confirm that the information provided is correct.',
              detail:
                'Including my name, date of birth, PAN, Aadhaar, address and nominee details as entered in the previous steps.',
            },
            {
              checked: termsAccepted,
              set: setTermsAccepted,
              label: 'I agree to the Terms & Conditions.',
              detail: 'Including the schedule of charges and the account operating rules.',
            },
            {
              checked: privacyRead,
              set: setPrivacyRead,
              label: 'I have read the Privacy Policy.',
              detail:
                'How my data is stored, who it is shared with, how long it is kept, and my rights over it.',
            },
          ].map((item) => (
            <div
              key={item.label}
              className={
                'rounded-lg border p-4 transition-colors ' +
                (item.checked ? 'border-status-verified/25 bg-status-verified-soft' : '')
              }
            >
              <Checkbox checked={item.checked} onChange={item.set}>
                <span className="font-medium">
                  {item.label}
                  <span className="text-destructive ml-1">*</span>
                </span>
                <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                  {item.detail}
                </span>
              </Checkbox>
            </div>
          ))}
        </section>

        {!acknowledged ? (
          <InfoBanner tone="warning">
            All three declaration statements are required to open the account.
          </InfoBanner>
        ) : (
          <div className="border-status-verified/20 bg-status-verified-soft flex items-start gap-2.5 rounded-lg border p-4">
            <FileCheck2
              className="text-status-verified mt-0.5 size-5 shrink-0"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-xs leading-relaxed">
              Ready to submit. Your privacy choices are recorded separately, against the policy version
              live when you made them, and can be changed at any time.
            </p>
          </div>
        )}

        <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
          <Lock className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Demo application — but the privacy policy and the consent record behind it are real.
        </p>
      </div>
    </OnboardingLayout>
  );
}
