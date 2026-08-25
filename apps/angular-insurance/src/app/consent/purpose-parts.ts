// apps/angular-insurance/src/app/consent/purpose-parts.ts — the small pieces every consent surface
// shares: the legal-basis pill, the re-ask reason, the key/expiry line, and the toggle.
//
// THE MARKUP IS NOT ORIGINAL, AND THAT IS THE POINT. Every class name here — `akku-pill`,
// `akku-reason`, `akku-key-meta`, `akku-toggle` — is one the SDK's own `styles.css` already targets.
// The stylesheet ships framework-free, so reusing the class names means the Angular surfaces are
// styled by the SDK rather than by a second set of styles maintained here, and they look identical to
// the React app's without a single duplicated rule. Rename one of these and the surface silently
// loses its styling; that is the trade, and it is worth it.
//
// WHAT IS ANGULAR-SHAPED: these are components rather than functions, because a template cannot call
// a render function. Nothing else differs.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { LegalBasis, PromptOutcome, PurposeState } from '@akku-work/consent-auth';

@Component({
  selector: 'akku-legal-basis-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="akku-pill akku-pill--{{ basis() }}" [attr.data-basis]="basis()">{{ label() }}</span>
  `,
})
export class LegalBasisPill {
  readonly basis = input.required<LegalBasis>();

  /** Spelled out, because `legal_obligation` is not a phrase anybody says. */
  readonly label = computed(() => {
    const basis = this.basis();
    if (basis === 'necessary') return 'necessary';
    if (basis === 'legal_obligation') return 'legal obligation';
    return 'consent';
  });
}

/**
 * Why a purpose is being asked about AGAIN.
 *
 * The two cases are deliberately worded differently. An expired decision is a fresh question — the
 * previous answer simply ran out. A superseded policy is a re-confirmation of something already
 * agreed to, under terms that have changed. Collapsing them into one message would either alarm
 * somebody whose choice merely lapsed, or quietly re-take consent under new terms.
 */
@Component({
  selector: 'akku-reason-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (outcome() === 're-ask') {
      <p class="akku-reason akku-reason--expired">
        Your last choice has expired, so we’re asking again.
      </p>
    } @else if (outcome() === 're-confirm') {
      <p class="akku-reason akku-reason--stale-policy">
        Our privacy policy has changed. Please confirm your choice.
      </p>
    }
  `,
})
export class ReasonBanner {
  readonly outcome = input.required<PromptOutcome>();
}

/**
 * The purpose key, and how long a decision on it stands.
 *
 * The expiry window is shown only for a `consent` purpose. A `necessary` or `legal_obligation` purpose
 * has no decision to expire, so "no expiry" against one would imply a permission was granted forever
 * when none was ever asked for.
 */
@Component({
  selector: 'akku-purpose-key-meta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="akku-key-meta">
      <code class="akku-key">{{ state().key }}</code>
      @if (window() !== null) {
        <span class="akku-key-window"> · {{ window() }}</span>
      }
    </span>
  `,
})
export class PurposeKeyMeta {
  readonly state = input.required<PurposeState>();

  readonly window = computed(() => {
    const state = this.state();
    if (state.legalBasis !== 'consent') return null;
    return state.validityDays === null ? 'no expiry' : `re-asked after ${state.validityDays} days`;
  });
}

/**
 * The switch, as a `role="switch"` button rather than a checkbox.
 *
 * `aria-checked` carries the state and the visual track is `aria-hidden` — so a screen reader hears
 * "switch, on" and never the decorative markup that draws it.
 */
@Component({
  selector: 'akku-consent-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      class="akku-toggle"
      (click)="changed.emit(!checked())"
    >
      <span class="akku-toggle__track" aria-hidden="true">
        <span class="akku-toggle__thumb"></span>
      </span>
    </button>
  `,
})
export class ConsentToggle {
  readonly checked = input.required<boolean>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly changed = output<boolean>();
}
