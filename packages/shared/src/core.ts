// packages/shared/src/core.ts — everything both applications agree on that owes nothing to React.
//
// WHY THIS EXISTS. `index.ts` is the React entry point: it re-exports providers, hooks and
// components, so importing anything from it drags React in. That is fine for the two React apps and
// impossible for the Angular one, which shares the SAME localStorage schema, the SAME KYC record and
// the SAME demo users — requirement 12 (one app never re-asks for KYC another already collected)
// only holds while all three read one store, byte for byte.
//
// So the domain layer is listed HERE and `index.ts` re-exports it. One list, not two: a module added
// to the platform cannot end up visible to React and invisible to Angular by being forgotten in a
// second copy of this list.
//
// THE RULE FOR THIS FILE: nothing exported from here may import react, react-dom or react-router. A
// `.tsx` file belongs in `index.ts` instead.
export * from './storage/index.js';
export * from './kyc/types.js';
export * from './kyc/store.js';
export * from './seed.js';
export * from './util/mask.js';
export * from './util/validate.js';
export * from './auth/auth.js';

// NOT `consent/config.js`. That module reads `import.meta.env`, which is Vite's build-time
// substitution and not a language feature — in an Angular build the object is simply absent, so
// every value would come back empty and `AKKU_CONFIGURED` would be false with nothing to explain
// why. A module that silently reports "not configured" on one toolchain is worse than one that is
// not offered there at all, so each app supplies its own pointer to the Akku site and the shared
// layer stays free of any one bundler's magic.
