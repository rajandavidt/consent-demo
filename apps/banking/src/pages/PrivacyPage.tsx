// apps/banking/src/pages/PrivacyPage.tsx — the standing privacy screen.
//
// A wrapper, deliberately thin: everything below the heading is the shared ConsentCentre, so Banking
// and Insurance cannot end up answering "what have I agreed to" differently.
import { ConsentCentre } from '@finsecure/shared';

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy & consent</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          What FinSecure Bank does with your personal data, and which parts of it are your choice.
          Changes take effect immediately.
        </p>
      </header>
      <ConsentCentre source="privacy-centre-banking" />
    </div>
  );
}
