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
import { Loader2 } from 'lucide-react';
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
      {error ? (
        <p className="text-destructive text-xs font-medium">{error}</p>
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
      {error && <p className="text-destructive text-xs font-medium">{error}</p>}
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
    <Alert className={cn('block py-3', tones[tone])}>
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
export function ProgressSteps({
  current,
  completed,
}: {
  current: OnboardingStep;
  completed: OnboardingStep[];
}) {
  return (
    <ol className="flex flex-wrap gap-1.5">
      {STEP_SEQUENCE.map((step, index) => {
        const isDone = completed.includes(step);
        const isCurrent = step === current;
        return (
          <li
            key={step}
            className={cn(
              'flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-xs font-medium transition-colors',
              isCurrent
                ? 'btn-primary-surface text-primary-foreground'
                : isDone
                  ? 'bg-status-verified-soft text-status-verified'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'num grid size-4 place-items-center rounded-full text-[10px] font-bold',
                isCurrent
                  ? 'text-primary-foreground bg-white/25'
                  : isDone
                    ? 'bg-status-verified text-white'
                    : 'bg-card text-muted-foreground',
              )}
            >
              {isDone && !isCurrent ? '✓' : index + 1}
            </span>
            {STEP_LABELS[step]}
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
