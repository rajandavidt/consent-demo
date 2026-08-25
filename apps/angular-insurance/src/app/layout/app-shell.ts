// apps/angular-insurance/src/app/layout/app-shell.ts — the insurance app's chrome.
//
// Same structure as the banking shell, deliberately: one platform, and a customer moving between the
// two products should not have to relearn where anything is. What differs is the wordmark and the
// accent on the brand tile — enough to know which product you are in, not enough to feel like a
// different company. That it is written in Angular and banking is written in React is precisely the
// thing a visitor should NOT be able to tell.
//
// A sidebar on wide screens and a slide-over on narrow ones: a nav that stays a hamburger at 1600px
// wastes the space that makes a product feel like a product, and one that stays a fixed sidebar at
// 380px eats the content.
//
// The sidebar is navy rather than brand indigo on purpose. Chrome should recede — a full-height panel
// in the primary action colour makes every menu item compete with the page's actual call to action.
//
// THE KYC BADGE READS FROM THE SHARED RECORD. If someone completed onboarding in the banking app,
// this sidebar shows it as done without the insurance app collecting anything — see
// `app-shell.html`'s header note for the one caveat about which browser origin that holds in.
//
// A PARENT ROUTE, not a wrapper repeated on every screen. The React app spells out
// `<Protected><AppShell>…</AppShell></Protected>` eighteen times; Angular can hang the guard and the
// chrome on one parent and let `<router-outlet>` fill in. Fewer places for one screen to be
// accidentally left unguarded.
import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import {
  BadgeCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  ListRestart,
  LogOut,
  LucideAngularModule,
  Menu,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  ShieldPlus,
  Users,
  X,
} from 'lucide-angular';
import {
  STEP_SEQUENCE,
  completedCount,
  overallStatus,
  resetAll,
  resetVerification,
} from '@finsecure/shared/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterOutlet, LucideAngularModule, NgTemplateOutlet],
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly drawerOpen = signal(false);
  readonly stepCount = STEP_SEQUENCE.length;

  readonly icons = {
    menu: Menu,
    close: X,
    brand: ShieldPlus,
    signOut: LogOut,
    resetVerification: ListRestart,
    resetAll: RotateCcw,
  };

  /** One icon family, one stroke width, one size token. */
  readonly nav = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Buy a policy', to: '/apply', icon: ShieldPlus },
    { label: 'My policies', to: '/policies', icon: ScrollText },
    { label: 'Claims', to: '/claims', icon: HeartPulse },
    { label: 'KYC status', to: '/kyc', icon: BadgeCheck },
    { label: 'Nominees', to: '/nominees', icon: Users },
    { label: 'Documents', to: '/documents', icon: FileText },
    { label: 'Privacy & consent', to: '/privacy', icon: ShieldCheck },
  ];

  /**
   * The current path, as a signal.
   *
   * Seeded with `router.url` rather than starting empty: the first navigation has already happened by
   * the time this component exists, so a stream of future events alone would leave every nav item
   * unselected until the person clicked something.
   */
  readonly path = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  isActive(to: string): boolean {
    const current = this.path();
    return current === to || current.startsWith(to + '/');
  }

  /** How far through onboarding this customer is — the sidebar's one job beyond navigation is to say
   * there is work waiting, without them opening the page to find out. */
  kycDone(): number {
    const kyc = this.auth.kyc();
    return kyc ? completedCount(kyc) : 0;
  }

  kycVerified(): boolean {
    const kyc = this.auth.kyc();
    return (kyc ? overallStatus(kyc) : 'not_started') === 'verified';
  }

  initials(name: string | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '—';
    return (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  /**
   * Puts every verification step back to not-started, so the onboarding flow can be walked again.
   *
   * A full reload rather than a signal refresh, and deliberately: the person is very likely standing
   * mid-flow on a step that is about to stop existing, and re-entering the router from a clean state
   * is more honest than re-rendering a screen whose data was just deleted underneath it.
   */
  resetVerification(): void {
    const user = this.auth.user();
    if (!user) return;
    resetVerification(user.id);
    this.auth.refresh();
    window.location.reload();
  }

  /** Wipes every store, including the session — so this necessarily lands on the login screen. */
  resetDemoData(): void {
    resetAll();
    window.location.href = '/login';
  }

  signOut(): void {
    this.auth.signOut();
    void this.router.navigate(['/login']);
  }
}
