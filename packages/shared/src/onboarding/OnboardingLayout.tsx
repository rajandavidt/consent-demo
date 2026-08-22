// packages/shared/src/onboarding/OnboardingLayout.tsx — the frame every onboarding step renders inside.
//
// One layout rather than ten copies, so the progress indicator, the demo-data notice and the
// Back/Save-and-continue row cannot drift between steps. A step supplies its title, its fields and
// what "continue" means; everything around it is fixed.
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { STEP_SEQUENCE, type OnboardingStep } from '../kyc/types.js';
import { Card, InfoBanner, ProgressSteps } from '../ui/index.js';

export function OnboardingLayout({
  step,
  title,
  description,
  children,
  footer,
  standalone = false,
}: {
  step: OnboardingStep;
  title: string;
  description: string;
  children: ReactNode;
  /** The step's own action row. Steps differ too much for a shared Next button to be honest. */
  footer?: ReactNode;
  /**
   * Reached from the sidebar rather than mid-onboarding.
   *
   * Hides the progress indicator and the step counter. The same screen serves both entry points, and
   * showing "Step 8 of 10" to somebody who came from a Nominees menu item is just wrong — they are
   * not in a flow.
   */
  standalone?: boolean;
}) {
  const { kyc } = useAuth();
  const navigate = useNavigate();

  const completed = STEP_SEQUENCE.filter((s) => kyc?.steps[s].status === 'verified');
  const index = STEP_SEQUENCE.indexOf(step);
  const previous = index > 0 ? STEP_SEQUENCE[index - 1] : undefined;

  // Full width, matching the rest of the app. The step's own fields keep their narrow caps — see
  // each step's `max-w-sm` on the input group — so the form stays usable while the progress
  // indicator and the demo-data notice get the full measure.
  return (
    <div className="w-full px-4 py-8">
      <header className="mb-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            {!standalone && (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Step {index + 1} of {STEP_SEQUENCE.length}
              </p>
            )}
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          </div>
          {!standalone && (
            <span className="num text-xs text-slate-500">
              {completed.length}/{STEP_SEQUENCE.length} complete
            </span>
          )}
        </div>
      </header>

      {/* TWO COLUMNS on wide screens: the stepper as a rail, the step beside it.
          A vertical stepper above the form would just be a tall list pushing the fields off-screen —
          the point of going vertical is that it can sit alongside. Below `lg` it collapses to a single
          column and the stepper leads, which keeps the reading order the same on a phone. */}
      {/* The template is CONDITIONAL, and it has to be: `standalone` hides the stepper aside, but a
          fixed `lg:grid-cols-[248px_...]` still reserves its column, so the content dropped into the
          248px lane and left the rest of the page empty. That is exactly what /documents and
          /nominees looked like — a tall thin column of wrapped text beside a void. A conditional
          child needs a conditional grid. */}
      <div
        className={
          'grid gap-8 ' + (standalone ? 'grid-cols-1' : 'lg:grid-cols-[248px_minmax(0,1fr)]')
        }
      >
        {!standalone && (
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-2xs text-muted-foreground/70 mb-3 font-semibold tracking-[0.12em] uppercase">
              Verification steps
            </p>
            <ProgressSteps current={step} completed={completed} />
          </aside>
        )}

        <div className="min-w-0">
      <div className="mb-4">
        <InfoBanner tone="warning">
          <strong>Demo data.</strong> Nothing on this screen is verified against a real registry and
          no message is ever sent. Every value you enter stays in this browser.
        </InfoBanner>
      </div>

      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="px-6 py-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            {previous && !standalone ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                // `focus-ring` and `press`: this is the only navigation control in the onboarding
                // footer and it had no focus indicator at all, which on a ten-step keyboard-driven
                // flow means somebody tabbing backwards out of the form lands on an invisible target.
                // `rounded px-1` so the ring has a shape to follow rather than hugging the glyphs.
                className="focus-ring press rounded px-1 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">{footer}</div>
          </div>
        )}
      </Card>
        </div>
      </div>
    </div>
  );
}
