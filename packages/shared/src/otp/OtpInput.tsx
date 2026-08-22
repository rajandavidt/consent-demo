// packages/shared/src/otp/OtpInput.tsx — the six-box OTP surface (requirement 14).
//
// Presentation only; every rule lives in useOtp. The two are separate so the payment modal and the
// onboarding page can look nothing alike while behaving identically.
import { useEffect, useRef } from 'react';
import { DEMO_OTP, OTP_LENGTH, useOtp, type OtpPurpose } from './useOtp.js';

export interface OtpInputProps {
  purpose: OtpPurpose;
  /** Already masked, e.g. `+91 ******3210`. */
  sentTo: string;
  /** What the destination is called in the "sent to" line — "mobile number", "email". */
  destinationLabel: string;
  onVerified: () => void;
  /** Rendered under the boxes, e.g. a "Change mobile number" link (requirement 2). */
  secondaryAction?: React.ReactNode;
  verifyLabel?: string;
}

export function OtpInput({
  purpose,
  sentTo,
  destinationLabel,
  onVerified,
  secondaryAction,
  verifyLabel = 'Verify & continue',
}: OtpInputProps) {
  const otp = useOtp({ purpose, sentTo, onVerified });
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  // Focus follows the hook's focusIndex rather than being moved inside the change handler: the hook
  // owns "where the cursor should be" so paste, backspace and a failed attempt all land correctly
  // without three separate pieces of focus logic.
  useEffect(() => {
    if (otp.focusIndex >= 0) boxes.current[otp.focusIndex]?.focus();
  }, [otp.focusIndex]);

  const disabled = otp.phase === 'verifying' || otp.phase === 'success';

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <p className="text-slate-700">
          OTP sent to your {destinationLabel} <strong className="font-semibold">{sentTo}</strong>
        </p>
        {/* Stated on screen, not hidden in a README. Anyone handed this demo needs the code, and a
            demo that quietly expects you to know it is a demo that fails in front of a client. */}
        <p className="mt-1 text-xs text-amber-700">
          Demo data — no message is sent. Use OTP <strong className="font-mono">{DEMO_OTP}</strong>
        </p>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
          Enter the {OTP_LENGTH}-digit OTP
        </label>
        <div className="flex gap-2" role="group" aria-label={`${OTP_LENGTH} digit one time passcode`}>
          {otp.digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                boxes.current[index] = el;
              }}
              // `text` with a numeric inputMode, not `number`: a number input renders spinners,
              // accepts "e" and silently allows more than one character on some browsers.
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={OTP_LENGTH}
              value={digit}
              disabled={disabled}
              aria-label={`Digit ${index + 1}`}
              onChange={(e) => otp.setDigit(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  e.preventDefault();
                  otp.clearFrom(index);
                }
                if (e.key === 'Enter') otp.verify();
              }}
              className={
                'h-12 w-12 rounded-lg border text-center text-lg font-semibold outline-none transition ' +
                (otp.phase === 'error' || otp.phase === 'locked'
                  ? 'border-rose-400 bg-rose-50 text-rose-900'
                  : otp.phase === 'success'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100')
              }
            />
          ))}
        </div>
      </div>

      {otp.error && (
        <p role="alert" className="text-sm font-medium text-rose-700">
          {otp.error}
        </p>
      )}
      {otp.phase === 'success' && (
        <p className="text-sm font-medium text-emerald-700">Verified successfully.</p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600">
          Didn&apos;t receive the OTP?{' '}
          {otp.canResend ? (
            <button
              type="button"
              onClick={otp.resend}
              className="font-semibold text-indigo-600 hover:underline"
            >
              Resend OTP
            </button>
          ) : (
            <span className="text-slate-400">
              Resend in {otp.secondsLeft}s
            </span>
          )}
        </div>
        {secondaryAction}
      </div>

      <button
        type="button"
        onClick={otp.verify}
        disabled={disabled || otp.phase === 'locked'}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {otp.phase === 'verifying' ? 'Verifying…' : otp.phase === 'success' ? 'Verified' : verifyLabel}
      </button>
    </div>
  );
}
