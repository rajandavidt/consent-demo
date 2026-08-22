// packages/shared/src/consent/live-manager.ts — a ConsentManager over Akku's PUBLIC plane.
//
// WHY THIS EXISTS, GIVEN TWO OFFICIAL PACKAGES ALREADY DO SOMETHING LIKE IT.
//
// `@akku-work/consent-sdk` is the browser/CDN package: core state plus surfaces, where the surface
// layer (`SurfaceDeps.openDialog`) comes from the CDN bundle. Imported into a bundled React app its
// `showPreferences()` is a silent no-op, because nothing supplies that layer. Found by calling it and
// getting no DOM and no error.
//
// `@akku-work/consent-auth/react` has the React surfaces — the ones that belong in this app — but they
// are driven by a ConsentManager from `consent-sdk-auth`, which targets the AUTHENTICATED plane and
// therefore needs a registered application key and a backend minting subject tokens. This demo has no
// backend, and the previous app's token server and signing key were deleted with it.
//
// So: the SDK's React surfaces, the SDK's own resolver, and the public plane for transport. The only
// bespoke code here is two documented HTTP calls. Everything that decides BEHAVIOUR — which purposes
// exist, their legal bases, expiry, re-ask and re-confirm — comes from the API and from
// `resolvePurposeStates`, not from this file.
//
// WHAT THE PUBLIC PLANE COSTS, STATED PLAINLY. There is no server-asserted subject: the app supplies
// the subject id, so a determined visitor could claim another id. On the authenticated plane the
// backend puts `sub` in a signed token and the browser gets no say. This is the correct public-plane
// model for a cookie-banner-style integration and the wrong one for a bank — it is used here because
// it is what a backend-less demo can honestly run, not because it is the recommendation.
import {
  resolvePurposeStates,
  type ConsentManager,
  type Purpose,
  type PurposeState,
  generateIdempotencyKey,
} from '@akku-work/consent-auth';

/** One data element as the policy publishes it. */
export interface PolicyElement {
  key: string;
  label: string;
  description?: string;
  displayOrder?: number;
}

interface PublicConfig {
  policyVersionId: string;
  purposes?: Purpose[];
  elements?: PolicyElement[];
}

/**
 * Builds a manager for one subject against one site.
 *
 * The config is cached per manager instance: the published policy does not change mid-session, and
 * re-fetching it on every surface open would put a network round trip in front of a dialog opening.
 * Decisions are NOT cached — those change, and a stale read would show a customer a choice they had
 * already altered.
 */
/**
 * The elements from the last config read, keyed by element key.
 *
 * Populated as a side effect of the manager's own config fetch rather than by a second request:
 * `getPurposeStates` already has the document in hand, and asking the API twice for one payload to
 * keep the code tidier is the wrong trade.
 *
 * A module-level map is acceptable here because a browser session talks to exactly one site. It
 * would not be if a host ever pointed two managers at two different site keys.
 */
const publishedElements = new Map<string, PolicyElement>();

/**
 * Purpose keys grouped by the element they apply to, from the last config read.
 *
 * The grouping uses each purpose's own `elementKey` — NOT a prefix parsed off the key. `email.marketing`
 * happens to be readable, but a key is an opaque identifier and a site is free to publish
 * `mktg_2024` against the email element. Parsing the string would work on this policy and silently
 * mis-group the next one.
 */
const purposesByElement = new Map<string, string[]>();

/**
 * WORKAROUND for a gap in the PUBLIC plane: decision provenance, kept host-side.
 *
 * `GET /v1/c/:siteKey/consent` returns `{ decisions }` and nothing else — no `policyVersionId`, no
 * timestamps (API-043/D6). But `promptDecision` needs both: without a policy version it takes
 * `undefined !== current` as "decided under a superseded policy" and returns `re-confirm` forever,
 * so a saved decision can NEVER become `silent` and every surface re-asks on every load.
 *
 * So the host remembers what it necessarily knew at write time — which policy version it wrote
 * against, and when — and merges that over the server's decisions on read. The DECISIONS still come
 * from the server and are never invented here; only the provenance the endpoint declines to return
 * is local.
 *
 * This belongs on the server. Kept narrow and named loudly so it is deleted when the API returns
 * provenance, rather than quietly becoming the way this works.
 */
interface LocalProvenance {
  policyVersionId: string;
  decidedAt: Record<string, string>;
}

const PROVENANCE_KEY = 'finsecure_consent_provenance';

function readProvenance(subject: string): LocalProvenance | undefined {
  try {
    const raw = window.localStorage.getItem(`${PROVENANCE_KEY}:${subject}`);
    return raw === null ? undefined : (JSON.parse(raw) as LocalProvenance);
  } catch {
    // A quota error or a hand-edited value must not stop consent being served (Rule #1).
    return undefined;
  }
}

function writeProvenance(subject: string, policyVersionId: string, keys: string[]): void {
  const existing = readProvenance(subject);
  const at = new Date().toISOString();
  const decidedAt = { ...(existing?.policyVersionId === policyVersionId ? existing.decidedAt : {}) };
  for (const key of keys) decidedAt[key] = at;
  try {
    window.localStorage.setItem(
      `${PROVENANCE_KEY}:${subject}`,
      JSON.stringify({ policyVersionId, decidedAt } satisfies LocalProvenance),
    );
  } catch {
    // Same reason: losing the cache costs a redundant re-ask, never the decision itself.
  }
}

/**
 * Every published purpose that applies to one data element, in published order.
 *
 * Empty until the first successful config read — which is why a caller must gate on the provider's
 * `states` being non-null rather than calling this on mount. An empty array is also the honest
 * answer for an element the policy attaches nothing to: a collection point with no published
 * purposes has nothing to disclose, and inventing something to show would be worse than silence.
 */
export function purposeKeysForElement(elementKey: string): string[] {
  return purposesByElement.get(elementKey) ?? [];
}

/** Element labels from the published policy, in `displayOrder`. Empty until the first read. */
export function policyElements(): Record<string, { label: string; description?: string }> {
  const out: Record<string, { label: string; description?: string }> = {};
  const ordered = [...publishedElements.values()].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );
  for (const el of ordered) {
    out[el.key] = el.description === undefined
      ? { label: el.label }
      : { label: el.label, description: el.description };
  }
  return out;
}

export function createLivePublicManager(options: {
  apiHost: string;
  siteKey: string;
  subjectId: string;
}): ConsentManager {
  const { apiHost, siteKey, subjectId } = options;
  const base = `${apiHost.replace(/\/$/, '')}/v1/c/${encodeURIComponent(siteKey)}`;
  const listeners = new Set<() => void>();
  let configCache: PublicConfig | null = null;

  async function loadConfig(): Promise<PublicConfig> {
    if (configCache) return configCache;
    const res = await fetch(`${base}/config`);
    if (!res.ok) throw new Error(`consent config responded ${res.status}`);
    configCache = (await res.json()) as PublicConfig;
    return configCache;
  }

  async function loadDecisions(): Promise<{
    decisions: Record<string, boolean>;
    decidedAt?: Record<string, string>;
    policyVersionId?: string;
  }> {
    const res = await fetch(`${base}/consent?subjectId=${encodeURIComponent(subjectId)}`);
    // A 404 means "no record for this subject", which is a legitimate first visit and not an error.
    if (res.status === 404) return { decisions: {} };
    if (!res.ok) throw new Error(`consent state responded ${res.status}`);
    return (await res.json()) as { decisions: Record<string, boolean> };
  }

  const manager = {
    getPurposeStates: async (now?: Date): Promise<PurposeState[]> => {
      const [config, stored] = await Promise.all([loadConfig(), loadDecisions()]);
      const purposes = config.purposes ?? [];
      // Kept so a host can label "Applies to …" from the policy rather than restating it.
      for (const el of config.elements ?? []) publishedElements.set(el.key, el);
      // Regrouped from scratch on every read: a purpose REMOVED from the policy has to disappear
      // from its element, and merging into the previous map would keep serving it forever.
      purposesByElement.clear();
      for (const p of purposes) {
        const element = p.elementKey;
        if (element === undefined) continue;
        const list = purposesByElement.get(element);
        if (list === undefined) purposesByElement.set(element, [p.key]);
        else list.push(p.key);
      }
      // The SDK's own resolver, so expiry / re-ask / re-confirm match production exactly rather than
      // being this file's approximation of them.
      // The server's decisions, with the provenance it does not return supplied from the local
      // record of our own writes. Absent provenance still resolves — it just yields `re-confirm`,
      // which is the safe direction to be wrong in: it asks again rather than assuming consent.
      const local = readProvenance(subjectId);
      const withProvenance =
        Object.keys(stored.decisions).length > 0
          ? {
              ...stored,
              ...(local === undefined
                ? {}
                : { policyVersionId: local.policyVersionId, decidedAt: local.decidedAt }),
            }
          : undefined;

      return resolvePurposeStates(purposes, withProvenance, config.policyVersionId, now);
    },

    recordDecisions: async (decisions: Record<string, boolean>): Promise<void> => {
      const config = await loadConfig();
      const res = await fetch(`${base}/consent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          // v2 of the payload contract (packages/contracts/schemas/consent-payload.v2.json). This
          // used to post a v1-shaped body with no `action` and no `idempotencyKey`, which the API
          // rejected 422 on every save — consent could be READ but never WRITTEN, and the surface
          // simply re-appeared on the next load as though the visitor had never answered.
          //
          // `withdraw` when every value in the delta is false, `update` otherwise. Deliberately not
          // `grant`: this map is a DELTA, so an all-true payload is still "these particular purposes
          // changed", not a banner-wide accept — and `grant` would overstate a two-purpose save.
          action: Object.values(decisions).every((granted) => !granted) ? 'withdraw' : 'update',
          decisions,
          policyVersionId: config.policyVersionId,
          // ONE key per user action. A retried POST with the same key returns the existing event
          // rather than splitting into per-purpose events.
          idempotencyKey: generateIdempotencyKey(),
          // REQUIRED in v2: the capture surface, as a screen-label slug.
          //
          // A CONSTANT, and that is a known limitation rather than a choice: the React surfaces each
          // take a `source` prop but the provider's `record(decisions)` does not forward it to the
          // manager, so this layer cannot tell a privacy-centre save from an onboarding one. Every
          // event on this demo therefore lands under one label. Fixing it properly means widening
          // the SDK's ConsentManager signature.
          source: 'finsecure-demo',
        }),
      });
      if (!res.ok) throw new Error(`recording consent responded ${res.status}`);
      // Only after the append succeeded: provenance for a write the ledger rejected would claim a
      // decision that does not exist.
      writeProvenance(subjectId, config.policyVersionId, Object.keys(decisions));
      for (const listener of listeners) listener();
    },

    onChange: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  // ConsentProvider's prop is typed as the ConsentManager CLASS, which has private fields — so no
  // object literal can satisfy it structurally, however complete. The provider only ever calls the
  // three methods above; that is read from the published `dist/index.js`, not assumed.
  return manager as unknown as ConsentManager;
}
