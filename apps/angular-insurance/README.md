# FinSecure Insurance — Angular

The insurer half of the FinSecure demo, built in **Angular** while
[`apps/banking`](../banking) is built in **React**.

That difference is the point. Both apps target the same Akku site key, the same published policy and
the same customer. So the demo does not merely claim the SDK is framework-agnostic — it shows one
consent decision crossing between a React product and an Angular one, which is the situation a real
enterprise with a mixed front-end estate is actually in.

## What is shared, and what is honestly not

| Genuinely shared at runtime | Shared only as code |
| --- | --- |
| **The consent decision.** It lives in the Akku ledger, both products use the same site key, and both derive the same subject from the same signed-in customer. This crosses origins because it is server-side. | The KYC record, session and demo users. Same schema and same module (`@finsecure/shared/core`) — but localStorage is scoped to an ORIGIN, and the two apps are served from different ones. |

The second row is worth stating plainly rather than glossing: "insurance never re-asks for the KYC
banking collected" holds when both apps are opened from the same origin. Across two deployments it is
the *consent* that travels, not the KYC record. Nothing in this repo synchronises localStorage across
origins, and pretending otherwise in a demo would be the wrong kind of impressive.

## Why the SDK works here at all

`@akku-work/consent-auth` splits into a framework-free core and React bindings:

- **`@akku-work/consent-auth`** — `ConsentManager`, `PurposeState`, `resolvePurposeStates`. Plain
  TypeScript. Used directly by [`core/consent.service.ts`](src/app/core/consent.service.ts).
- **`@akku-work/consent-auth/ui`** — `renderPreferenceCenter`, plain DOM and ARIA, no framework.
- **`@akku-work/consent-auth/react`** — `useConsent`, `DisclosureModal`, `AskSnackbar`. Not usable
  here, and the only part this app had to rebuild.

The SDK needed no change to support Angular. That finding is what the planned Angular support package
is designed around.

## Running it

```bash
cp .env.example .env.local   # then fill in the three values
pnpm dev
```

Without those values the app still builds and runs, and reports itself unconfigured — a consent
surface is never what breaks a page (Rule #1). `AKKU_APP_ID` is the one most often missing; without
it the authenticated plane cannot be used at all.

### Why there is a generated file

Vite substitutes `import.meta.env.VITE_*` at build time, which is how the React apps learn which Akku
site they point at. Angular has no equivalent, and `angular.json` is static JSON that cannot read
`process.env`. So [`scripts/write-akku-env.mjs`](scripts/write-akku-env.mjs) writes
`src/app/core/akku-env.generated.ts` before `ng serve` and `ng build`. It is gitignored, and it has no
defaults — a committed hostname is how somebody writes consent decisions into production believing
they are local.

## Everything here is demo data

No policy, quote, claim, document or verification came from a real insurer or a real person. The only
thing that leaves the browser is a consent decision, and only when Akku is configured.
