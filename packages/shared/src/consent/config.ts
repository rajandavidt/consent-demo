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
} as const;

/** Without a site key there is nothing to read, which is a setup problem rather than a failure. */
export const AKKU_CONFIGURED =
  AKKU_CONFIG.siteKey.length > 0 && AKKU_CONFIG.apiHost.length > 0;
