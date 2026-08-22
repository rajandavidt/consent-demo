// apps/banking/src/layout/AppShell.tsx — the chrome every signed-in screen sits inside.
//
// A sidebar on wide screens and a slide-over on narrow ones (§9 adaptive-navigation): a nav that
// stays a hamburger at 1600px wastes the space that makes a product feel like a product, and one
// that stays a fixed sidebar at 380px eats the content.
//
// The sidebar is navy rather than brand indigo on purpose. Chrome should recede — a full-height
// panel in the primary action colour makes every menu item compete with the page's actual CTA
// (§4 primary-action).
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  BadgeCheck,
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  completedCount,
  overallStatus,
  resetAll,
  STEP_SEQUENCE,
  useAuth,
} from '@finsecure/shared';

/** One icon family, one stroke width, one size token (§4 icon-style-consistent). */
const NAV = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Accounts', to: '/accounts', icon: CreditCard },
  { label: 'Payments', to: '/payments', icon: Send },
  { label: 'KYC & verification', to: '/kyc', icon: BadgeCheck },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Privacy & consent', to: '/privacy', icon: ShieldCheck },
  { label: 'Nominees', to: '/nominees', icon: Users },
  { label: 'Profile', to: '/profile', icon: UserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, kyc, signOut } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const kycStatus = kyc ? overallStatus(kyc) : 'not_started';
  const done = kyc ? completedCount(kyc) : 0;

  const nav = (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {NAV.map(({ label, to, icon: Icon }) => {
        const active = location.pathname === to || location.pathname.startsWith(to + '/');
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setDrawerOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={
              // min-h-11 = 44px, the touch-target floor. `relative` carries the active accent bar.
              //
              // --duration-instant on the hover tint, deliberately the fast end of the scale. A
              // sidebar is scanned WITH the pointer: you sweep down eight items looking for the one
              // you want, and at the 200ms default the trail of items still fading out behind the
              // cursor is more visible than the item currently under it. This is the clearest case
              // in either app for the instant tier.
              'focus-ring relative flex min-h-11 items-center gap-3 rounded-control px-3 text-sm transition-colors duration-[var(--duration-instant)] ' +
              (active
                ? 'bg-white/[0.09] font-semibold text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)]'
                : 'font-medium text-slate-400 hover:bg-white/[0.05] hover:text-slate-100')
            }
          >
            {/* The accent bar is what makes the selected item read as selected at a glance,
                without relying on the background tint alone. It grows out of the left edge
                rather than blinking on: React mounts and unmounts this span with the route, so there
                is no state for a transition to interpolate and an entrance keyframe is the only tool
                that works. `slide-in-from-left-2` reads as the marker sliding out from under the
                panel edge, which is where a "you are here" marker should come from. */}
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-500 animate-in slide-in-from-left-2 fade-in duration-[var(--duration-base)] ease-[var(--ease-out-quart)]" />
            )}
            <Icon
              className={'h-[18px] w-[18px] shrink-0 ' + (active ? 'text-brand-300' : '')}
              strokeWidth={1.75}
              aria-hidden
            />
            {label}
            {/* The badge is the nav's one job beyond navigation: tell someone mid-onboarding that
                there is work waiting, without them opening the page to find out (§9 tab-badge). */}
            {to === '/kyc' && kycStatus !== 'verified' && (
              <span className="num ml-auto rounded-full bg-status-pending px-1.5 py-0.5 text-2xs font-bold text-white">
                {done}/{STEP_SEQUENCE.length}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-5 py-5">
      <span className="btn-primary-surface grid h-9 w-9 place-items-center rounded-control">
        <ShieldCheck className="h-[18px] w-[18px] text-white" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight text-white">
          FinSecure
        </span>
        <span className="block text-2xs uppercase tracking-wider text-slate-400">
          Banking
        </span>
      </span>
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface-sunken">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-gradient-to-b from-shell-900 to-shell-950 lg:flex">
        {brand}
        {nav}
        <div className="border-t border-white/[0.07] p-3">
          <button
            type="button"
            onClick={() => {
              resetAll();
              window.location.href = '/login';
            }}
            className="focus-ring press flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <RotateCcw className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            Reset demo data
          </button>
        </div>
      </aside>

      {/* Mobile drawer. A scrim strong enough to isolate the panel (§6 scrim-and-modal-legibility). */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* The scrim fades and the panel slides, and they take the SAME duration on purpose: a
              scrim that finishes darkening before the panel arrives reads as two separate things
              happening, which is the single most common tell of a hand-rolled drawer.
              --duration-slow because this is the largest entrance in either app. */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]"
          />
          {/* `slide-in-from-left` (a full panel width) rather than the `-left-2` used on the nav
              accent bar: this element IS the thing that came from off-screen, so it should travel
              the whole distance rather than hint at it.
              NO EXIT ANIMATION, and that is a real gap rather than a choice — `drawerOpen &&` unmounts
              the panel synchronously, so there is nothing left on screen to animate out. Fixing it
              properly means Radix's Dialog or a presence wrapper holding the node through its exit,
              which is a structural change to the navigation and outside a presentation pass. */}
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-gradient-to-b from-shell-900 to-shell-950 shadow-overlay animate-in slide-in-from-left duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] pr-2">
              <div className="flex-1">{brand}</div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="focus-ring press grid h-11 w-11 place-items-center rounded-control text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="focus-ring press grid h-11 w-11 place-items-center rounded-control text-slate-600 hover:bg-surface-sunken lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <span className="rounded-pill bg-status-pending-soft px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-status-pending ring-1 ring-inset ring-status-pending/15">
              Demo data
            </span>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                aria-label="Notifications"
                className="focus-ring press relative grid h-11 w-11 place-items-center rounded-control text-slate-500 hover:bg-surface-sunken"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                {kycStatus !== 'verified' && (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-status-rejected ring-2 ring-white" />
                )}
              </button>

              <div className="flex items-center gap-2.5 rounded-control py-1 pl-1 pr-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {initials(user?.name ?? '')}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {user?.name}
                  </span>
                  <span className="block text-2xs capitalize text-slate-500">{user?.role}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                className="focus-ring press grid h-11 w-11 place-items-center rounded-control text-slate-500 hover:bg-surface-sunken hover:text-status-rejected"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
        </header>

        {/* FULL WIDTH — no max-width container.
            The densest screens here are wide by nature: a consent purpose card carries a name, a
            reason, an element, two actions and an expiry window on one row, and the KYC table has a
            status and an action per step. A 72rem cap forced those to wrap mid-button.
            Reading measure is protected where it matters instead of globally: prose and form fields
            keep their own narrower caps (a text input stretched to 1400px is unusable), so widening
            the shell gives the data-dense screens room without turning body copy into a single long
            line. */}
        {/* ROUTE TRANSITION, and it is deliberately the smallest one available.
            `key` on the pathname is what makes it work: React tears down the subtree and mounts a
            fresh one on every navigation, which re-fires the `reveal` keyframe. Without the key the
            same <main> node is reused and the animation runs exactly once, on first load.
            `reveal` (3px, --duration-base) rather than `reveal-block` (6px, --duration-slow). This is
            an app someone works inside, not a site they browse: they know they clicked Payments, so
            the transition's only job is to stop the swap being a hard cut. A page that visibly slides
            in on every click is charming twice and then it is the reason navigation feels slow —
            especially here, where routes are instant and the animation is the ONLY latency.
            It also cannot mask a load, because there is nothing to load. */}
        <main key={location.pathname} className="reveal w-full px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase();
}
