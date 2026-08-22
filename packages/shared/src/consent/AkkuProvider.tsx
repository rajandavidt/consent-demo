// packages/shared/src/consent/AkkuProvider.tsx — mounts Akku's consent context for the signed-in user.
//
// Keyed on the session, not built once at module scope: a consent record belongs to the person who is
// logged in, so the manager has to be rebuilt when they change — otherwise one customer's decisions
// are read and written under another's identity the moment a second person uses the same browser.
//
// Keyed on `session` rather than `user` because the router renders protected pages as soon as the
// session exists, while `user` is loaded separately. Keying on `user` would leave a window with no
// provider, and `useConsent` throws outside one by design — so a consent surface would take the whole
// page down during a session restore.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ConsentProvider } from '@akku-work/consent-auth/react';
import { useAuth } from '../auth/AuthProvider.js';
import { AKKU_CONFIG, AKKU_CONFIGURED } from './config.js';
import { createLivePublicManager } from './live-manager.js';

export function AkkuProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  const manager = useMemo(() => {
    if (!AKKU_CONFIGURED || !session?.userId) return null;
    return createLivePublicManager({
      apiHost: AKKU_CONFIG.apiHost,
      siteKey: AKKU_CONFIG.siteKey,
      subjectId: session.userId,
    });
  }, [session?.userId]);

  // Children render untouched when there is no subject or no site key: every consent surface in these
  // apps lives behind login, and mounting a provider without either fires a read that can only fail.
  if (!manager) return <>{children}</>;
  return <ConsentProvider manager={manager}>{children}</ConsentProvider>;
}
