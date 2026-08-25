// apps/angular-insurance/src/app/consent/ambient-consent-ask.ts — for a purpose with no moment of
// collection.
//
// WHY THIS EXISTS ALONGSIDE CollectionPointConsent. A collection point works because there IS a
// moment: someone is typing a phone number, so that is when to ask what the phone number may be used
// for. Analytics and personalisation have no such moment — nobody ever "enters" their device data.
// Those purposes get published, prompted nowhere, and are answerable only by a visitor who goes
// looking in the preference centre. A consent that is only reachable by searching for it is not really
// being asked for.
//
// So this asks ambiently, on a screen the person is already on. The Angular counterpart of the SDK's
// `<AskSnackbar/>`, and deliberately without an auto-dismiss timer: a snackbar that fades into a
// decision turns inaction into consent, or into a refusal nobody made.
//
// ONE AT A TIME, and that is the whole restraint of it. The element may carry several pending
// purposes; showing them together makes a dashboard visit feel like a form, and showing them in
// sequence makes it feel like nagging. The first pending one is asked, the rest wait for another visit.
//
// `role="status"`, NOT `alert`. This is passive by design, and an alert role would interrupt a
// screen-reader user mid-sentence — the exact interruption the surface exists to avoid.
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ConsentService } from '../core/consent.service';
import { LegalBasisPill } from './purpose-parts';

@Component({
  selector: 'akku-ambient-consent-ask',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LegalBasisPill],
  templateUrl: './ambient-consent-ask.html',
})
export class AmbientConsentAsk {
  private readonly consent = inject(ConsentService);

  /** The policy's element key — `device`. Its purposes are looked up, never listed here. */
  readonly element = input.required<string>();
  readonly source = input.required<string>();

  readonly busy = signal(false);
  /** Set by "Later". Local only, and never written — see the header: inaction records nothing. */
  private readonly hidden = signal(false);

  /**
   * The first purpose on this element still needing an answer.
   *
   * `needsDecision` is the SDK's own resolved outcome, so an expired or policy-changed decision
   * correctly comes back round while a settled one stays quiet — this component makes no judgement of
   * its own about either. Filtering to `consent` as well, because a legal obligation is disclosed
   * rather than asked and has no place in a surface with Allow and No-thanks buttons.
   */
  readonly pending = computed(() => {
    if (this.hidden()) return undefined;
    return (this.consent.states() ?? []).find(
      (state) =>
        state.elementKey === this.element() &&
        state.legalBasis === 'consent' &&
        state.needsDecision,
    );
  });

  async answer(granted: boolean): Promise<void> {
    const state = this.pending();
    if (state === undefined) return;
    this.busy.set(true);
    try {
      await this.consent.decide(state.key, granted, this.source());
    } catch {
      // Stays on screen. The service holds the message, and a failed consent write must not take a
      // dashboard down (Rule #1).
    } finally {
      this.busy.set(false);
    }
  }

  /** Hides the snackbar for this visit and records NOTHING. */
  later(): void {
    this.hidden.set(true);
  }
}
