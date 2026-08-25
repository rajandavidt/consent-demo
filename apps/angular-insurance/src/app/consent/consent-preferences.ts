// apps/angular-insurance/src/app/consent/consent-preferences.ts — the standing "what have I agreed
// to" panel.
//
// The Angular counterpart of the SDK's React `<ConsentPreferences/>`, rebuilt because the React
// bindings cannot be used here. Same markup, same class names, same partitioning rules — see
// `purpose-parts.ts` for why the class names are copied rather than invented.
//
// WHY NOT `@akku-work/consent-auth/ui`. The SDK ships `renderPreferenceCenter`, which is genuinely
// framework-free DOM and would have saved this file. It takes `PreferenceItem[]`, whose `granted` is a
// plain boolean — and a boolean cannot express "granted, but the decision lapsed" or "granted, under a
// policy since replaced". Both of those are `granted: false` in the purpose model WITH an outcome that
// says why, and the two mistakes point in opposite directions: one re-prompts somebody needlessly, the
// other treats a stale consent as current. So this renders from `PurposeState` instead. That gap is
// the single most useful thing to fix in an Angular support package, and it is recorded here rather
// than worked around silently.
//
// IT NAMES NO PURPOSES. Not one key, label, legal basis or expiry window is written in this file.
// Every row comes from the published policy. Restating a policy in app code is how a screen ends up
// confidently telling a customer something untrue about their own data.
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { PurposeState } from '@akku-work/consent-auth';
import { ConsentService } from '../core/consent.service';
import { PolicyElementsService } from '../core/policy-elements.service';
import { ConsentToggle, LegalBasisPill, PurposeKeyMeta, ReasonBanner } from './purpose-parts';

@Component({
  selector: 'akku-consent-preferences',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConsentToggle, LegalBasisPill, PurposeKeyMeta, ReasonBanner],
  templateUrl: './consent-preferences.html',
})
export class ConsentPreferences {
  private readonly consent = inject(ConsentService);
  private readonly policyElements = inject(PolicyElementsService);

  /** Stamped on every decision recorded from this screen, so provenance survives into the ledger. */
  readonly source = input('consent-preferences');

  readonly busy = signal(false);
  readonly error = this.consent.error;
  /** `undefined` until the first read completes — which is NOT the same as an empty policy. */
  readonly states = this.consent.states;

  /**
   * Three buckets, by OUTCOME rather than by `granted`.
   *
   *  - `fixed`   — disclosed, never asked: `necessary` and `legal_obligation`.
   *  - `settled` — decided, fresh, under the current policy.
   *  - `open`    — everything else: never asked, lapsed, or taken under a superseded policy.
   *
   * Partitioning on `granted` instead would put a lapsed consent in with the settled ones and never
   * ask again.
   */
  private readonly buckets = computed(() => {
    const open: PurposeState[] = [];
    const settled: PurposeState[] = [];
    const fixed: PurposeState[] = [];
    for (const state of this.states() ?? []) {
      if (state.outcome === 'disclose') fixed.push(state);
      else if (state.outcome === 'silent') settled.push(state);
      else open.push(state);
    }
    return { open, settled, fixed };
  });

  readonly open = computed(() => this.buckets().open);
  readonly settled = computed(() => this.buckets().settled);
  readonly fixed = computed(() => this.buckets().fixed);

  /** Everything the customer actually has a say over. */
  readonly decidable = computed(() => [...this.buckets().open, ...this.buckets().settled]);

  readonly allowedCount = computed(() => this.decidable().filter((s) => s.granted).length);
  readonly declinedCount = computed(() => this.settled().filter((s) => !s.granted).length);
  readonly nothingGranted = computed(() => this.decidable().every((s) => !s.granted));

  /**
   * The element label for a purpose, so a row can say what the decision is ABOUT.
   *
   * Falls back to the element key, and the key falls back to a prefix parsed off the purpose key —
   * which is what the SDK itself does for a v1 policy that had no element model at all. On a v2 policy
   * `elementKey` is always present and the parsing never runs.
   */
  elementLabel(state: PurposeState): string {
    return this.policyElements.labelFor(this.elementKeyOf(state));
  }

  private elementKeyOf(state: PurposeState): string {
    if (state.elementKey !== undefined && state.elementKey !== '') return state.elementKey;
    const dot = state.key.indexOf('.');
    return dot > 0 ? state.key.slice(0, dot) : state.key;
  }

  async answer(purposeKey: string, granted: boolean): Promise<void> {
    await this.run(() => this.consent.decide(purposeKey, granted, this.source()));
  }

  /**
   * Withdraws every optional consent currently granted.
   *
   * Sent as one delta of explicit `false` values rather than calling the server's withdraw-all: this
   * panel knows exactly which purposes it is showing as granted, and a decision recorded from this
   * screen should carry this screen's `source` into the ledger. The server-authoritative
   * `withdrawAllOptional` remains on the service for a caller that wants it.
   */
  async withdrawAll(): Promise<void> {
    const grantedKeys = this.decidable()
      .filter((state) => state.granted)
      .map((state) => state.key);
    if (grantedKeys.length === 0) return;
    await this.run(() =>
      this.consent.record(
        Object.fromEntries(grantedKeys.map((key) => [key, false])),
        this.source(),
      ),
    );
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await work();
    } catch {
      // Swallowed here on purpose. The service has already recorded the message on `error`, which the
      // template renders — and a rejected promise escaping a click handler would take the page down
      // over a consent write, which Rule #1 forbids.
    } finally {
      this.busy.set(false);
    }
  }
}
