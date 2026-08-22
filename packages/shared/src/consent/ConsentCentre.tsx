// packages/shared/src/consent/ConsentCentre.tsx — the standing privacy screen, shared by both apps.
//
// One component rather than a page in each app, because the answer to "what have I agreed to and how
// do I change it" must not differ between Banking and Insurance. Each app wraps this in its own shell
// and heading; everything below the heading is identical by construction.
//
// IT NAMES NO PURPOSES. Every row comes from the published policy, rendered by the SDK's
// <ConsentPreferences/> — which decides each control from the legal basis and the prompt OUTCOME, so a
// `legal_obligation` cannot be given a toggle and an unanswered purpose is not drawn as a decision
// already taken. Reproducing a purpose table in app code would mean restating the policy, and a
// restated policy drifts from the published one — at which point this screen is confidently telling a
// customer something untrue about their own data.
import { ConsentPreferences, useConsent } from '@akku-work/consent-auth/react';
import { RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AKKU_CONFIG } from './config.js';
import { policyElements } from './live-manager.js';
import { InfoBanner } from '../ui/index.js';

export function ConsentCentre({
  /** Stamped on every decision recorded from this screen, so provenance survives into the ledger. */
  source = 'privacy-centre',
}: {
  source?: string;
}) {
  const { error } = useConsent();

  return (
    <div className="space-y-5">
      {error && (
        <InfoBanner tone="warning">
          <strong>Your privacy choices could not be loaded.</strong> Nothing has been changed and your
          account is unaffected. Please try again shortly.{' '}
          <span className="opacity-70">({error.message})</span>
        </InfoBanner>
      )}

      {/* NO SUMMARY BANNER HERE, deliberately.
          There was one, and it was both redundant and wrong. The panel below renders its own
          summary — "1 of 5 choices made", with allowed / declined / waiting-on-you broken out — and
          a second tally six inches above it said "You have 5 choices to make here" whatever the
          visitor had already decided, because it counted every consent purpose rather than the
          undecided ones. Two counts of the same thing is a bug waiting to happen; the one that can
          distinguish "declined" from "not yet asked" is the one to keep. */}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* The SDK's embeddable panel. `elements` comes from the PUBLISHED POLICY, not from a
              map in this app: the policy already carries every element's label, and restating them
              here is how an app ends up showing "Phone number" for something the policy renamed.
              Only the subject's own value would ever be the host's to supply, and this demo has
              none to give — so the panel shows the label alone, which is correct rather than
              invented. */}
          <ConsentPreferences source={source} elements={policyElements()} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TriangleAlert className="text-muted-foreground size-4" strokeWidth={1.75} aria-hidden />
              Why some things have no switch
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Some processing is required to run your account, and some is required of us by law —
              verifying your identity, and reporting to the credit bureau. Those are stated rather than
              offered, because a switch that cannot change the outcome would be misleading.
            </p>
          </div>
          <div className="rounded-xl border p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <RotateCcw className="text-muted-foreground size-4" strokeWidth={1.75} aria-hidden />
              Changing your mind
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Any choice can be withdrawn at any time and it takes effect immediately. Each decision is
              recorded with the time you made it and the policy version in force, so the history of
              what you agreed to stays intact.
            </p>
          </div>
          <div className="rounded-xl border p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="text-primary size-4" strokeWidth={1.75} aria-hidden />
              Where this comes from
            </h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              {AKKU_CONFIG.apiHost.length > 0 ? (
                <>
                  Purposes, legal bases and expiry windows are read live from{' '}
                  <code className="break-all">{AKKU_CONFIG.apiHost}</code>. None of them are stored in
                  this app, so a policy change appears here on the next page load.
                </>
              ) : (
                // Says so, rather than rendering "read live from <empty>". VITE_AKKU_API_HOST and
                // VITE_AKKU_SITE_KEY are inlined at BUILD time and have no default by design, so a
                // deployment that forgot them fails quietly — the panel above simply cannot load.
                // Naming the missing variable is the difference between a five-minute fix and an
                // afternoon of blaming CORS.
                <>
                  No consent API is configured for this build, so nothing above could be loaded. Set{' '}
                  <code>VITE_AKKU_API_HOST</code> and <code>VITE_AKKU_SITE_KEY</code> and rebuild.
                </>
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
