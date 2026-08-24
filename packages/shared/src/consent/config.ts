// packages/shared/src/consent/config.ts — where the app points, and nothing about the policy.
//
// The site key is public by design: it resolves server-side to an org and site and is never a secret.
// It is read from the environment rather than committed, so a checkout cannot silently point at
// somebody else's site.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const AKKU_CONFIG = {
  // NO DEFAULT, deliberately. A literal host here means a checkout with no environment
  // silently talks to one particular deployment — which is how a developer ends up writing
  // consent decisions into production while believing they are local. Absent is honest.
  apiHost: env.VITE_AKKU_API_HOST ?? '',
  siteKey: env.VITE_AKKU_SITE_KEY ?? '',
  /**
   * The registered application id (console -> site -> App keys), and the `iss` every Subject Token
   * carries.
   *
   * Safe in the browser bundle, and not a second copy of a secret: it is already inside every token
   * this app holds, and the SDK never puts it on the wire — the server reads `iss` from the signed
   * token instead. It is here because `new ConsentManager()` needs it at construction, before any
   * token exists.
   */
  appId: env.VITE_AKKU_APP_ID ?? '',
} as const;

/**
 * Without all three there is nothing to read, which is a setup problem rather than a failure.
 *
 * `appId` counts: the authenticated plane cannot be used without it, and a build missing it would
 * otherwise construct a manager that throws on its first call rather than saying plainly that it is
 * unconfigured.
 */
export const AKKU_CONFIGURED =
  AKKU_CONFIG.siteKey.length > 0 && AKKU_CONFIG.apiHost.length > 0 && AKKU_CONFIG.appId.length > 0;
