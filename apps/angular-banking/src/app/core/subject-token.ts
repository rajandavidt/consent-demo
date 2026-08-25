// apps/angular-banking/src/app/core/subject-token.ts — asks OUR server for a signed Subject Token.
//
// The signing happens server-side (`api/subject-token.ts`) because that is where the private key is.
// See that file's header for the one function a real host must replace: this demo has no real
// session, so the endpoint trusts the id sent to it.
//
// Called fresh by the SDK before every request, so refresh and rotation are entirely ours — there is
// no token cached in this module to go stale, and a short lifetime costs nothing.

export interface SubjectIdentity {
  subjectId: string;
  name: string;
  email: string;
}

export async function fetchSubjectToken(identity: SubjectIdentity): Promise<string> {
  const response = await fetch('/api/subject-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(identity),
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
