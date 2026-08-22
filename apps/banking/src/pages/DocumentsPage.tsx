// apps/banking/src/pages/DocumentsPage.tsx — the Documents screen reached from the sidebar.
//
// Same component as the onboarding step, standalone. See NomineesPage for why this is not a copy.
import DocumentsStep from '../onboarding/DocumentsStep';

export default function DocumentsPage() {
  return <DocumentsStep standalone />;
}
