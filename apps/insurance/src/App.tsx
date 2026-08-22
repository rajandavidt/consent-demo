// apps/insurance/src/App.tsx — routes for the insurance app.
//
// Same guard and shell pattern as banking, and the same rule: only routes with real screens are
// declared. The session comes from the shared auth provider, so signing in here signs you in there.
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  AkkuProvider,
  AuthProvider,
  InfoBanner,
  ToastProvider,
  VerifyEmail,
  VerifyMobile,
  useAuth,
} from '@finsecure/shared';
import { AppShell } from './layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApplyPage from './pages/ApplyPage';
import KycPage from './pages/KycPage';
import PrivacyPage from './pages/PrivacyPage';
import PoliciesPage from './pages/PoliciesPage';
import ClaimsPage from './pages/ClaimsPage';
import NomineesPage from './pages/NomineesPage';
import DocumentsPage from './pages/DocumentsPage';

function Protected({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="p-8 text-sm text-slate-500">Restoring your session…</p>;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl">
      <InfoBanner tone="warning">
        <strong>Page not found.</strong> Use the navigation on the left.
      </InfoBanner>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        {/* Inside AuthProvider: the consent context is built for the SIGNED-IN customer. */}
        <AkkuProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <Protected>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/apply"
            element={
              <Protected>
                <AppShell>
                  <ApplyPage />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/kyc"
            element={
              <Protected>
                <AppShell>
                  <KycPage />
                </AppShell>
              </Protected>
            }
          />


          {/* Shared with banking: the OTP logic is identical, only the next step differs. Each step
              discloses what the element is used for, from the published policy. */}
          <Route
            path="/onboarding/mobile"
            element={
              <Protected>
                <AppShell>
                  <VerifyMobile nextRoute="/onboarding/email" />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/onboarding/email"
            element={
              <Protected>
                <AppShell>
                  <VerifyEmail nextRoute="/kyc" />
                </AppShell>
              </Protected>
            }
          />

          <Route
            path="/policies"
            element={
              <Protected>
                <AppShell>
                  <PoliciesPage />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/claims"
            element={
              <Protected>
                <AppShell>
                  <ClaimsPage />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/nominees"
            element={
              <Protected>
                <AppShell>
                  <NomineesPage />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/documents"
            element={
              <Protected>
                <AppShell>
                  <DocumentsPage />
                </AppShell>
              </Protected>
            }
          />

          <Route
            path="/privacy"
            element={
              <Protected>
                <AppShell>
                  <PrivacyPage />
                </AppShell>
              </Protected>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="*"
            element={
              <Protected>
                <AppShell>
                  <NotFound />
                </AppShell>
              </Protected>
            }
          />
            </Routes>
        </AkkuProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
