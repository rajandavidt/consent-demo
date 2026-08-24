// packages/shared/src/consent/AmbientConsentAsk.tsx — for a purpose with no moment of collection.
//
// WHY THIS EXISTS ALONGSIDE CollectionPointConsent. A collection point works because there IS a
// moment: someone is typing a phone number, so that is when to ask what the phone number may be used
// for. Analytics and personalisation have no such moment — nobody ever "enters" their device data.
// Those purposes were therefore published, prompted nowhere, and answerable only by a visitor who
// went looking in the preference centre. A consent that is only reachable by searching for it is not
// really being asked for.
//
// So this asks ambiently, on a screen the person is already on, using the SDK's AskSnackbar — built
// for exactly this and deliberately without an auto-dismiss timer, because a snackbar that fades into
// a decision turns inaction into consent (or into a refusal nobody made).
//
// ONE AT A TIME, and that is the whole restraint of it. The element may carry several pending
// purposes; showing them together makes a dashboard visit feel like a form, and showing them in
// sequence makes it feel like nagging. The first pending one is asked, the rest wait for another
// visit. Closing records nothing, so nothing is inferred from being ignored — the SDK's rule, kept.
import { AskSnackbar, useConsent } from '@akku-work/consent-auth/react';

export function AmbientConsentAsk({
  element,
  source,
}: {
  /** The policy's element key — `device`. Its purposes are looked up, never listed here. */
  element: string;
  source: string;
}) {
  const { states } = useConsent();
  if (states === undefined) return null;

  // Only `consent` purposes, and only ones still needing an answer. `needsDecision` is the SDK's own
  // resolved outcome, so an expired or policy-changed decision correctly comes back round while a
  // settled one stays quiet — this file makes no judgement of its own about either.
  const pending = states.find(
    (state) =>
      state.elementKey === element && state.legalBasis === 'consent' && state.needsDecision,
  );
  if (pending === undefined) return null;

  return <AskSnackbar purposeKey={pending.key} source={source} />;
}
