// packages/shared/src/index.ts — one entry point, so an app never reaches into a subpath by hand.
//
// The framework-free half lives in `core.ts` and is re-exported here, so this list stays the SAME
// public API it always was while the Angular app can import the domain layer without React. See
// that file's header for the rule that keeps the split honest.
export * from './core.js';

export * from './otp/useOtp.js';
export * from './otp/OtpInput.js';
export * from './ui/index.js';
export * from './auth/AuthProvider.js';
export * from './consent/ConsentCentre.js';
export * from './consent/CollectionPointConsent.js';
export * from './consent/AmbientConsentAsk.js';
export * from './consent/config.js';
export * from './consent/policy-elements.js';
export * from './consent/AkkuProvider.js';

// Onboarding steps shared by both apps. The OTP logic is identical for a bank and an insurer, so it
// lives here; only the surrounding chrome and the next-step route differ per app.
export * from './onboarding/OnboardingLayout.js';
export * from './onboarding/VerifyMobile.js';
export * from './onboarding/VerifyEmail.js';
