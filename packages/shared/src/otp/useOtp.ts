// packages/shared/src/otp/useOtp.ts — the OTP state machine, shared by all five uses in
// requirement 14: mobile, email, Aadhaar, login and payment confirmation.
//
// Split from the component on purpose. The five surfaces look different — a full page during
// onboarding, a modal during payment — but the BEHAVIOUR must be identical: same demo code, same
// countdown, same attempt handling. Putting that in a hook means a new surface cannot accidentally
// implement "resend" differently.
//
// THE DEMO CODE IS A CONSTANT, AND THAT IS THE POINT. Nothing is sent anywhere: no SMS, no email, no
// registry call. `123456` is accepted and everything else is rejected, so the failure path is
// demonstrable — a demo where every code works cannot show an error state, and requirement 2 asks
// for one explicitly.
import { useCallback, useEffect, useRef, useState } from 'react';
import { KEYS, nowIso, update } from '../storage/index.js';

/** The only code this platform accepts. Demo data, stated loudly. */
export const DEMO_OTP = '123456';

export const OTP_LENGTH = 6;

/** Seconds before "Resend OTP" becomes available. */
export const RESEND_SECONDS = 30;

/** Wrong codes allowed before the challenge is locked and must be resent. */
export const MAX_ATTEMPTS = 3;

export type OtpPhase = 'idle' | 'verifying' | 'success' | 'error' | 'locked';

/** What the OTP was for, recorded so the demo's OTP store reads like a real challenge log. */
export type OtpPurpose = 'mobile' | 'email' | 'aadhaar' | 'login' | 'payment';

interface OtpChallenge {
  id: string;
  purpose: OtpPurpose;
  /** Masked destination — an OTP log has no business holding the full number. */
  sentTo: string;
  sentAt: string;
  attempts: number;
  verifiedAt?: string;
}

export interface UseOtpOptions {
  purpose: OtpPurpose;
  /** Already-masked destination, e.g. `+91 ******3210`. Shown in the "sent to" line. */
  sentTo: string;
  onVerified: () => void;
}

export interface UseOtpResult {
  digits: string[];
  phase: OtpPhase;
  error: string | undefined;
  secondsLeft: number;
  canResend: boolean;
  attemptsLeft: number;
  /** Set one box. Accepts a pasted full code and spreads it across the boxes. */
  setDigit: (index: number, value: string) => void;
  /** Backspace on an empty box moves focus back — the component calls this. */
  clearFrom: (index: number) => void;
  verify: () => void;
  resend: () => void;
  /** Which box should hold focus, or -1 when the code is complete. */
  focusIndex: number;
}

export function useOtp({ purpose, sentTo, onVerified }: UseOtpOptions): UseOtpResult {
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [phase, setPhase] = useState<OtpPhase>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [attempts, setAttempts] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const challengeId = useRef<string>(`OTP-${Date.now().toString(16).toUpperCase()}`);

  // Log the challenge once per mount, so finsecure_otp shows a realistic history across a session.
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    recordChallenge({
      id: challengeId.current,
      purpose,
      sentTo,
      sentAt: nowIso(),
      attempts: 0,
    });
  }, [purpose, sentTo]);

  // The countdown. Cleared on unmount so a user who navigates mid-challenge does not leave a timer
  // ticking against an unmounted component.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const setDigit = useCallback((index: number, value: string) => {
    const typed = value.replace(/\D/g, '');
    if (!typed) return;

    setDigits((current) => {
      const next = [...current];
      // A pasted code fills from here onwards rather than dropping everything but the first
      // character — requirement 14 asks for paste support, and this is what makes it work whether
      // the paste lands on box 1 or box 3.
      for (let offset = 0; offset < typed.length && index + offset < OTP_LENGTH; offset += 1) {
        next[index + offset] = typed[offset]!;
      }
      const filledTo = Math.min(index + typed.length, OTP_LENGTH - 1);
      setFocusIndex(next.every((d) => d !== '') ? -1 : filledTo + (typed.length > 0 ? 0 : 1));
      return next;
    });
    setPhase('idle');
    setError(undefined);
  }, []);

  const clearFrom = useCallback((index: number) => {
    setDigits((current) => {
      const next = [...current];
      if (next[index]) {
        next[index] = '';
        setFocusIndex(index);
      } else if (index > 0) {
        next[index - 1] = '';
        setFocusIndex(index - 1);
      }
      return next;
    });
    setPhase('idle');
    setError(undefined);
  }, []);

  const verify = useCallback(() => {
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      setPhase('error');
      setError(`Enter all ${OTP_LENGTH} digits`);
      return;
    }

    setPhase('verifying');
    setError(undefined);

    // A deliberate delay. Requirement 19 asks for a real loading state, and a verification that
    // resolves in the same tick cannot show one — the spinner would flash and the demo would look
    // like nothing happened.
    window.setTimeout(() => {
      if (code === DEMO_OTP) {
        setPhase('success');
        bumpChallenge(challengeId.current, { verifiedAt: nowIso() });
        onVerified();
        return;
      }

      const used = attempts + 1;
      setAttempts(used);
      bumpChallenge(challengeId.current, { attempts: used });
      setDigits(Array(OTP_LENGTH).fill(''));
      setFocusIndex(0);

      if (used >= MAX_ATTEMPTS) {
        setPhase('locked');
        setError('Too many incorrect attempts. Request a new OTP to continue.');
      } else {
        setPhase('error');
        setError(
          `Incorrect OTP. ${MAX_ATTEMPTS - used} attempt${MAX_ATTEMPTS - used === 1 ? '' : 's'} remaining.`,
        );
      }
    }, 700);
  }, [attempts, digits, onVerified]);

  const resend = useCallback(() => {
    challengeId.current = `OTP-${Date.now().toString(16).toUpperCase()}`;
    recordChallenge({
      id: challengeId.current,
      purpose,
      sentTo,
      sentAt: nowIso(),
      attempts: 0,
    });
    setDigits(Array(OTP_LENGTH).fill(''));
    setAttempts(0);
    setPhase('idle');
    setError(undefined);
    setSecondsLeft(RESEND_SECONDS);
    setFocusIndex(0);
  }, [purpose, sentTo]);

  return {
    digits,
    phase,
    error,
    secondsLeft,
    canResend: secondsLeft <= 0,
    attemptsLeft: MAX_ATTEMPTS - attempts,
    setDigit,
    clearFrom,
    verify,
    resend,
    focusIndex,
  };
}

function recordChallenge(challenge: OtpChallenge): void {
  update<OtpChallenge[]>(KEYS.otp, [], (log) => [challenge, ...log].slice(0, 50));
}

function bumpChallenge(id: string, patch: Partial<OtpChallenge>): void {
  update<OtpChallenge[]>(KEYS.otp, [], (log) =>
    log.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
  );
}
