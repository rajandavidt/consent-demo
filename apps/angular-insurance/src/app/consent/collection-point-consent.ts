// apps/angular-insurance/src/app/consent/collection-point-consent.ts — consent at the moment data is
// collected.
//
// A preference centre answers "what have I agreed to?" long after the fact. This answers the question
// at the only moment the person is actually thinking about it: as they type the detail in. It is the
// Angular counterpart of the SDK's React `<DisclosureModal/>`.
//
// TWO THINGS IT DOES THAT A HAND-ROLLED BLOCK GETS WRONG:
//
//   1. It separates what is DISCLOSED (necessary, legal obligation) from what is ASKED (consent). A
//      legal obligation rests on the statute — presenting it with Allow and Reject buttons offers a
//      choice that does not exist.
//   2. It renders nothing once there is nothing left to ask. So it appears the first time someone
//      reaches the step and never nags them again.
//
// THE PURPOSES COME FROM THE RESOLVED STATES, each of which carries its own `elementKey`. Grouping on
// that and never on a prefix parsed off the key: `email.marketing` happens to be readable, but a key is
// an opaque identifier and a site is free to publish `mktg_2024` against the email element. Parsing the
// string works on this policy and silently mis-groups the next one.
//
// NOTHING IS RECORDED UNTIL SAVE. The buttons build a local draft; dismissing writes nothing at all, so
// walking away is not turned into a decision either way (Rule #5).
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { PurposeState } from '@akku-work/consent-auth';
import { ConsentService } from '../core/consent.service';
import { LegalBasisPill, PurposeKeyMeta, ReasonBanner } from './purpose-parts';

@Component({
  selector: 'akku-collection-point-consent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LegalBasisPill, PurposeKeyMeta, ReasonBanner],
  templateUrl: './collection-point-consent.html',
})
export class CollectionPointConsent {
  private readonly consent = inject(ConsentService);

  /** The policy's element key — `phone`, `email`, `health`. Its purposes are looked up, never listed. */
  readonly element = input.required<string>();
  /** Recorded against every decision, so the ledger says WHERE the person was asked. */
  readonly source = input.required<string>();
  readonly title = input('How your data will be used');

  /** Fires once the visitor has answered, or dismissed without answering. */
  readonly done = output<void>();

  /** Local, unsaved answers. Absent means unanswered — which is why this is not a boolean map default. */
  private readonly draft = signal<Record<string, boolean>>({});
  readonly busy = signal(false);

  private readonly forElement = computed(() =>
    (this.consent.states() ?? []).filter((state) => state.elementKey === this.element()),
  );

  /**
   * The `consent` purposes on this element still needing an answer.
   *
   * `states()` is `undefined` until the first read completes, and this is empty until then — so the
   * question cannot be asked before the answer is available. Asking too early is how a surface
   * silently discloses nothing.
   */
  readonly asking = computed(() =>
    this.consent.toAsk(this.forElement().map((state) => state.key)),
  );

  /** Disclosed, not asked: shown so the person can see it, with no control attached. */
  readonly fixed = computed(() =>
    this.forElement().filter((state) => state.legalBasis !== 'consent'),
  );

  readonly answeredCount = computed(() => Object.keys(this.draft()).length);

  /** True when this surface has something to say. An element the policy attaches nothing to renders
   * nothing at all — inventing something to show would be worse than silence. */
  readonly visible = computed(() => this.asking().length > 0);

  readonly saveLabel = computed(() => {
    const count = this.answeredCount();
    if (count === 0) return 'Save';
    return `Save ${count} choice${count === 1 ? '' : 's'}`;
  });

  answerOf(state: PurposeState): boolean | undefined {
    return this.draft()[state.key];
  }

  set(purposeKey: string, granted: boolean): void {
    this.draft.update((current) => ({ ...current, [purposeKey]: granted }));
  }

  async save(): Promise<void> {
    const decisions = this.draft();
    if (Object.keys(decisions).length === 0) return;
    this.busy.set(true);
    try {
      await this.consent.record(decisions, this.source());
      this.done.emit();
    } catch {
      // Left on screen with the draft intact. The service holds the message; taking the step down
      // over a failed consent write is exactly what Rule #1 forbids.
    } finally {
      this.busy.set(false);
    }
  }

  /** Writes nothing. Deciding later is a valid answer to "not now", and must not be recorded as one. */
  dismiss(): void {
    this.done.emit();
  }
}
