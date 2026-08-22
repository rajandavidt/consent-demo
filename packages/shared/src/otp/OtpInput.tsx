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
        {/* THE SHAKE IS A TOGGLED CLASS, NOT A KEYED WRAPPER, and that distinction is the trick.
            A `key` that changed per attempt would remount all six inputs and drop the caret: the hook
            only re-focuses when `focusIndex` CHANGES, and after a failed attempt it is already 0, so
            the effect would not fire and the user would be left with no cursor in a cleared field.
            Toggling a class needs no remount and still replays the animation, because `verify()`
            always passes through `verifying` between two failures — so `.shake` comes off and goes
            back on, which is what restarts a CSS animation.
            Colour carries the error as well (rose border and fill, below). The shake says WHICH field
            went wrong; the colour is what still says it a second later, once the motion is over — and
            what says it at all for someone who has motion turned off. */}
        <div
          className={
            'flex gap-2 ' + (otp.phase === 'error' || otp.phase === 'locked' ? 'shake' : '')
          }
          role="group"
          aria-label={`${OTP_LENGTH} digit one time passcode`}
        >
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
                // The bare `transition` utility was already here; what it lacked was a duration it
                // chose, and now it inherits --duration-base from the theme. Pinned to
                // --duration-fast instead, because these six boxes are the most keyboard-driven
                // control in the product: someone types six digits in about a second, and a 200ms
                // border fade means box 3 is still catching up while they are filling box 5.
                //
                // `focus:` kept rather than tightened to `focus-visible:`, which was the first
                // instinct and is wrong here. The hook moves focus between these boxes itself as you
                // type, and a box the caret is sitting in with no ring around it is unreadable —
                // these six inputs have no labels and no other indication of where you are. This is
                // the rare control where a mouse click should light it up too.
                //
                // `disabled:` states added: the boxes go disabled while verifying, and until now the
                // only sign of that was that typing stopped working.
                'h-12 w-12 rounded-lg border text-center text-lg font-semibold outline-none transition duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-70 ' +
                (otp.phase === 'error' || otp.phase === 'locked'
                  ? 'border-rose-400 bg-rose-50 text-rose-900'
                  : otp.phase === 'success'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-slate-300 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100')
              }
            />
          ))}
        </div>
      </div>

      {/* `key` on the message text, so a SECOND failure replays the entrance. Without it React
          reuses the node and "2 attempts remaining" becomes "1 attempt remaining" with no visible
          event — the number changes under a line of text somebody has already read and stopped
          looking at. */}
      {otp.error && (
        <p key={otp.error} role="alert" className="reveal text-sm font-medium text-rose-700">
          {otp.error}
        </p>
      )}
      {otp.phase === 'success' && (
        <p className="reveal text-sm font-medium text-emerald-700">Verified successfully.</p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600">
          Didn&apos;t receive the OTP?{' '}
          {otp.canResend ? (
            <button
              type="button"
              onClick={otp.resend}
              className="focus-ring rounded font-semibold text-indigo-600 hover:underline"
            >
              Resend OTP
            </button>
          ) : (
            // `.num` because this is a COUNTDOWN. Inter's proportional digits are different widths,
            // so "30s" → "29s" → "28s" nudges the whole line sideways once a second; tabular figures
            // pin it. This is the single most visible place in either app for the effect.
            <span className="num text-slate-400">Resend in {otp.secondsLeft}s</span>
          )}
        </div>
        {secondaryAction}
      </div>

      <button
        type="button"
        onClick={otp.verify}
        disabled={disabled || otp.phase === 'locked'}
        // `press` and `focus-ring` — this button had neither, which made it the one primary action in
        // the product with no pressed state and no visible keyboard focus. It does not go through the
        // shared Button component (it renders its own three-way label from the OTP phase), so it did
        // not inherit either for free.
        className="focus-ring press w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {otp.phase === 'verifying' ? 'Verifying…' : otp.phase === 'success' ? 'Verified' : verifyLabel}
      </button>
    </div>
  );
}
