// packages/shared/src/storage/index.ts — the only place this platform touches localStorage.
//
// WHY A LAYER AND NOT DIRECT CALLS. Two applications read and write the same thirteen stores, and
// requirement 12 says the insurance app must not re-ask for KYC the customer already gave banking.
// That only holds if both apps agree, byte for byte, on the key names and the record shapes — so
// they are declared once, here, and neither app is allowed a `localStorage.getItem` of its own.
//
// EVERY WRITE NOTIFIES. Requirement 19 asks that the UI update immediately after any change, and a
// plain write does not tell React anything happened. `write` publishes to in-page subscribers AND
// leans on the native `storage` event for other tabs, so opening banking and insurance side by side
// shows one KYC record changing in both.
//
// EVERYTHING HERE IS DEMO DATA. No value in any of these stores came from a real bank, a real
// registry or a real person, and nothing leaves the browser.

/** The thirteen stores. Named exactly as specified so the demo's devtools view is predictable. */
export const KEYS = {
  users: 'finsecure_users',
  session: 'finsecure_session',
  kyc: 'finsecure_kyc',
  otp: 'finsecure_otp',
  documents: 'finsecure_documents',
  nominees: 'finsecure_nominees',
  accounts: 'finsecure_accounts',
  transactions: 'finsecure_transactions',
  policies: 'finsecure_policies',
  claims: 'finsecure_claims',
  consents: 'finsecure_consents',
  auditLogs: 'finsecure_audit_logs',
  /**
   * Which CONSENT identity this browser is currently presenting, per demo user.
   *
   * Separate from `session` on purpose. The consent subject is derived server-side from the token's
   * `sub`, so presenting a new `sub` yields a brand-new subject with no consent history — which is
   * the only honest way to "reset consent" for a demo. The ledger is append-only and a recorded
   * decision is not something you un-record.
   *
   * It is NOT the user id, and must not be, or resetting consent would orphan that customer's
   * accounts, KYC and policies too. See consent/subject-identity.ts.
   */
  consentIdentity: 'finsecure_consent_identity',
} as const;

export type StoreKey = (typeof KEYS)[keyof typeof KEYS];

type Listener = (key: StoreKey) => void;
const listeners = new Set<Listener>();
let crossTabBound = false;

/**
 * Subscribe to changes in any store.
 *
 * Binds the cross-tab `storage` listener lazily on first use rather than at module load: a module
 * that attaches window listeners on import cannot be imported by a test or a server render.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (!crossTabBound && typeof window !== 'undefined') {
    crossTabBound = true;
    window.addEventListener('storage', (event) => {
      // `event.key` is null when a whole origin is cleared. Reported as the session store so every
      // subscriber re-reads, which is what a "reset demo data" from another tab should look like.
      const key = (event.key ?? KEYS.session) as StoreKey;
      for (const l of listeners) l(key);
    });
  }
  return () => listeners.delete(listener);
}

function announce(key: StoreKey): void {
  for (const listener of listeners) listener(key);
}

/**
 * Read a store, falling back to `fallback` when it is absent OR unparseable.
 *
 * A corrupt value returns the fallback rather than throwing. This is demo data in a browser a
 * developer has been poking at by hand: a stray character in devtools should not white-screen an
 * onboarding flow, and the console warning says what happened.
 */
export function read<T>(key: StoreKey, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`[storage] ${key} contained invalid JSON and was ignored`);
    return fallback;
  }
}

export function write<T>(key: StoreKey, value: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
  announce(key);
}

/** Read-modify-write in one call, so callers cannot forget to write the result back. */
export function update<T>(key: StoreKey, fallback: T, mutate: (current: T) => T): T {
  const next = mutate(read<T>(key, fallback));
  write(key, next);
  return next;
}

/** Wipes every store this platform owns — the "Reset demo data" action. */
export function resetAll(): void {
  if (typeof window === 'undefined') return;
  for (const key of Object.values(KEYS)) window.localStorage.removeItem(key);
  announce(KEYS.session);
}

/**
 * A short, human-readable id — `KYC-8F3A21`, `TXN-0C41BB`.
 *
 * Not a UUID on purpose: these ids are read aloud in a demo and typed into a search box, and a
 * 36-character hex string is hostile for both. Collisions do not matter in a single browser.
 */
export function nextId(prefix: string): string {
  const random = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

/** ISO timestamp, so stored records sort and display without a date library. */
export function nowIso(): string {
  return new Date().toISOString();
}
