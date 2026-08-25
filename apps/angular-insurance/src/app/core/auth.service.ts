// apps/angular-insurance/src/app/core/auth.service.ts — session state, and the KYC record hanging off it.
//
// The Angular counterpart of @finsecure/shared's AuthProvider, and deliberately NOT a port of its
// storage logic: `getSession`, `getKyc` and the rest are imported from the same shared module the
// React apps call. Requirement 12 (one app never re-asks for KYC another already collected) holds
// only while every app reads one store, byte for byte — a second implementation of "what is the
// session" would be a second answer to that question.
//
// WHAT IS ANGULAR-SHAPED HERE, and only this: React re-read the stores by bumping a counter that
// invalidated a `useMemo`. Signals make the same idea explicit — `version` is that counter, and
// `user`/`kyc` are computed from it, so one `refresh()` re-reads everything that depends on storage
// and nothing that does not.
import { Injectable, computed, effect, signal } from '@angular/core';
import {
  KEYS,
  getKyc,
  getSession,
  getUser,
  logout as authLogout,
  seedUsers,
  setStepStatus,
  subscribe,
  type KycRecord,
  type Session,
  type User,
} from '@finsecure/shared/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Bumped on every storage change; everything read from localStorage is computed off it. */
  private readonly version = signal(0);
  private readonly sessionState = signal<Session | null>(null);
  private readonly readyState = signal(false);

  readonly session = this.sessionState.asReadonly();
  /** False until the first localStorage read completes, so the guard does not redirect prematurely. */
  readonly ready = this.readyState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  readonly user = computed<User | null>(() => {
    this.version();
    const session = this.sessionState();
    return session ? (getUser(session.userId) ?? null) : null;
  });

  readonly kyc = computed<KycRecord | null>(() => {
    this.version();
    const session = this.sessionState();
    return session ? getKyc(session.userId) : null;
  });

  constructor() {
    seedUsers();
    this.sessionState.set(getSession());
    this.readyState.set(true);

    // Re-read whenever the session or KYC store changes, including from another tab. Narrowed to
    // those two keys so a transaction write does not invalidate every screen.
    subscribe((key) => {
      if (key === KEYS.session || key === KEYS.kyc) this.refresh();
    });

    // The "Account" step is completed by HAVING an account — you cannot be signed in without one.
    // Left at not_started, the dashboard renders a "Start" link to a step with no screen behind it.
    //
    // Guarded on the current status so this writes at most once: the write triggers a storage
    // change, which refreshes this service, at which point the step is already verified and the
    // effect is a no-op. Without the guard that is an infinite loop.
    effect(() => {
      const session = this.sessionState();
      const kyc = this.kyc();
      if (session && kyc && kyc.steps.account.status !== 'verified') {
        setStepStatus(session.userId, 'account', 'verified');
      }
    });
  }

  /** Re-reads every store-backed signal. Called after any write this app makes. */
  refresh(): void {
    this.version.update((n) => n + 1);
  }

  /** Adopts a session produced by `login()` or `register()` from the shared module. */
  adopt(session: Session): void {
    this.sessionState.set(session);
    this.refresh();
  }

  signOut(): void {
    authLogout();
    this.sessionState.set(null);
    this.refresh();
  }
}
