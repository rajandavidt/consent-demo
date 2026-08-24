// packages/shared/src/index.ts — one entry point, so an app never reaches into a subpath by hand.
export * from './storage/index.js';
export * from './kyc/types.js';
export * from './kyc/store.js';
export * from './otp/useOtp.js';
export * from './otp/OtpInput.js';
export * from './seed.js';
export * from './util/mask.js';
export * from './util/validate.js';
export * from './ui/index.js';
export * from './auth/auth.js';
export * from './auth/AuthProvider.js';
export * from './consent/ConsentCentre.js';
export * from './consent/CollectionPointConsent.js';
export * from './consent/config.js';
export * from './consent/policy-elements.js';
export * from './consent/AkkuProvider.js';

// Onboarding steps shared by both apps. The OTP logic is identical for a bank and an insurer, so it
// lives here; only the surrounding chrome and the next-step route differ per app.
export * from './onboarding/OnboardingLayout.js';
export * from './onboarding/VerifyMobile.js';
export * from './onboarding/VerifyEmail.js';
