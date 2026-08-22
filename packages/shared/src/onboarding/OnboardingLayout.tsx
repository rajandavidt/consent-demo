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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
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
        {!standalone && <ProgressSteps current={step} completed={completed} />}
      </header>

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
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
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
  );
}
