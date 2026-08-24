# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Consent plane: authenticated, not anonymous

This app talks to Akku's **authenticated** consent plane (`/v1/a/:siteKey/*`), not the anonymous one
(`/v1/c/`). That needs a short-lived Ed25519 **Subject Token**, minted server-side by
[`api/subject-token.ts`](./api/subject-token.ts).

Why it matters, in one line each:

- The anonymous plane takes `subjectId` from a query string. Anyone can edit it in devtools and read
  or write another subject's consent. A user id from the browser is a **claim**, not a credential.
- The anonymous plane also returns decisions **without provenance** — no policy version, no
  timestamps (rule D6) — precisely *because* that id is guessable. Without provenance the SDK cannot
  tell "decided under the current policy" from "decided under a superseded one", so every surface
  re-asks on every load.

### Required environment variables

Set these on the deployment (Vercel → Settings → Environment Variables). They are **server-side
only** — do not prefix them with `VITE_`, or they end up in the browser bundle.

| Variable | Where it comes from |
|---|---|
| `AKKU_APP_ID` | The app id shown when you register the key (console → site → **App keys**) |
| `AKKU_SITE_KEY` | The site key (same value as `VITE_AKKU_SITE_KEY`) |
| `AKKU_APP_PRIVATE_KEY` | The **private** half of the Ed25519 pair, PEM. The console only ever stores the public half. |

### If you are copying this app

`resolveSubject()` in `api/subject-token.ts` **trusts the subject id the browser sends**, because
this demo has no real login — its "authentication" compares plaintext passwords held in
localStorage. That single function is the thing you must replace with your own session check,
returning 401 when there is no session. Copy it as-is and you have the same hole the authenticated
plane exists to close.
