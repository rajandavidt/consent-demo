// apps/banking/src/App.tsx — routes and the authenticated shell.
//
// Only routes whose screens actually exist are declared. A placeholder route rendering "coming soon"
// is exactly the empty-form problem requirement 19 rules out, and it makes an unfinished app look
// finished — so an unbuilt step says so plainly instead of pretending to be a form.
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import { AppShell } from './layout/AppShell';
import {
  AkkuProvider,
  VerifyEmail,
  VerifyMobile,
  AuthProvider,
  InfoBanner,
  ToastProvider,
  useAuth,
} from '@finsecure/shared';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PanStep from './onboarding/PanStep';
import AadhaarStep from './onboarding/AadhaarStep';
import PersonalStep from './onboarding/PersonalStep';
import AddressStep from './onboarding/AddressStep';
import NomineeStep from './onboarding/NomineeStep';
import DocumentsStep from './onboarding/DocumentsStep';
import ConsentStep from './onboarding/ConsentStep';
import KycPage from './pages/KycPage';
import PrivacyPage from './pages/PrivacyPage';
import SdkGalleryPage from './pages/SdkGalleryPage';
import RegisterPage from './pages/RegisterPage';
import AccountsPage from './pages/AccountsPage';
import PaymentsPage from './pages/PaymentsPage';
import ProfilePage from './pages/ProfilePage';
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
          <Route path="/register" element={<RegisterPage />} />

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
                  <VerifyEmail nextRoute="/onboarding/pan" />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/onboarding/pan"
            element={
              <Protected>
                <AppShell>
                  <PanStep />
                </AppShell>
              </Protected>
            }
          />

          <Route
            path="/onboarding/aadhaar"
            element={
              <Protected>
                <AppShell>
                  <AadhaarStep />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/onboarding/personal"
            element={
              <Protected>
                <AppShell>
                  <PersonalStep />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/onboarding/address"
            element={
              <Protected>
                <AppShell>
                  <AddressStep />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/onboarding/nominee"
            element={
              <Protected>
                <AppShell>
                  <NomineeStep />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/onboarding/documents"
            element={
              <Protected>
                <AppShell>
                  <DocumentsStep />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/onboarding/consent"
            element={
              <Protected>
                <AppShell>
                  <ConsentStep />
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

          <Route
            path="/accounts"
            element={
              <Protected>
                <AppShell>
                  <AccountsPage />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/payments"
            element={
              <Protected>
                <AppShell>
                  <PaymentsPage />
                </AppShell>
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <AppShell>
                  <ProfilePage />
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

          <Route
            path="/sdk-gallery"
            element={
              <Protected>
                <AppShell>
                  <SdkGalleryPage />
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
