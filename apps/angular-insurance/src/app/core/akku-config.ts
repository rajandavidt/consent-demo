// apps/angular-insurance/src/app/core/akku-config.ts — where the app points, and nothing about the policy.
//
// The Angular twin of @finsecure/shared's consent/config.ts, and the same rules apply: the site key
// is public by design (it resolves server-side to an org and a site and is never a secret), and
// NOTHING here has a default. A literal host would mean a checkout with no environment silently
// talking to one particular deployment — which is how a developer writes consent decisions into
// production while believing they are local. Absent is honest.
//
// The values arrive from `akku-env.generated.ts`, written by scripts/write-akku-env.mjs before the
// build. See that script for why Angular needs a generated file where Vite needs none.
import { AKKU_ENV } from './akku-env.generated';

export const AKKU_CONFIG = {
  apiHost: AKKU_ENV.apiHost,
  siteKey: AKKU_ENV.siteKey,
  /**
   * The registered application id (console -> site -> App keys), and the `iss` every Subject Token
   * carries.
   *
   * Safe in the browser bundle, and not a second copy of a secret: it is already inside every token
   * this app holds, and the SDK never puts it on the wire — the server reads `iss` from the signed
   * token instead. It is here because `new ConsentManager()` needs it at construction, before any
   * token exists.
   */
  appId: AKKU_ENV.appId,
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
