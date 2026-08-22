// apps/insurance/src/pages/LoginPage.tsx — sign in, with the demo credentials on screen.
//
// The credentials are printed and one-click fillable on purpose. A demo whose password lives in a
// README fails the moment it is shown to someone who does not have the README.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, InfoBanner, useToast } from '@finsecure/shared';
import { DEMO_USERS, login, useAuth } from '@finsecure/shared';

export default function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    setBusy(true);
    setError(undefined);
    window.setTimeout(() => {
      const result = login(email, password);
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      refresh();
      toast.success('Signed in', 'Welcome back to FinSecure Insurance.');
      navigate('/dashboard');
    }, 400);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">FinSecure Insurance</h1>
          <p className="mt-1 text-sm text-slate-600">Demo insurance platform — sign in to continue</p>
        </div>

        <InfoBanner tone="warning">
          <strong>Demo application.</strong> Every account, balance, document and verification here
          is fabricated and stored only in this browser.
        </InfoBanner>

        <Card>
          <div className="space-y-4 px-6 py-6">
            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />
            {error && (
              <p role="alert" className="text-sm font-medium text-rose-700">
                {error}
              </p>
            )}
            <Button onClick={submit} loading={busy} block>
              Sign in
            </Button>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Demo accounts
            </p>
            <div className="space-y-2">
              {DEMO_USERS.map((demo) => (
                <div key={demo.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{demo.name}</p>
                    <p className="truncate font-mono text-xs text-slate-500">
                      {demo.email} / {demo.password}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(demo.email);
                      setPassword(demo.password);
                    }}
                    className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
