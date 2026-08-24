// apps/banking/api/subject-token.ts — mints the short-lived Subject Token the authenticated consent
// plane requires (`/v1/a/:siteKey/*`, docs/ARCHITECTURE-WEB-SDK.md §7).
//
// WHY THIS FILE HAS TO EXIST AT ALL, AND WHY IT IS SERVER-SIDE.
//
// The rest of this demo is a browser-only Vite app. This one endpoint cannot be, because it holds a
// PRIVATE key: a key shipped in a browser bundle is not private, it is published. So the signing
// happens here, on Vercel's Node runtime, and the browser only ever receives the finished token.
//
// WHAT THIS REPLACES. Until now the demo used the ANONYMOUS plane and passed `subjectId` in a query
// string. Two consequences, both real:
//
//   1. Anyone could edit that id in devtools and read or write another subject's consent. The
//      platform is explicit that this is not authentication -- "a userId handed to us straight from
//      the DOM/JS runtime is a CLAIM, not a CREDENTIAL" (consent-auth types.ts).
//   2. The anonymous plane deliberately returns decisions WITHOUT provenance (no policyVersionId, no
//      timestamps -- rule D6), precisely because that id is guessable. Without provenance the SDK
//      cannot tell "decided under the current policy" from "decided under a superseded one", so
//      every surface re-asked on every page load, and the demo carried a localStorage cache to work
//      around it.
//
// A signed token fixes both: the server derives the subject from the signature, and provenance comes
// back from the ledger instead of from the browser.
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// THE ONE LINE A REAL HOST MUST REPLACE — see `resolveSubject` below.
//
// This demo has NO real authentication. Its "login" compares plaintext passwords held in
// localStorage, in the browser (packages/shared/src/auth/auth.ts). There is therefore nothing here
// for this endpoint to verify, and it mints a token for whichever subject the caller names.
//
// So this endpoint does NOT make the demo secure. It moves the trust boundary to the right place and
// demonstrates the correct SHAPE, which is what a reference implementation is for. A real host puts
// its own session check in `resolveSubject` — a cookie, a bearer token, whatever it already has —
// and returns 401 when there is not one. Copying this file without doing that leaves the same hole
// in a real product.
// ────────────────────────────────────────────────────────────────────────────────────────────────
import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

/** Node runtime, not Edge: `node:crypto`'s Ed25519 signing is not available on Edge. */
export const config = { runtime: 'nodejs' };

/**
 * Fifteen minutes is the API's hard cap (`MAX_TOKEN_LIFETIME_SECONDS` in auth/subject-token.ts,
 * enforced as `exp - iat`), so a token minted longer than this is rejected outright rather than
 * silently truncated. Ten leaves room for clock skew on both sides without being generous: the SDK
 * calls `getSubjectToken()` fresh before every request, so a short life costs nothing.
 */
const LIFETIME_SECONDS = 10 * 60;

/** Minimal structural types — enough to type the handler without pulling in `@vercel/node`. */
interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Who this token is for.
 *
 * THIS IS THE PART TO REPLACE. A real host ignores anything the browser claims and reads its OWN
 * session — then returns null when there isn't one, so the endpoint answers 401 rather than minting
 * a token for a stranger. The demo has no session to read, so it takes the claim and says so out
 * loud rather than pretending otherwise.
 */
function resolveSubject(body: unknown): string | null {
  const claimed = (body as { subjectId?: unknown } | null)?.subjectId;
  return typeof claimed === 'string' && claimed.trim().length > 0 ? claimed.trim() : null;
}

export default function handler(req: Req, res: Res): void {
  if (req.method !== 'POST') {
    // GET is refused deliberately: a token in a URL ends up in logs, history and referrers.
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const appId = process.env.AKKU_APP_ID;
  const siteKey = process.env.AKKU_SITE_KEY;
  const privateKeyPem = process.env.AKKU_APP_PRIVATE_KEY;

  // An unconfigured deployment says so plainly instead of returning a token the API will reject for
  // reasons nobody can see from the browser. Same principle as the app's own build-time check.
  if (!appId || !siteKey || !privateKeyPem) {
    const missing = [
      appId ? null : 'AKKU_APP_ID',
      siteKey ? null : 'AKKU_SITE_KEY',
      privateKeyPem ? null : 'AKKU_APP_PRIVATE_KEY',
    ].filter(Boolean);
    res.status(500).json({ error: `subject-token endpoint is not configured: missing ${missing.join(', ')}` });
    return;
  }

  const subject = resolveSubject(req.body);
  if (subject === null) {
    res.status(400).json({ error: 'subjectId is required' });
    return;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: 'EdDSA', typ: 'JWT' };
  const payload = {
    sub: subject,
    // `aud` MUST be the site key and `iss` MUST be the app id — the API compares both against the
    // values it resolved from the URL and the key record, and rejects a mismatch.
    aud: siteKey,
    iss: appId,
    iat: issuedAt,
    // `iat` is REQUIRED by the verifier, not optional: the max-lifetime cap is computed as
    // `exp - iat`, so omitting it would skip the cap rather than default it.
    exp: issuedAt + LIFETIME_SECONDS,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  let token: string;
  try {
    const key = createPrivateKey({ key: privateKeyPem, format: 'pem' });
    // `algorithm` MUST be null for an Ed25519 key — the key itself carries the algorithm.
    const signature = cryptoSign(null, Buffer.from(signingInput, 'ascii'), key);
    token = `${signingInput}.${base64url(signature)}`;
  } catch {
    // Never echo the key or the failure detail: an unusable key is a deployment fault, and the
    // message would end up in a browser console.
    res.status(500).json({ error: 'subject token could not be signed' });
    return;
  }

  // No caching anywhere: this is a short-lived credential.
  res.setHeader('cache-control', 'no-store');
  res.status(200).json({ token, expiresAt: payload.exp });
}
