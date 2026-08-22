// packages/shared/src/auth/AuthProvider.tsx — session context, and the KYC record that hangs off it.
//
// The KYC record lives here rather than in each page because almost every screen needs it: the
// dashboard shows its status, the onboarding steps advance it, and the guard uses it to decide where
// to send someone mid-flow. Reading it once and re-reading on every storage change means a step
// completed in one tab updates the sidebar in the other.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getKyc, setStepStatus } from '../kyc/store.js';
import { subscribe, KEYS } from '../storage/index.js';
import type { KycRecord } from '../kyc/types.js';
import {
  getSession,
  getUser,
  logout as authLogout,
  seedUsers,
  type Session,
  type User,
} from './auth.js';

interface AuthValue {
  session: Session | null;
  user: User | null;
  kyc: KycRecord | null;
  isAuthenticated: boolean;
  /** False until the first localStorage read completes, so guards do not redirect prematurely. */
  ready: boolean;
  refresh: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    seedUsers();
    setSession(getSession());
    setReady(true);
  }, [tick]);

  // Re-read whenever the session or KYC store changes, including from another tab. Narrowed to
  // those two keys so a transaction write does not re-render every screen.
  useEffect(
    () =>
      subscribe((key) => {
        if (key === KEYS.session || key === KEYS.kyc) refresh();
      }),
    [refresh],
  );

  const user = useMemo(() => (session ? getUser(session.userId) ?? null : null), [session, tick]);
  const kyc = useMemo(() => (session ? getKyc(session.userId) : null), [session, tick]);

  // The "Account" step is completed by HAVING an account — you cannot be signed in without one. It
  // was previously left at not_started for seeded users, which made the dashboard render a "Start"
  // link to a step with no screen behind it. Marking it here fixes the cause rather than adding a
  // page whose only content would be "yes, you have an account".
  //
  // Guarded on the current status so this writes at most once: the write triggers a storage change,
  // which refreshes this provider, at which point the step is already verified and the effect is a
  // no-op. Without the guard that is an infinite loop.
  useEffect(() => {
    if (session && kyc && kyc.steps.account.status !== 'verified') {
      setStepStatus(session.userId, 'account', 'verified');
    }
  }, [session, kyc]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user,
      kyc,
      isAuthenticated: session !== null,
      ready,
      refresh,
      signOut: () => {
        authLogout();
        setSession(null);
        refresh();
      },
    }),
    [session, user, kyc, ready, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
