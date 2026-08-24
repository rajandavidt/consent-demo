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
import { purposeKeysForElement } from './live-manager.js';

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
  // `states` is the readiness signal. The purpose grouping is populated as a side effect of the
  // manager's config read, so asking for it before `states` resolves returns an empty list and the
  // modal silently decides it has nothing to disclose — a consent request that never happened.
  const { states } = useConsent();
  if (states === undefined) return null;

  const purposeKeys = purposeKeysForElement(element);
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
