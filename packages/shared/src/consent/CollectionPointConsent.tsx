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
import { DisclosureModal, useConsent } from '@akku-work/consent-auth/react';

export function CollectionPointConsent({
  element,
  source,
  title,
  onDone,
}: {
  /** The policy's element key — `phone`, `email`. Its purposes are looked up, never listed here. */
  element: string;
  source: string;
  title: string;
  /** Called once the visitor has answered, or dismissed without answering. */
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
  if (states === undefined) return null;

  const purposeKeys = states
    .filter((state) => state.elementKey === element)
    .map((state) => state.key);

  // An empty list is the honest answer for an element the policy attaches nothing to: a collection
  // point with no published purposes has nothing to disclose, and inventing something to show would
  // be worse than silence.
  if (purposeKeys.length === 0) return null;

  return (
    <DisclosureModal
      purposeKeys={purposeKeys}
      source={source}
      title={title}
      // Conditionally spread rather than passed as `onDone` directly: under
      // exactOptionalPropertyTypes an explicit `undefined` is not the same as an absent optional
      // prop, and DisclosureModal declares these as optional-but-defined.
      {...(onDone === undefined ? {} : { onSaved: onDone, onDismiss: onDone })}
    />
  );
}
