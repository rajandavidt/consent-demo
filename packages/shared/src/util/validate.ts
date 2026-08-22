// packages/shared/src/util/validate.ts — the real validation requirement 19 insists on.
//
// "Do not create forms with only labels and empty fields" is the whole point of this file. Every
// validator returns a MESSAGE or undefined rather than a boolean, because a form that knows a field
// is wrong but not why can only render "Invalid" — and that is the kind of form the requirement is
// complaining about.
//
// The formats are the genuine Indian ones (PAN, Aadhaar, IFSC, pincode), so the demo rejects what a
// real system would reject. The VERIFICATION behind them is simulated; the format checking is not.

export type FieldError = string | undefined;

/** PAN: five letters, four digits, one letter — `ABCDE1234F`. */
export function validatePan(value: string): FieldError {
  const clean = value.toUpperCase().trim();
  if (!clean) return 'PAN is required';
  if (clean.length !== 10) return 'PAN must be exactly 10 characters';
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(clean)) {
    return 'PAN must look like ABCDE1234F — five letters, four digits, one letter';
  }
  return undefined;
}

/**
 * Aadhaar: twelve digits, and the first may not be 0 or 1.
 *
 * The leading-digit rule is real (UIDAI does not issue numbers starting 0 or 1), and it is worth
 * enforcing because it is the check a hand-typed test value most often fails — catching it here is
 * the difference between "invalid Aadhaar" and a confusing success.
 */
export function validateAadhaar(value: string): FieldError {
  const digits = value.replace(/\s/g, '');
  if (!digits) return 'Aadhaar number is required';
  if (!/^[0-9]{12}$/.test(digits)) return 'Aadhaar must be 12 digits';
  if (/^[01]/.test(digits)) return 'Aadhaar cannot begin with 0 or 1';
  return undefined;
}

/** Indian mobile: ten digits starting 6–9. Accepts and ignores +91 / spaces. */
export function validateMobile(value: string): FieldError {
  const digits = value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (!digits) return 'Mobile number is required';
  if (digits.length !== 10) return 'Mobile number must be 10 digits';
  if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers start with 6, 7, 8 or 9';
  return undefined;
}

export function validateEmail(value: string): FieldError {
  const clean = value.trim();
  if (!clean) return 'Email address is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return 'Enter a valid email address';
  return undefined;
}

export function validatePincode(value: string): FieldError {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 'PIN code is required';
  if (!/^[1-9][0-9]{5}$/.test(digits)) return 'PIN code must be 6 digits and cannot start with 0';
  return undefined;
}

/**
 * A date of birth that is a real past date and belongs to someone at least `minAge`.
 *
 * Age is computed by comparing month and day, not by dividing days by 365 — the approximation is
 * wrong for anyone whose birthday is within a few days of the cutoff, which is exactly the person
 * who will be used to test it.
 */
export function validateDateOfBirth(value: string, minAge = 18): FieldError {
  if (!value) return 'Date of birth is required';
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return 'Enter a valid date';
  const today = new Date();
  if (dob > today) return 'Date of birth cannot be in the future';

  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age -= 1;

  if (age < minAge) return `You must be at least ${minAge} years old`;
  if (age > 120) return 'Enter a valid date of birth';
  return undefined;
}

export function validateRequired(value: string, label: string): FieldError {
  return value.trim() ? undefined : `${label} is required`;
}

/**
 * Nominee allocations must total exactly 100 (requirement 9).
 *
 * Returns a message describing the shortfall or excess, not just "invalid" — someone allocating
 * across three nominees needs to know they are 10% short, not that something is wrong.
 */
export function validateAllocation(percentages: number[]): FieldError {
  if (percentages.length === 0) return 'Add at least one nominee';
  if (percentages.some((p) => p <= 0)) return 'Every nominee needs an allocation above 0%';
  const total = percentages.reduce((sum, p) => sum + p, 0);
  if (total === 100) return undefined;
  return total < 100
    ? `Allocations total ${total}% — ${100 - total}% still to assign`
    : `Allocations total ${total}% — ${total - 100}% over the 100% limit`;
}

/** Collapses a set of field errors into "is this form submittable". */
export function hasErrors(errors: Record<string, FieldError>): boolean {
  return Object.values(errors).some((error) => error !== undefined);
}
