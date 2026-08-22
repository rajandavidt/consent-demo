// packages/shared/src/util/mask.ts — requirement 17: sensitive values are never shown in full once
// they have been captured.
//
// These are the ONLY functions any screen may use to render an Aadhaar number, a PAN, a mobile
// number or an account number. Formatting one inline is how a full value ends up on screen in the
// one place nobody reviewed — so the masking lives here, is used everywhere, and is tested by the
// examples in each doc comment.
//
// A NOTE ON WHY THIS MATTERS EVEN FOR MOCK DATA. Every value in this demo is fabricated, so nothing
// here protects a real person. It is written strictly anyway, because a demo is a template: the
// screens get copied into something real, and a masking rule that was "good enough for the demo"
// gets copied with them.

/** `123412341234` → `XXXX XXXX 1234`. Last four only, grouped as Aadhaar is normally written. */
export function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, '');
  if (digits.length < 4) return 'XXXX XXXX XXXX';
  return `XXXX XXXX ${digits.slice(-4)}`;
}

/** `ABCDE1234F` → `XXXXX1234F`. The five leading letters are the identifying part, so they go. */
export function maskPan(pan: string): string {
  const clean = pan.toUpperCase().replace(/\s/g, '');
  if (clean.length !== 10) return 'XXXXXXXXXX';
  return `XXXXX${clean.slice(5)}`;
}

/** `9876543210` → `+91 ******3210`. */
export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '').slice(-10);
  if (digits.length < 4) return '+91 **********';
  return `+91 ******${digits.slice(-4)}`;
}

/** `1234567890` → `******7890`. */
export function maskAccount(account: string): string {
  const clean = account.replace(/\s/g, '');
  if (clean.length < 4) return '**********';
  return `******${clean.slice(-4)}`;
}

/** `rajan.kumar@example.com` → `r***@example.com`. First character and domain survive. */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}
