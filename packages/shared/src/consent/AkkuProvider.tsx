// packages/shared/src/consent/AkkuProvider.tsx — mounts Akku's consent context for the signed-in user.
//
// Keyed on the session, not built once at module scope: a consent record belongs to the person who is
// logged in, so the manager has to be rebuilt when they change — otherwise one customer's decisions
// are read and written under another's identity the moment a second person uses the same browser.
//
// Keyed on `session` rather than `user` because the router renders protected pages as soon as the
// session exists, while `user` is loaded separately. Keying on `user` would leave a window with no
// provider, and `useConsent` throws outside one by design — so a consent surface would take the whole
// page down during a session restore.
//
// THE AUTHENTICATED PLANE, NOT THE ANONYMOUS ONE. This uses the SDK's own `ConsentManager`, which
// talks to `/v1/a/:siteKey/*` with a signed Subject Token. It replaces a hand-written manager that
// posted a bare `subjectId` to `/v1/c/`. Two things came with that change:
//
//   - The subject can no longer be spoofed from devtools. The server derives it from the token's
//     signature, so editing an id in the browser proves nothing.
//   - Decisions come back WITH provenance — `policyVersionId`, `updatedAt` — which the anonymous
//     plane withholds on purpose (rule D6) because a bare subject id is guessable. That provenance
//     is what lets the SDK tell "decided under the current policy" from "decided under a superseded
//     one", and its absence is why this app used to keep a localStorage cache and re-ask on every
//     load. That cache is gone with it.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ConsentManager } from '@akku-work/consent-auth';
import { ConsentProvider } from '@akku-work/consent-auth/react';
import { useAuth } from '../auth/AuthProvider.js';
import { AKKU_CONFIG, AKKU_CONFIGURED } from './config.js';

/**
 * Fetches a Subject Token for this user from our own server.
 *
 * Called fresh by the SDK before every request, so refresh and rotation are entirely ours — there is
 * no token cached in this module to go stale, and a 10-minute lifetime costs nothing.
 *
 * `api/subject-token.ts` is where the signing happens, because it holds the private key. See its
 * header for the one function a real host must replace: this demo has no real session, so that
 * endpoint trusts the id sent to it.
 */
async function fetchSubjectToken(subjectId: string): Promise<string> {
  const response = await fetch('/api/subject-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subjectId }),
    // A short-lived credential must never come from a cache.
    cache: 'no-store',
  });
  if (!response.ok) {
    // Read the server's own message when there is one: it names the missing variable or the
    // unusable key, which is far more use than "token request failed".
    const detail = await response
      .json()
      .then((body: { error?: string }) => body.error)
      .catch(() => undefined);
    throw new Error(detail ?? `subject token request failed (${String(response.status)})`);
  }
  const body = (await response.json()) as { token?: string };
  if (typeof body.token !== 'string' || body.token.length === 0) {
    throw new Error('subject token response contained no token');
  }
  return body.token;
}

export function AkkuProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  const manager = useMemo(() => {
    if (!AKKU_CONFIGURED || !session?.userId) return null;
    const subjectId = session.userId;
    return new ConsentManager({
      apiHost: AKKU_CONFIG.apiHost,
      siteKey: AKKU_CONFIG.siteKey,
      applicationId: AKKU_CONFIG.appId,
      getSubjectToken: () => fetchSubjectToken(subjectId),
    });
  }, [session?.userId]);

  // Children render untouched when there is no subject or no configuration: every consent surface in
  // these apps lives behind login, and mounting a provider without either fires a read that can only
  // fail.
  if (!manager) return <>{children}</>;
  return <ConsentProvider manager={manager}>{children}</ConsentProvider>;
}
