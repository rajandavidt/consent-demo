// apps/angular-insurance/src/app/pages/login.page.ts — sign in, with the demo credentials on screen.
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
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, FileCheck2, ShieldCheck, ShieldPlus, Users } from 'lucide-angular';
import { DEMO_USERS, login } from '@finsecure/shared/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly demoUsers = DEMO_USERS;

  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal<string | undefined>(undefined);
  readonly busy = signal(false);

  /**
   * What the demo is for.
   *
   * Kept in this file rather than the shared package: the insurance app tells the same story from
   * its own side, and one component with a `product` input would read as neither product's voice.
   */
  readonly highlights = [
    {
      icon: Users,
      title: 'KYC already done next door',
      body: 'Verified at FinSecure Bank? This side reads the same record — no second round of proof.',
    },
    {
      icon: ShieldCheck,
      title: 'Consent asked where data is collected',
      body: 'Health answers used for underwriting are asked for at the point they are needed, not buried.',
    },
    {
      icon: FileCheck2,
      title: 'Driven by a live policy',
      body: 'Purposes, legal bases and expiry windows come from the consent API, not from this app.',
    },
  ];

  readonly brandIcon = ShieldPlus;

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('');
  }

  fill(email: string, password: string): void {
    this.email.set(email);
    this.password.set(password);
  }

  submit(): void {
    this.busy.set(true);
    this.error.set(undefined);
    // The same deliberate 400ms the React app uses. Not a simulation of network latency for its own
    // sake: an instant transition makes a sign-in feel like a page that never checked anything.
    window.setTimeout(() => {
      const result = login(this.email(), this.password());
      this.busy.set(false);
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      this.auth.adopt(result.session);
      void this.router.navigate(['/dashboard']);
    }, 400);
  }
}
