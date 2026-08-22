// packages/shared/src/kyc/types.ts — the one KYC record both applications read and write.
//
// This is the file that makes requirement 12 true. The insurance app does not have its own idea of
// who the customer is: it reads THIS record, finds mobile/email/PAN/Aadhaar/address already
// verified, and skips straight to what it actually needs (medical details, sum assured, nominee
// allocation). Nothing is asked twice because there is only one place the answer could live.
//
// STEP STATUS IS PER STEP, NOT ONE OVERALL FLAG. Requirement 6 lists six statuses, and a single
// `kycComplete: boolean` cannot express "PAN verified, Aadhaar rejected, address pending" — which is
// the interesting state, the one a status page exists to show, and the one an insurance application
// has to refuse to proceed on.

/** Requirement 6's six statuses, used per step and for the overall roll-up. */
export type VerificationStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired';

/** The ten onboarding steps, in order. The array order IS the flow order — see STEP_SEQUENCE. */
export type OnboardingStep =
  | 'account'
  | 'mobile'
  | 'email'
  | 'pan'
  | 'kyc'
  | 'personal'
  | 'address'
  | 'nominee'
  | 'documents'
  | 'consent';

export interface StepState {
  status: VerificationStatus;
  /** When this step last reached `verified`. Absent until it does. */
  verifiedAt?: string;
  /** Why a step is `rejected`, shown on the KYC status page. */
  reason?: string;
}

export interface MobileDetails {
  /** Stored in full because the app must be able to re-send an OTP; NEVER rendered unmasked. */
  number: string;
}

export interface EmailDetails {
  address: string;
}

export interface PanDetails {
  /** Full PAN, rendered only through maskPan. */
  number: string;
  nameOnPan: string;
  dateOfBirth: string;
}

export interface AadhaarDetails {
  /**
   * Full Aadhaar, rendered only through maskAadhaar.
   *
   * Kept at all only so the masked form can show the true last four digits. A production system
   * would keep a reference token from the registry and never the number itself — noted here because
   * this demo's storage choice is the one thing on this screen that should NOT be copied.
   */
  number: string;
}

export interface PersonalDetails {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | '';
  nationality: string;
  occupation: string;
  annualIncome: string;
  sourceOfIncome: string;
}

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface AddressDetails {
  permanent: Address;
  /** True when the customer ticked "same as permanent" — `current` is then a copy, not a reference. */
  currentSameAsPermanent: boolean;
  current: Address;
  status: VerificationStatus;
}

export interface ConsentDeclaration {
  informationCorrect: boolean;
  identityVerification: boolean;
  personalDataProcessing: boolean;
  termsAccepted: boolean;
  privacyPolicyRead: boolean;
  /** When the declaration was submitted. Absent until all mandatory boxes were ticked. */
  acceptedAt?: string;
}

/** The whole record, one per user id. */
export interface KycRecord {
  userId: string;
  steps: Record<OnboardingStep, StepState>;
  mobile?: MobileDetails;
  email?: EmailDetails;
  pan?: PanDetails;
  aadhaar?: AadhaarDetails;
  personal?: PersonalDetails;
  address?: AddressDetails;
  consent?: ConsentDeclaration;
  updatedAt: string;
}

/** The flow order from requirement 1, and the source of the progress indicator's numbering. */
export const STEP_SEQUENCE: OnboardingStep[] = [
  'account',
  'mobile',
  'email',
  'pan',
  'kyc',
  'personal',
  'address',
  'nominee',
  'documents',
  'consent',
];

/** Labels for the ten-step progress indicator in requirement 1. */
export const STEP_LABELS: Record<OnboardingStep, string> = {
  account: 'Account',
  mobile: 'Mobile',
  email: 'Email',
  pan: 'PAN',
  kyc: 'KYC',
  personal: 'Personal',
  address: 'Address',
  nominee: 'Nominee',
  documents: 'Documents',
  consent: 'Consent',
};

/** The route each step is collected on, so "resume where you left off" is a lookup, not a switch. */
export const STEP_ROUTES: Record<OnboardingStep, string> = {
  account: '/register',
  mobile: '/onboarding/mobile',
  email: '/onboarding/email',
  pan: '/onboarding/pan',
  kyc: '/onboarding/aadhaar',
  personal: '/onboarding/personal',
  address: '/onboarding/address',
  nominee: '/onboarding/nominee',
  documents: '/onboarding/documents',
  consent: '/onboarding/consent',
};

export const STATUS_LABELS: Record<VerificationStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
};
