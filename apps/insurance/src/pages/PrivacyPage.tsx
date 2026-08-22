// apps/insurance/src/pages/PrivacyPage.tsx — the standing privacy screen.
//
// Same shared centre as the banking app: one consent record, one answer, whichever product you are
// looking at.
import { ConsentCentre } from '@finsecure/shared';

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy & consent</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          What FinSecure Insurance does with your personal data, including the health information used
          to price your cover.
        </p>
      </header>
      <ConsentCentre source="privacy-centre-insurance" />
    </div>
  );
}
