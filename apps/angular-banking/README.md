# FinSecure Banking — Angular

The same retail-bank demo as [`apps/banking`](../banking), rebuilt in Angular. It exists to answer
one question: **what does integrating Akku Consent look like outside React?**

## What is shared with the React app, and what is not

| Shared, byte for byte | Rebuilt here |
| --- | --- |
| The localStorage schema, KYC record, demo users, masking and validation — all from `@finsecure/shared/core` | The consent surfaces, because the SDK's React bindings do not apply |
| The design system — this app imports the same `theme.css`, so it is not a visual copy | The chrome and screens, in Angular components |

Requirement 12 (one product never re-asks for KYC another already collected) only holds while every
app reads one store. So the domain layer is imported, never reimplemented — a second idea of "what is
the KYC record" would be a second answer to that question.

## Why the SDK works here at all

`@akku-work/consent-auth` splits into a framework-free core and React bindings:

- **`@akku-work/consent-auth`** — `ConsentManager`, `PurposeState`, `resolvePurposeStates`. Plain
  TypeScript. Used directly by [`core/consent.service.ts`](src/app/core/consent.service.ts).
- **`@akku-work/consent-auth/ui`** — `renderPreferenceCenter`, plain DOM and ARIA, no framework.
- **`@akku-work/consent-auth/react`** — `useConsent`, `DisclosureModal`, `AskSnackbar`. Not usable
  here, and the only part this app had to rebuild.

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

No account, balance, document or verification came from a real bank or a real person. The only thing
that leaves the browser is a consent decision, and only when Akku is configured.
