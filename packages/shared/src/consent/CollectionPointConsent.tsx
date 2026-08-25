// packages/shared/src/consent/CollectionPointConsent.tsx — consent at the moment data is collected.
//
// A preference centre answers "what have I agreed to?" long after the fact. This answers the
// question at the only moment the person is actually thinking about it: as they type their phone
// number in. Sibling of ConsentCentre, same rule — no purpose, label or legal basis is written here.
//
// It renders the SDK's DisclosureModal, which is built for exactly this and does two things a
// hand-rolled block would get wrong: it separates what is DISCLOSED (necessary, legal obligation)
// from what is ASKED (consent), and it returns null once there is nothing left to ask. So this
// appears the first time someone reaches the step and never nags them again.
import { useState } from 'react';
import { DisclosureModal, useConsent } from '@akku-work/consent-auth/react';
import { AKKU_CONFIGURED } from './config.js';

export function CollectionPointConsent(props: {
  /** The policy's element key — `phone`, `email`. Its purposes are looked up, never listed here. */
  element: string;
  source: string;
  title: string;
  /** Called once the visitor has answered, or dismissed without answering. */
  onDone?: () => void;
}) {
  // GUARDED BEFORE THE HOOK, and this split is the whole reason the component is in two pieces.
  //
  // AkkuProvider mounts NO ConsentProvider when the build is missing an api host, site key or app id,
  // and `useConsent` THROWS outside a provider by design. Unguarded, that throw escapes into the
  // onboarding step and React unmounts the whole tree — so a missing environment variable does not
  // hide a consent prompt, it turns every step into a WHITE SCREEN with the real cause only in the
  // console. Found on a local checkout with VITE_AKKU_APP_ID unset; ConsentCentre already guarded
  // this exact case and these two did not.
  //
  // Rule #1: a consent surface is never what breaks the page. Silence is the right answer here rather
  // than ConsentCentre's visible notice — that screen is ABOUT consent, so saying "unconfigured" is
  // useful, whereas a developer message wedged into a customer's KYC form is not.
  if (!AKKU_CONFIGURED) return null;
  return <CollectionPointConsentLive {...props} />;
}

function CollectionPointConsentLive({
  element,
  source,
  title,
  onDone,
}: {
  element: string;
  source: string;
  title: string;
  onDone?: () => void;
}) {
  // The purposes for this element come from the RESOLVED STATES, which each carry their own
  // `elementKey`. That replaces a module-level map this file used to read, populated as a side
  // effect of a manager's config fetch — so whether it was filled depended on load order, and asking
  // too early returned an empty list and silently disclosed nothing. Reading the states means the
  // question cannot be asked before the answer is available: `states` is `undefined` until the first
  // read completes, and there is nothing to render until then either way.
  //
  // Grouping on each purpose's own `elementKey`, never on a prefix parsed off the key. `email.marketing`
  // happens to be readable, but a key is an opaque identifier and a site is free to publish
  // `mktg_2024` against the email element. Parsing the string would work on this policy and silently
  // mis-group the next one.
  const { states } = useConsent();
  // Declared before every early return below: a hook cannot be called conditionally.
  const [dismissed, setDismissed] = useState(false);
  if (states === undefined) return null;

  const purposeKeys = states
    .filter((state) => state.elementKey === element)
    .map((state) => state.key);

  // An empty list is the honest answer for an element the policy attaches nothing to: a collection
  // point with no published purposes has nothing to disclose, and inventing something to show would
  // be worse than silence.
  if (purposeKeys.length === 0) return null;

  // DISMISSAL IS ALWAYS WIRED, and it has to be.
  //
  // These handlers used to be spread in ONLY when the host passed `onDone` — and no call site ever
  // did, at any of the nine collection points across both apps. So `onDismiss` was undefined,
  // DisclosureModal's decline handler resolved to `() => undefined`, and both "Decide later" and the
  // scrim were INERT: the only way out of the dialog was to answer it. A consent surface that cannot
  // be closed without answering is coercion, which is the opposite of what it exists to do.
  //
  // Local state, so it works with or without a host callback. Dismissing records NOTHING — walking
  // away is not an answer either way (Rule #5), and the surface simply returns on the next visit
  // because the purpose is still undecided.
  if (dismissed) return null;

  return (
    <DisclosureModal
      purposeKeys={purposeKeys}
      source={source}
      title={title}
      onSaved={() => {
        setDismissed(true);
        onDone?.();
      }}
      onDismiss={() => {
        setDismissed(true);
        onDone?.();
      }}
    />
  );
}
