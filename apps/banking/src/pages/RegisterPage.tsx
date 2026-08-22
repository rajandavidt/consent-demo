// apps/banking/src/pages/RegisterPage.tsx — step 1 of requirement 1's flow.
//
// Creating the account is the "Account" step, and it is marked verified here rather than by a
// separate screen: registering IS completing it, and a step that exists only to say "you have
// registered" is the kind of empty screen requirement 19 rules out.
//
// Straight into mobile verification afterwards. A customer who has just chosen a password is in the
// middle of onboarding, not finished — dropping them on a dashboard makes them find their own way
// back.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Field,
  InfoBanner,
  hasErrors,
  register,
  setStepStatus,
  useAuth,
  useToast,
  validateEmail,
  validateRequired,
} from '@finsecure/shared';

export default function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const submit = () => {
    const found: Record<string, string | undefined> = {
      name: validateRequired(name, 'Full name'),
      email: validateEmail(email),
      // Stated as a rule, not enforced silently — a password field that rejects without saying why
      // is the most annoying form on the internet.
      password:
        password.length < 8
          ? 'Password must be at least 8 characters'
          : !/[A-Z]/.test(password)
            ? 'Include at least one capital letter'
            : !/[0-9]/.test(password)
              ? 'Include at least one number'
              : undefined,
      confirm: password !== confirm ? 'Passwords do not match' : undefined,
    };
    setErrors(found);
    if (hasErrors(found)) return;

    setBusy(true);
    window.setTimeout(() => {
      const result = register({ name, email, password });
      setBusy(false);
      if (!result.ok) {
        setErrors({ email: result.message });
        return;
      }
      // Registering completes the Account step — see the header.
      setStepStatus(result.user.id, 'account', 'verified');
      refresh();
      toast.success('Account created', 'Now let us verify your mobile number.');
      navigate('/onboarding/mobile');
    }, 600);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-sunken px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Open a FinSecure account
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Takes about five minutes. You can stop and come back at any point.
          </p>
        </div>

        <InfoBanner tone="warning">
          <strong>Demo application.</strong> Nothing you enter is sent anywhere or checked against
          any registry — it stays in this browser.
        </InfoBanner>

        <Card>
          <div className="space-y-4 px-6 py-6">
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              error={errors.name}
              placeholder="Rajan Kumar"
              required
            />
            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              placeholder="you@example.com"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              hint="At least 8 characters, with a capital letter and a number"
              required
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={setConfirm}
              error={errors.confirm}
              required
            />
            <Button onClick={submit} loading={busy} block>
              Create account &amp; continue
            </Button>
          </div>
          <div className="border-t border-border-subtle bg-surface-sunken px-6 py-3 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="focus-ring rounded font-semibold text-brand-600 hover:underline">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
