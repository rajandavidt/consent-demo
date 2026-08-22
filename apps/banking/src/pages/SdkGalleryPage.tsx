// apps/banking/src/pages/SdkGalleryPage.tsx — every surface @akku-work/consent-auth/react ships,
// rendered from the LOCAL package build.
//
// A development page, not part of the product. It exists because the states that matter most are the
// ones hardest to reach by clicking: a purpose whose consent has lapsed, one decided under a
// superseded policy, a failed policy read. Each gets its own mounted instance with a fake manager, so
// all of them are on screen at once.
//
// THE MANAGER IS FAKE AND THE POLICY IS FIXTURE DATA — deliberately, and only here. Every other
// screen in this app reads the live published policy; this one needs to pin specific outcomes, which
// a live policy cannot be made to produce on demand. The fixture uses the element-key shape from the
// canonical deliverable (`phone_number.sms_marketing`), not the shape the rest of this demo used.
import { useState } from 'react';
import type { ConsentManager, PurposeState } from '@akku-work/consent-auth';
import {
  AskModal,
  AskSnackbar,
  ConsentPreferences,
  ConsentProvider,
  DisclosureModal,
  PreferenceSheet,
  Scrim,
  version as sdkVersion,
} from '@akku-work/consent-auth/react';

/** One purpose state, with the fields a surface actually reads. */
function purpose(over: Partial<PurposeState> & { key: string; name: string }): PurposeState {
  return {
    legalBasis: 'consent',
    validityDays: 365,
    outcome: 'ask',
    granted: false,
    needsDecision: true,
    ...over,
  } as PurposeState;
}

/**
 * A stand-in for ConsentManager.
 *
 * `recordDecisions` resolves and notifies, so toggling something in the gallery behaves like a real
 * write — including the busy state — without reaching an API. `failing` makes the read reject, which
 * is the only way to see the held-error path.
 */
function fakeManager(states: PurposeState[], failing = false): ConsentManager {
  const listeners = new Set<() => void>();
  let current = states;
  return {
    getPurposeStates: async () => {
      if (failing) throw new Error('policy unreachable (fixture)');
      return current;
    },
    recordDecisions: async (decisions: Record<string, boolean>) => {
      current = current.map((s) =>
        s.key in decisions
          ? { ...s, granted: decisions[s.key]!, outcome: 'silent', needsDecision: false }
          : s,
      );
      for (const l of listeners) l();
    },
    onChange: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  } as unknown as ConsentManager;
}

/* The fixture: one purpose per outcome the resolver can produce, plus both fixed bases. */
const FIXTURE: PurposeState[] = [
  purpose({
    key: 'phone_number.sms_marketing',
    name: 'Offers by SMS',
    description: 'Short promotional messages. No more than two a month.',
    validityDays: 180,
    outcome: 'ask',
  }),
  purpose({
    key: 'address.doorstep',
    name: 'Doorstep banking visits',
    description:
      'A relationship manager may visit you for cash pickup or document collection instead of a branch trip.',
    outcome: 'ask',
  }),
  purpose({
    key: 'device.analytics',
    name: 'Spending insights',
    description: 'Analysing your transactions to categorise spending and show monthly trends.',
    outcome: 're-confirm',
    granted: true,
  }),
  purpose({
    key: 'email.account_recovery',
    name: 'Account recovery',
    description: 'Verifying it is really you when you reset credentials or request statements.',
    outcome: 're-ask',
    granted: true,
  }),
  purpose({
    key: 'email.marketing',
    name: 'Marketing emails',
    description: 'Product news, rate changes and offers, by email.',
    outcome: 'silent',
    granted: true,
    needsDecision: false,
  }),
  purpose({
    key: 'device.personalisation',
    name: 'Personalised dashboard',
    description: 'Ordering your dashboard around what you use most.',
    outcome: 'silent',
    granted: false,
    needsDecision: false,
  }),
  purpose({
    key: 'phone_number.fraud_alerts',
    name: 'Fraud and verification calls',
    description: 'Required to verify transactions we flag as unusual.',
    legalBasis: 'legal_obligation',
    validityDays: null,
    outcome: 'disclose',
    granted: false,
    needsDecision: false,
  }),
  purpose({
    key: 'email.statements',
    name: 'Statements & policy documents',
    description: 'Sending your statements and renewal notices.',
    legalBasis: 'necessary',
    validityDays: null,
    outcome: 'disclose',
    granted: true,
    needsDecision: false,
  }),
];

/** Host-supplied element context. The SDK never holds these values — see ElementGroup. */
const ELEMENTS = {
  phone_number: { label: 'Phone number', value: '+91 98XXX XX214' },
  email: { label: 'Email address', value: 'a•••@example.com' },
  address: { label: 'Residential address', value: 'Worli, Mumbai' },
  device: { label: 'Device & usage', value: 'This browser' },
};

function Case({
  title,
  note,
  states,
  failing = false,
  children,
}: {
  title: string;
  note: string;
  states: PurposeState[];
  failing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">{note}</p>
      </header>
      <div className="bg-muted/40 rounded-xl border p-6">
        <ConsentProvider manager={fakeManager(states, failing)}>{children}</ConsentProvider>
      </div>
    </section>
  );
}

export default function SdkGalleryPage() {
  const [scrim, setScrim] = useState<'ask' | 'disclose' | null>(null);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-primary text-2xs font-bold tracking-[0.16em] uppercase">
          @akku-work/consent-auth/react · v{sdkVersion} · local link
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">SDK surfaces</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Every surface the package ships, rendered from the local build with a fake manager. The
          policy here is fixture data so each outcome can be pinned — everything else in this app reads
          the live published policy.
        </p>
      </header>

      <Case
        title="ConsentPreferences — the embeddable panel"
        note="Design A, attention layout. Open decisions first as weighted cards with Allow / Not now, settled consents as a ledger with toggles, always-on purposes last as reference. Allow one and watch it move sections."
        states={FIXTURE}
      >
        <ConsentPreferences
          source="sdk-gallery"
          elements={ELEMENTS}
          onExportRecord={(states) =>
            // eslint-disable-next-line no-console
            console.log('[gallery] export requested', states.length, 'purposes')
          }
        />
      </Case>

      <Case
        title="ConsentPreferences — nothing left to decide"
        note="Every optional purpose answered. The open section disappears and is replaced by a single statement rather than an empty heading."
        states={FIXTURE.filter((s) => s.outcome !== 'ask' && s.outcome !== 're-ask' && s.outcome !== 're-confirm')}
      >
        <ConsentPreferences source="sdk-gallery-settled" elements={ELEMENTS} />
      </Case>

      <Case
        title="ConsentPreferences — the policy read failed"
        note="The error is stated and nothing is defaulted. Note what is ABSENT: no 'nothing left to decide', because after a failed read that claim is not one we can honestly make."
        states={[]}
        failing
      >
        <ConsentPreferences source="sdk-gallery-error" elements={ELEMENTS} />
      </Case>

      <Case
        title="PreferenceSheet — the standing surface"
        note="What shipped before the panel. Grouped by legal basis, one toggle per consent purpose. Compare the first two rows with the panel above: an unanswered purpose renders here as 'off', which is the difference the panel exists to fix."
        states={FIXTURE}
      >
        <PreferenceSheet source="sdk-gallery" />
      </Case>

      <Case
        title="AskSnackbar — the passive ask"
        note="Never blocks the page and yields to any modal. Silence is not consent, so there is no auto-dismiss timer."
        states={FIXTURE}
      >
        <AskSnackbar purposeKey="device.analytics" source="sdk-gallery" />
      </Case>

      <section className="space-y-3">
        <header>
          <h2 className="text-base font-semibold tracking-tight">Blocking surfaces</h2>
          <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
            These take over the page, so they open on demand. Escape and a backdrop click dismiss —
            they never answer, because closing a consent modal is not a decision.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScrim('ask')}
            className="focus-ring h-11 rounded-md border px-4 text-sm font-semibold"
          >
            Open AskModal
          </button>
          <button
            type="button"
            onClick={() => setScrim('disclose')}
            className="focus-ring h-11 rounded-md border px-4 text-sm font-semibold"
          >
            Open DisclosureModal
          </button>
        </div>
      </section>

      {scrim !== null && (
        <ConsentProvider manager={fakeManager(FIXTURE)}>
          <Scrim onDismiss={() => setScrim(null)}>
            {scrim === 'ask' ? (
              <AskModal
                purposeKey="phone_number.sms_marketing"
                source="sdk-gallery"
                onResolved={() => setScrim(null)}
                onDismiss={() => setScrim(null)}
              />
            ) : (
              <DisclosureModal
                purposeKeys={['phone_number.fraud_alerts', 'phone_number.sms_marketing']}
                source="sdk-gallery"
                title="Before you add your mobile number"
                onSaved={() => setScrim(null)}
                onDismiss={() => setScrim(null)}
              />
            )}
          </Scrim>
        </ConsentProvider>
      )}
    </div>
  );
}
