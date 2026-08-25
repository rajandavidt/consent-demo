// apps/insurance/src/config.ts — where the banking app lives.
//
// WHY THIS EXISTS. Four screens link into the banking app, because banking OWNS the capture: KYC,
// documents and nominees are collected there and read here. All four hardcoded
// `http://localhost:5200`, and banking runs on 5173 — so every one of those links was dead.
//
// That failure is worse than an ordinary broken link. The whole claim of this app is that it already
// knows who the customer is because the record is shared; a dead "Continue in FinSecure Bank" button
// reads as the sharing being broken rather than as a wrong port number. It looked like a
// product failure and was a typo.
//
// A DEFAULT IS FINE HERE, unlike the Akku values in `consent/config.ts`, which deliberately have
// none. The worst case for this one is a link to nothing; the worst case there is writing consent
// decisions into somebody's production site while believing you are local. Different stakes, different
// rule.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

/**
 * The banking app's origin, with no trailing slash.
 *
 * Set `VITE_BANKING_URL` for a deployment; the default is banking's own dev port, so a fresh checkout
 * works with both apps running locally and no environment file at all.
 */
export const BANKING_URL = (env.VITE_BANKING_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

/** A path inside the banking app, e.g. `bankingLink('/kyc')`. Keeps the four call sites from each
 * having their own opinion about slashes. */
export function bankingLink(path: string): string {
  return BANKING_URL + (path.startsWith('/') ? path : '/' + path);
}
