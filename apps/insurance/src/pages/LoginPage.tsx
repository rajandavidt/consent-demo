// apps/insurance/src/pages/LoginPage.tsx — sign in, with the demo credentials on screen.
//
// The credentials are printed and one-click fillable on purpose. A demo whose password lives in a
// README fails the moment it is shown to someone who does not have the README.
//
// SPLIT LAYOUT, and the left panel is not decoration. This is the only screen with no sidebar and no
// chrome, which makes it the one place that can set a tone — and the only place that can explain what
// this demo IS to someone opening a link with no other context. So the brand panel carries the three
// things actually being demonstrated: one KYC record shared across two products, consent asked where
// data is collected, and a live policy rather than hardcoded copy.
//
// It collapses to a single column below `lg`, where the panel becomes a compact header — the same
// information in reading order, rather than a tall hero pushing the form off a phone screen.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, ShieldCheck, Users } from 'lucide-react';
import { Button, Field, InfoBanner, useToast } from '@finsecure/shared';
import { DEMO_USERS, login, useAuth } from '@finsecure/shared';

/**
 * What the demo is for.
 *
 * Kept in this file rather than the shared package: the insurance app tells the same story from its
 * own side, and one component with a `product` prop would read as neither product's voice.
 */
const HIGHLIGHTS = [
  {
    Icon: Users,
    title: 'KYC already done next door',
    body: 'Verified at FinSecure Bank? This side reads the same record — no second round of proof.',
  },
  {
    Icon: ShieldCheck,
    title: 'Consent asked where data is collected',
    body: 'Health answers used for underwriting are asked for at the point they are needed, not buried.',
  },
  {
    Icon: FileCheck2,
    title: 'Driven by a live policy',
    body: 'Purposes, legal bases and expiry windows come from the consent API, not from this app.',
  },
];

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

  // The split is 1.25 : 1 in the PANEL's favour, not the form's. It was 1 : 1.1, which gave the form
  // column ~995px on a 1900px screen to hold a 384px form — so the widest part of the page was empty
  // space and the layout read as unfinished rather than deliberate. The panel has a headline and three
  // explainer blocks to fill width with; the form does not, and stretching inputs to 900px is worse.
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* BRAND PANEL. The same navy the app chrome uses, so signing in does not feel like arriving at
          a different product than the one you land in. */}
      <aside className="from-shell-900 to-shell-950 relative flex flex-col justify-between overflow-hidden bg-gradient-to-b px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        {/* One soft brand glow. A single light source reads as depth; two read as a gradient mesh
            from a template. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-teal-500/20 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-[0_4px_12px_-2px_rgb(13_148_136/0.4)]">
              <ShieldCheck className="size-5 text-white" strokeWidth={2} aria-hidden />
            </span>
            <span>
              <span className="block text-sm leading-tight font-semibold text-white">FinSecure</span>
              <span className="text-2xs block leading-tight tracking-wider text-slate-400 uppercase">
                Insurance
              </span>
            </span>
          </div>

          <h1 className="mt-10 max-w-xl text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl">
            Cover, without the paperwork twice.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
            A working demo of Akku Consent inside an insurer — quotes, claims and a privacy centre
            reading one live policy.
          </p>

          {/* Hidden below `lg`: on a phone this would push the form itself off the first screen, and
              the point of the page is signing in. */}
          <ul className="mt-10 hidden max-w-lg space-y-5 lg:block">
            {HIGHLIGHTS.map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.07]">
                  <Icon className="size-4 text-teal-300" strokeWidth={1.9} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-2xs relative mt-10 hidden text-slate-500 lg:block">
          Nothing here is real. Every account, balance and verification is fabricated and never leaves
          this browser.
        </p>
      </aside>

      {/* FORM. Capped at a comfortable measure and centred in its own column, so a wide window gives
          the extra width to the panel rather than stretching the inputs. */}
      <main className="flex items-center justify-center px-6 py-10 sm:px-10 lg:py-14">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use a demo account below — no registration, no real data.
            </p>
          </div>

          {/* The honest disclosure, shown here only when the brand panel's version is hidden. It has
              to appear somewhere on every viewport: it is the sentence that stops someone treating
              this as a real bank. */}
          <div className="mb-6 lg:hidden">
            <InfoBanner tone="warning">
              <strong>Demo application.</strong> Every account, balance, document and verification
              here is fabricated and stored only in this browser.
            </InfoBanner>
          </div>

          <div className="space-y-4">
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
              <p role="alert" className="reveal text-sm font-medium text-rose-700">
                {error}
              </p>
            )}
            <Button onClick={submit} loading={busy} block>
              Sign in
            </Button>
          </div>

          {/* DEMO ACCOUNTS as pickable rows, not a footnote.
              On a demo this is the primary action — nobody types the address by hand — yet it was the
              quietest thing on the page: grey text with a small "Use" link. The whole row is the
              button now, so the target matches the size of the thing being chosen. The password is no
              longer printed: the row fills it, and showing it added nothing but noise. */}
          <div className="mt-8">
            <p className="text-2xs mb-2.5 font-semibold tracking-[0.12em] text-slate-400 uppercase">
              Demo accounts
            </p>
            <div className="space-y-2">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword(demo.password);
                  }}
                  className="focus-ring press border-border-subtle bg-surface hover:border-border-strong flex w-full items-center gap-3 rounded-control border px-3.5 py-3 text-left"
                >
                  <span className="grid size-9 bg-teal-50 text-teal-700 shrink-0 place-items-center rounded-full text-xs font-bold">
                    {demo.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {demo.name}
                    </span>
                    <span className="num block truncate text-xs text-slate-500">{demo.email}</span>
                  </span>
                  <span className="text-2xs shrink-0 font-semibold text-teal-700">Use</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
