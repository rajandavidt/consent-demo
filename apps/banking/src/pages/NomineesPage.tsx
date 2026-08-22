// apps/banking/src/pages/NomineesPage.tsx — the Nominees screen reached from the sidebar.
//
// The same component as the onboarding step, in standalone mode. Deliberately not a second
// implementation: nominee allocation has one rule (total exactly 100%) and two copies of it would
// eventually disagree.
import NomineeStep from '../onboarding/NomineeStep';

export default function NomineesPage() {
  return <NomineeStep standalone />;
}
