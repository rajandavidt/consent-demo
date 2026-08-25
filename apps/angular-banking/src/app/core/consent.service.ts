// apps/angular-banking/src/app/core/consent.service.ts — Akku's consent context for the signed-in user.
//
// This is the Angular replacement for @finsecure/shared's AkkuProvider AND for the SDK's own
// ConsentProvider/useConsent React bindings. The SDK's CORE (`@akku-work/consent-auth`) is plain
// TypeScript with no framework in it at all, which is the whole reason an Angular app can use it:
// only the React *bindings* are unavailable here, and a binding is a small thing to rebuild.
//
// KEYED ON THE SIGNED-IN SUBJECT. A consent record belongs to the person who is logged in, so the
// manager is rebuilt when they change — otherwise one customer's decisions are read and written
// under another's identity the moment a second person uses the same browser. `computed` gives that
// for free: the manager is derived from the session, so it cannot outlive it.
//
// THE AUTHENTICATED PLANE, NOT THE ANONYMOUS ONE. `ConsentManager` talks to `/v1/a/:siteKey/*` with
// a signed Subject Token. Two things follow:
//
//   - The subject cannot be spoofed from devtools. The server derives it from the token's
//     signature, so editing an id in the browser proves nothing.
//   - Decisions come back WITH provenance — `policyVersionId`, `updatedAt` — which the anonymous
//     plane withholds on purpose (rule D6) because a bare subject id is guessable. That provenance
//     is what lets the SDK tell "decided under the current policy" from "decided under a superseded
//     one", so there is no local cache here and no re-asking on every load.
//
// NOTHING IN THIS FILE NAMES A PURPOSE. No key, no label, no legal basis, no expiry window. Every
// one of those is read from what the console published; a list here would be this app's opinion of
// somebody else's policy, and it would be wrong the first time an operator changed it.
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ConsentManager, type PurposeState } from '@akku-work/consent-auth';
import { AuthService } from './auth.service';
import { AKKU_CONFIG, AKKU_CONFIGURED } from './akku-config';
import { fetchSubjectToken } from './subject-token';

@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly auth = inject(AuthService);

  private readonly statesState = signal<PurposeState[] | undefined>(undefined);
  private readonly errorState = signal<string | null>(null);
  private readonly busyState = signal(false);

  /**
   * Every published purpose, joined with this subject's decisions and resolved to an outcome.
   *
   * `undefined` means "not read yet", which is NOT the same as an empty list. A surface that treats
   * the two alike asks its question before the answer has arrived — so every consent component here
   * renders nothing until this is defined.
   */
  readonly states = this.statesState.asReadonly();

  /**
   * The last read or write error, for a screen that wants to say what went wrong.
   *
   * Never thrown at a consent surface: Rule #1 — consent is never what breaks the page.
   */
  readonly error = this.errorState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly configured = AKKU_CONFIGURED;
  readonly apiHost = AKKU_CONFIG.apiHost;

  /**
   * The manager for the CURRENT subject, or null when there is nobody signed in or no configuration.
   *
   * Built with the SDK's constructor, which validates synchronously and throws on a malformed setup.
   * That throw is caught rather than allowed to escape a `computed`: an unconfigured demo should say
   * so on screen, not white-screen the router.
   */
  private readonly manager = computed<ConsentManager | null>(() => {
    const session = this.auth.session();
    if (!AKKU_CONFIGURED || !session?.userId) return null;
    const subjectId = session.userId;
    try {
      return new ConsentManager({
        apiHost: AKKU_CONFIG.apiHost,
        siteKey: AKKU_CONFIG.siteKey,
        applicationId: AKKU_CONFIG.appId,
        // The name and email go to OUR endpoint, which signs them into the token's `attrs` claim.
        // They are deliberately NOT part of the consent payload: the authenticated plane reads
        // attributes from the verified token and never from the body, so a browser cannot put one
        // person's name against another person's consent.
        //
        // `untracked` because this callback runs long after the computed settled, and reading a
        // signal inside it must not make the manager itself depend on the name — the manager is
        // keyed on the subject, and rebuilding it on a name change would drop an in-flight read.
        // The token still carries the identity as it is NOW, because the read happens at mint time.
        getSubjectToken: () =>
          untracked(() =>
            fetchSubjectToken({
              subjectId,
              name: this.auth.user()?.name ?? '',
              email: this.auth.session()?.email ?? '',
            }),
          ),
      });
    } catch (cause) {
      this.errorState.set(cause instanceof Error ? cause.message : String(cause));
      return null;
    }
  });

  constructor() {
    // One read per subject. The effect re-runs when the manager changes — that is, when somebody
    // signs in or out — and clears the states in between so no screen shows the previous person's
    // decisions for the moment before the new read lands.
    effect(() => {
      const manager = this.manager();
      this.statesState.set(undefined);
      if (manager === null) return;
      void this.read(manager);
    });
  }

  private async read(manager: ConsentManager): Promise<void> {
    try {
      const states = await manager.getPurposeStates();
      // Guard against a stale read: if the subject changed while this was in flight, the manager is
      // no longer the current one and these decisions belong to the previous person.
      if (untracked(() => this.manager()) !== manager) return;
      this.statesState.set(states);
      this.errorState.set(null);
    } catch (cause) {
      if (untracked(() => this.manager()) !== manager) return;
      this.errorState.set(cause instanceof Error ? cause.message : String(cause));
      // An empty list rather than `undefined`: the read is FINISHED, it simply found nothing. Left
      // undefined, every surface would wait forever for a read that has already failed.
      this.statesState.set([]);
    }
  }

  /**
   * Re-reads the subject's purposes.
   *
   * For a refresh button or a focus handler: the SDK's `onChange` only fires for writes THIS manager
   * made and says nothing about a decision the same person made in another tab.
   */
  async refresh(): Promise<void> {
    const manager = untracked(() => this.manager());
    if (manager !== null) await this.read(manager);
  }

  /**
   * Records decisions for one or more purposes.
   *
   * A DELTA merged over the subject's current decisions, never a replacement — that is the SDK's own
   * behaviour, and the reason a surface that asked about one purpose cannot wipe the answers to the
   * others. `source` is carried through to the ledger so the record says WHERE the person was asked.
   */
  async record(decisions: Record<string, boolean>, source: string): Promise<void> {
    const manager = untracked(() => this.manager());
    if (manager === null) return;
    this.busyState.set(true);
    try {
      await manager.recordDecisions(decisions, { source });
      await this.read(manager);
    } catch (cause) {
      this.errorState.set(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      this.busyState.set(false);
    }
  }

  /**
   * Replaces the subject's decisions wholesale — a preference-centre form submit.
   *
   * The SDK rejects a `required` purpose explicitly set to false locally, BEFORE any write.
   */
  async savePreferences(decisions: Record<string, boolean>): Promise<void> {
    const manager = untracked(() => this.manager());
    if (manager === null) return;
    this.busyState.set(true);
    try {
      await manager.savePreferences(decisions);
      await this.read(manager);
    } catch (cause) {
      this.errorState.set(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      this.busyState.set(false);
    }
  }

  /**
   * Server-authoritative withdrawal.
   *
   * This app never sends a decisions map — the server decides which purposes count as optional, the
   * same way it always has.
   */
  async withdrawAllOptional(): Promise<void> {
    const manager = untracked(() => this.manager());
    if (manager === null) return;
    this.busyState.set(true);
    try {
      await manager.withdrawAllOptional();
      await this.read(manager);
    } catch (cause) {
      this.errorState.set(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      this.busyState.set(false);
    }
  }

  /**
   * The purposes attached to one data element, as a signal.
   *
   * Grouped on each purpose's own `elementKey`, NEVER on a prefix parsed off the key.
   * `email.marketing` happens to be readable, but a key is an opaque identifier and a site is free to
   * publish `mktg_2024` against the email element — parsing the string works on this policy and
   * silently mis-groups the next one.
   */
  statesForElement(elementKey: string) {
    return computed(() => (this.states() ?? []).filter((state) => state.elementKey === elementKey));
  }
}
