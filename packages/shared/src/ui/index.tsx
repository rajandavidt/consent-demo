// packages/shared/src/ui/index.tsx — this platform's components, built on shadcn/ui.
//
// WHY A LAYER AND NOT SHADCN DIRECTLY. shadcn gives primitives: an Input has no label, no error slot
// and no hint. This product has around thirty forms and requirement 19 rules out "forms with only
// labels and empty fields", so the pairing of label + control + error + hint has to exist as one
// component or it gets rebuilt slightly differently on every screen. `Field` is that component, and
// underneath it is a shadcn Input and Label, unmodified.
//
// The API here is unchanged from before the shadcn migration, deliberately — twenty call sites across
// two apps keep working, and what changed is only what they render into. Anything shadcn already does
// well (Dialog, Table, Select, Checkbox) is re-exported raw rather than wrapped.
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  Check,
  CreditCard,
  FileText,
  Fingerprint,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
} from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { cn } from '../lib/utils.js';
import { Button as ShadButton } from '../components/ui/button.js';
import {
  Card as ShadCard,
  CardContent,
  CardDescription,
  CardHeader as ShadCardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Checkbox as ShadCheckbox } from '../components/ui/checkbox.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.js';
import { Alert } from '../components/ui/alert.js';
import { Badge } from '../components/ui/badge.js';
import { Toaster } from '../components/ui/sonner.js';
import { STEP_LABELS, STEP_SEQUENCE, type OnboardingStep } from '../kyc/types.js';
import { STATUS_LABELS, type VerificationStatus } from '../kyc/types.js';

/* Raw shadcn, re-exported. These need no wrapper — a Dialog is a Dialog. */
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.js';
export {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table.js';
export { Separator } from '../components/ui/separator.js';
export { Progress } from '../components/ui/progress.js';
export { Badge } from '../components/ui/badge.js';
export { CardContent, CardFooter } from '../components/ui/card.js';
export { cn } from '../lib/utils.js';

/* ------------------------------------------------------------------ surfaces */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  // `gap-0 p-0` because shadcn's Card ships its own padding and vertical gap, while this platform's
  // cards manage their own internal spacing — a header strip flush to the edges, then a padded body.
  // Without the reset every card gains a double inset.
  //
  // NO HOVER LIFT HERE, and no `interactive` prop to opt into one. A draft had both; the prop had no
  // call site, because every `Card` in either app is a static panel — the one card in the product
  // that is genuinely a click target is the account selector on /accounts, which is a bare <button>
  // and takes `.lift` directly. A lift on a static panel is worse than the flatness: it promises an
  // interaction that is not there, people click, nothing happens, and they stop trusting the real
  // affordances on the page. If a clickable Card ever appears, pass `className="lift"` — that is
  // what the class is for, and it needs no API.
  return <ShadCard className={cn('gap-0 overflow-hidden p-0', className)}>{children}</ShadCard>;
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <ShadCardHeader className="gap-0.5 border-b px-5 py-4">
      <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
      {subtitle && <CardDescription className="text-xs leading-relaxed">{subtitle}</CardDescription>}
    </ShadCardHeader>
  );
}

/* ------------------------------------------------------------------ actions */

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  block = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
}) {
  // Our four names map onto shadcn's variants. Kept as our own vocabulary because "primary" and
  // "danger" describe intent, whereas shadcn's "default"/"destructive" mixes intent with styling.
  const map = {
    primary: 'default',
    secondary: 'outline',
    danger: 'destructive',
    ghost: 'ghost',
  } as const;

  return (
    <ShadButton
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      variant={map[variant]}
      className={cn(
        // h-11 is 44px, the touch-target floor, applied to every variant so a secondary button is
        // never harder to hit than a primary one.
        'h-11 px-4 text-sm font-semibold',
        variant === 'primary' &&
          'btn-primary-surface text-primary-foreground hover:brightness-[1.07]',
        block && 'w-full',
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {loading ? 'Working…' : children}
    </ShadButton>
  );
}

/* ------------------------------------------------------------------ inputs */

export function Field({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  type = 'text',
  required = false,
  disabled = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        // aria-invalid drives shadcn's own error styling, so setting it gives the ring and border for
        // free instead of hand-colouring the field — and it is what a screen reader needs anyway.
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-11"
      />
      {/* `reveal` on the error and not on the hint. The hint was there before you touched the field,
          so animating it in on first render would draw the eye to text that is not news. The error
          IS news — it is the reason the form did not submit — and it appears below the fold of the
          user's attention, several fields above wherever they clicked Save. The fade plus 3px of
          travel is what makes it findable.
          `key={error}` so a SECOND, different error on the same field replays the animation. Without
          it React reuses the node, the text swaps silently, and someone who fixed "PAN is required"
          into a malformed PAN sees no acknowledgement that anything happened. */}
      {error ? (
        <p key={error} className="reveal text-destructive text-xs font-medium">
          {error}
        </p>
      ) : (
        hint && <p className="text-muted-foreground text-xs">{hint}</p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string | undefined;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {/* Radix's Select: keyboard-navigable and screen-reader correct, which a bare <select> is too —
          but this one can be styled to match the rest of the platform.
          Radix means "no value" by the prop being ABSENT, not by it being undefined, and under
          `exactOptionalPropertyTypes` those are different things. Hence the conditional spread rather
          than `value={value || undefined}`, which does not typecheck and would also pin the Select
          into controlled-with-no-value rather than letting the placeholder show. */}
      <Select {...(value ? { value } : {})} onValueChange={onChange}>
        <SelectTrigger
          aria-invalid={error ? true : undefined}
          className="h-11 w-full data-[size=default]:h-11"
        >
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Same treatment as Field — see the note there for why the key matters. */}
      {error && (
        <p key={error} className="reveal text-destructive text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Label className="flex cursor-pointer items-start gap-2.5 font-normal">
      <ShadCheckbox
        checked={checked}
        disabled={disabled}
        // Radix has a third 'indeterminate' state. Coerced because nothing here uses it, and handing
        // a boolean-only caller an 'indeterminate' would be a silent type lie.
        onCheckedChange={(next) => onChange(next === true)}
        className="mt-0.5"
      />
      <span className="text-foreground text-sm leading-relaxed">{children}</span>
    </Label>
  );
}

/* ------------------------------------------------------------------ status */

const STATUS_STYLES: Record<VerificationStatus, string> = {
  not_started: 'bg-status-idle-soft text-status-idle',
  in_progress: 'bg-status-progress-soft text-status-progress',
  pending: 'bg-status-pending-soft text-status-pending',
  verified: 'bg-status-verified-soft text-status-verified',
  rejected: 'bg-status-rejected-soft text-status-rejected',
  expired: 'bg-status-expired-soft text-status-expired',
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'rounded-full border-transparent px-2 py-0.5 text-2xs font-bold tracking-wide uppercase',
        STATUS_STYLES[status],
      )}
    >
      {status === 'verified' && '✓'}
      {status === 'rejected' && '✕'}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function InfoBanner({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'success' | 'danger';
}) {
  const tones: Record<string, string> = {
    info: 'bg-status-progress-soft text-status-progress border-status-progress/15',
    warning: 'bg-status-pending-soft text-status-pending border-status-pending/15',
    success: 'bg-status-verified-soft text-status-verified border-status-verified/15',
    danger: 'bg-status-rejected-soft text-status-rejected border-status-rejected/15',
  };
  return (
    // `block`, not shadcn's grid. Alert lays its children out as grid items, so inline content —
    // a <strong> next to a sentence — becomes one item per line instead of a paragraph. That produced
    // a banner reading "You have / 5 choices / to make here." down the page.
    // `reveal` — the short one, not `reveal-block`. Most banners here appear because something
    // happened: a consent load failed, a value was rejected, an upload finished. The fade is what
    // separates "this just became true" from "this was always on the page", which matters because the
    // same component is also used for the standing demo-data notice on every onboarding step. 3px of
    // travel and 200ms is the compromise: enough to register on the ones that are news, brief enough
    // that the standing notice does not perform an entrance on every step you visit.
    <Alert className={cn('reveal block py-3', tones[tone])}>
      <p className="text-sm leading-relaxed text-current">{children}</p>
    </Alert>
  );
}

/* ------------------------------------------------------------------ progress */

/**
 * The ten-step indicator.
 *
 * Shows every step rather than "3 of 10": the point is that the customer can see what is still ahead
 * of them, which is what stops an onboarding flow feeling endless.
 */
/**
 * An icon per onboarding step.
 *
 * Chosen to describe the ARTEFACT being collected rather than the act of collecting it — a card for
 * PAN, a fingerprint for Aadhaar-based KYC, a pin for address — because the artefact is what the
 * visitor recognises. A `Record` keyed on the step type, so adding an eleventh step is a type error
 * here rather than a missing icon at runtime.
 */
export const STEP_ICONS: Record<OnboardingStep, typeof UserRound> = {
  account: UserRound,
  mobile: Smartphone,
  email: Mail,
  pan: CreditCard,
  kyc: Fingerprint,
  personal: UserRound,
  address: MapPin,
  nominee: Users,
  documents: FileText,
  consent: ShieldCheck,
};

/**
 * The onboarding progress, as a VERTICAL stepper.
 *
 * Was a horizontal row of pills, which wrapped to two ragged lines at ten steps and read as tags
 * rather than a sequence — you could not tell at a glance how far through you were. Vertical gives
 * each step a full row for its label, puts them in one unambiguous reading order, and uses the width
 * the page now has instead of fighting it.
 *
 * Each step carries its own lucide icon rather than a number alone. The icon says WHAT the step is
 * before the label is read (a fingerprint for KYC, a card for PAN), and the number stays for
 * position. A tick replaces the icon once a step is verified, because at that point "which step is
 * this" matters less than "this one is done".
 *
 * The connector is drawn per-item rather than as a single background line, so it stops at the last
 * step instead of trailing into empty space.
 */
export function ProgressSteps({
  current,
  completed,
}: {
  current: OnboardingStep;
  completed: OnboardingStep[];
}) {
  return (
    <ol className="relative">
      {STEP_SEQUENCE.map((step, index) => {
        const isDone = completed.includes(step);
        const isCurrent = step === current;
        const isLast = index === STEP_SEQUENCE.length - 1;
        const Icon = STEP_ICONS[step];

        return (
          <li key={step} className="relative flex gap-3 pb-1 last:pb-0">
            {/* The connector. Tinted for a completed run so the finished part of the journey reads
                as one continuous line rather than a series of dots. */}
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  // --duration-slow, and it is the slowest thing in the stepper on purpose. The
                  // connector tinting green is the "you have got this far" signal, and it should
                  // still be arriving after the node above it has finished changing — that ordering
                  // is what makes the progress read as travelling DOWN the list rather than as three
                  // unrelated elements recolouring at once.
                  'absolute top-9 left-[17px] h-[calc(100%-1.5rem)] w-px transition-colors duration-[var(--duration-slow)]',
                  isDone ? 'bg-status-verified/30' : 'bg-border',
                )}
              />
            )}

            <span
              className={cn(
                // `transition-all`, not `transition-colors`. The current step is marked by a 4px
                // brand-tinted halo drawn with box-shadow — which `transition-colors` does not cover,
                // so the halo popped into existence around a circle whose fill was still fading.
                // `transition-all` here also picks up the border, which changes on every state.
                'relative z-10 grid size-[35px] shrink-0 place-items-center rounded-full border transition-all',
                isCurrent
                  ? 'border-brand-500 bg-brand-500 text-white shadow-[0_0_0_4px_var(--brand-100)]'
                  : isDone
                    ? 'border-status-verified/25 bg-status-verified-soft text-status-verified'
                    : 'border-border bg-card text-muted-foreground',
              )}
            >
              {isDone && !isCurrent ? (
                // The tick is a REPLACEMENT, not a state change — React swaps one lucide component
                // for another, so there is nothing for a transition to interpolate and the glyph just
                // appears. An entrance keyframe is the only tool that works here, and this is the
                // moment in the whole flow most worth marking: a step going from "in progress" to
                // "done" is the only unambiguously good news the stepper ever delivers.
                <Check
                  className="size-4 animate-in zoom-in-50 duration-[var(--duration-base)] ease-[var(--ease-out-quart)]"
                  strokeWidth={2.5}
                  aria-hidden
                />
              ) : (
                <Icon className="size-4" strokeWidth={1.9} aria-hidden />
              )}
            </span>

            <span className="flex min-w-0 flex-col justify-center py-1.5">
              <span
                className={cn(
                  'truncate text-sm leading-tight transition-colors',
                  isCurrent
                    ? 'text-foreground font-semibold'
                    : isDone
                      ? 'text-foreground/80 font-medium'
                      : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[step]}
              </span>
              <span className="num text-2xs text-muted-foreground/70 leading-tight">
                {isDone && !isCurrent ? 'Verified' : `Step ${index + 1}`}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ toasts */

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

/**
 * Sonner does the rendering now, so this context exists only to keep `useToast()` as the call
 * signature thirty sites already use. Being able to swap the implementation without touching them is
 * the whole reason it was a hook rather than a direct import.
 */
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useMemo<ToastApi>(
    () => ({
      success: (title, message) => sonnerToast.success(title, { description: message }),
      error: (title, message) => sonnerToast.error(title, { description: message }),
      info: (title, message) => sonnerToast.info(title, { description: message }),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Bottom-centre with rich colours: a toast confirming a payment should not be a grey box in a
          corner. `closeButton` because auto-dismiss alone loses a message someone looked away from. */}
      <Toaster position="bottom-center" richColors closeButton />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  // Falls back to calling sonner directly rather than throwing. A missing provider is a wiring bug,
  // but a toast is never the point of a screen — taking the page down over one would be worse than
  // the bug it reports.
  const fallback = useCallback(
    (kind: 'success' | 'error' | 'info') => (title: string, message?: string) =>
      sonnerToast[kind](title, { description: message }),
    [],
  );
  return (
    ctx ?? {
      success: fallback('success'),
      error: fallback('error'),
      info: fallback('info'),
    }
  );
}

/** Re-exported so a page can use shadcn's padded body without importing from two places. */
export { CardContent as CardBody };
