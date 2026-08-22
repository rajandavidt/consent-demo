// apps/banking/src/onboarding/NomineeStep.tsx — requirement 9.
//
// Add, edit, delete, and the allocations must total exactly 100%.
//
// THE TOTAL IS SHOWN LIVE, NOT ON SUBMIT. Allocating across three nominees is arithmetic the
// customer is doing in their head; telling them at submit time that they are 10% short means going
// back and redoing it. A running total with the shortfall named is the difference between a form
// that helps and a form that marks homework.
//
// Nominees live in their own store (finsecure_nominees) rather than inside the KYC record, because
// the insurance app reads and adds to the same list when a policy needs a beneficiary.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import {
  useAuth,
  Button,
  Field,
  InfoBanner,
  KEYS,
  SelectField,
  hasErrors,
  nextId,
  read,
  setStepStatus,
  useToast,
  validateAllocation,
  validateDateOfBirth,
  validateMobile,
  validateRequired,
  write,
  maskMobile,
} from '@finsecure/shared';
import { OnboardingLayout } from '@finsecure/shared';

export interface Nominee {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
  gender: string;
  mobile: string;
  address: string;
  allocation: number;
}

const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'].map(
  (r) => ({ value: r, label: r }),
);

const emptyDraft = {
  name: '',
  relationship: '',
  dateOfBirth: '',
  gender: '',
  mobile: '',
  address: '',
  allocation: '',
};

export default function NomineeStep({ standalone = false }: { standalone?: boolean } = {}) {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [nominees, setNominees] = useState<Nominee[]>(() =>
    read<Nominee[]>(KEYS.nominees, []).filter((n) => n.userId === session?.userId),
  );
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formOpen, setFormOpen] = useState(false);

  if (!session) return null;

  const total = nominees.reduce((sum, n) => sum + n.allocation, 0);
  const allocationProblem = validateAllocation(nominees.map((n) => n.allocation));

  const persist = (next: Nominee[]) => {
    const others = read<Nominee[]>(KEYS.nominees, []).filter((n) => n.userId !== session.userId);
    write(KEYS.nominees, [...others, ...next]);
    setNominees(next);
  };

  const set = (key: keyof typeof emptyDraft, value: string) => {
    setDraft((c) => ({ ...c, [key]: value }));
    setErrors((c) => ({ ...c, [key]: undefined }));
  };

  const submitDraft = () => {
    const allocation = Number(draft.allocation);
    const found: Record<string, string | undefined> = {
      name: validateRequired(draft.name, 'Nominee name'),
      relationship: draft.relationship ? undefined : 'Relationship is required',
      dateOfBirth: validateDateOfBirth(draft.dateOfBirth, 0),
      gender: draft.gender ? undefined : 'Gender is required',
      mobile: validateMobile(draft.mobile),
      address: validateRequired(draft.address, 'Address'),
      allocation:
        !draft.allocation || Number.isNaN(allocation)
          ? 'Allocation is required'
          : allocation <= 0 || allocation > 100
            ? 'Allocation must be between 1 and 100'
            : undefined,
    };
    setErrors(found);
    if (hasErrors(found)) return;

    const record: Nominee = {
      id: editingId ?? nextId('NOM'),
      userId: session.userId,
      name: draft.name.trim(),
      relationship: draft.relationship,
      dateOfBirth: draft.dateOfBirth,
      gender: draft.gender,
      mobile: draft.mobile.replace(/\D/g, '').slice(-10),
      address: draft.address.trim(),
      allocation,
    };

    persist(
      editingId ? nominees.map((n) => (n.id === editingId ? record : n)) : [...nominees, record],
    );
    toast.success(editingId ? 'Nominee updated' : 'Nominee added', `${record.name} — ${allocation}%`);
    setDraft(emptyDraft);
    setEditingId(null);
    setFormOpen(false);
  };

  const startEdit = (nominee: Nominee) => {
    setDraft({
      name: nominee.name,
      relationship: nominee.relationship,
      dateOfBirth: nominee.dateOfBirth,
      gender: nominee.gender,
      mobile: nominee.mobile,
      address: nominee.address,
      allocation: String(nominee.allocation),
    });
    setEditingId(nominee.id);
    setErrors({});
    setFormOpen(true);
  };

  const remove = (nominee: Nominee) => {
    // Confirmed, because it is destructive and cannot be undone from this screen
    // (§8 confirmation-dialogs).
    if (!window.confirm(`Remove ${nominee.name} as a nominee? This cannot be undone.`)) return;
    persist(nominees.filter((n) => n.id !== nominee.id));
    toast.info('Nominee removed', `${nominee.name} is no longer a nominee.`);
  };

  const saveStep = () => {
    if (allocationProblem) {
      toast.error('Allocations must total 100%', allocationProblem);
      return;
    }
    setStepStatus(session.userId, 'nominee', 'verified');
    refresh();
    toast.success('Nominees saved', `${nominees.length} nominee(s) recorded, totalling 100%.`);
    navigate('/onboarding/documents');
  };

  return (
    <OnboardingLayout
      standalone={standalone}
      step="nominee"
      title="Nominees"
      description="Who should receive the balance of your accounts and any policy payout. Allocations must add up to 100%."
      footer={
        <Button onClick={saveStep} disabled={Boolean(allocationProblem)}>
          Save &amp; continue
        </Button>
      }
    >
      <div className="space-y-5">
        {nominees.length === 0 && !formOpen && (
          <div className="rounded-control border border-dashed border-border-strong px-6 py-10 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-800">No nominees yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              Add at least one nominee. You can split the allocation across several people as long as
              the total is exactly 100%.
            </p>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => setFormOpen(true)}>
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Add nominee
                </span>
              </Button>
            </div>
          </div>
        )}

        {nominees.length > 0 && (
          <div className="overflow-hidden rounded-control border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Nominee</th>
                  <th className="px-4 py-2.5 font-semibold">Relationship</th>
                  <th className="px-4 py-2.5 font-semibold">Mobile</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Allocation</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {nominees.map((nominee) => (
                  <tr key={nominee.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{nominee.name}</p>
                      <p className="text-xs text-slate-500">{nominee.address}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{nominee.relationship}</td>
                    <td className="num px-4 py-3 text-slate-600">{maskMobile(nominee.mobile)}</td>
                    <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                      {nominee.allocation}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(nominee)}
                          aria-label={`Edit ${nominee.name}`}
                          className="focus-ring grid h-9 w-9 place-items-center rounded-control text-slate-500 hover:bg-surface-sunken hover:text-brand-600"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(nominee)}
                          aria-label={`Remove ${nominee.name}`}
                          className="focus-ring grid h-9 w-9 place-items-center rounded-control text-slate-500 hover:bg-status-rejected-soft hover:text-status-rejected"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-sunken">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total allocated
                  </td>
                  <td
                    className={
                      'num px-4 py-2.5 text-right text-sm font-bold ' +
                      (total === 100 ? 'text-status-verified' : 'text-status-pending')
                    }
                  >
                    {total}%{total === 100 ? ' ✓' : ''}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {allocationProblem && nominees.length > 0 && (
          <InfoBanner tone="warning">{allocationProblem}</InfoBanner>
        )}

        {nominees.length > 0 && !formOpen && (
          <Button variant="secondary" onClick={() => setFormOpen(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Add another nominee
            </span>
          </Button>
        )}

        {formOpen && (
          <div className="space-y-4 rounded-control border border-brand-200 bg-brand-50/40 p-5">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingId ? 'Edit nominee' : 'New nominee'}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nominee name" value={draft.name} onChange={(v) => set('name', v)} error={errors.name} required />
              <SelectField
                label="Relationship"
                value={draft.relationship}
                onChange={(v) => set('relationship', v)}
                error={errors.relationship}
                required
                options={RELATIONSHIPS}
              />
              <Field
                label="Date of birth"
                type="date"
                value={draft.dateOfBirth}
                onChange={(v) => set('dateOfBirth', v)}
                error={errors.dateOfBirth}
                required
              />
              <SelectField
                label="Gender"
                value={draft.gender}
                onChange={(v) => set('gender', v)}
                error={errors.gender}
                required
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Field
                label="Mobile number"
                value={draft.mobile}
                onChange={(v) => set('mobile', v.replace(/\D/g, '').slice(0, 10))}
                error={errors.mobile}
                required
                maxLength={10}
              />
              <Field
                label="Allocation %"
                value={draft.allocation}
                onChange={(v) => set('allocation', v.replace(/\D/g, '').slice(0, 3))}
                error={errors.allocation}
                hint={`${Math.max(0, 100 - total + (editingId ? (nominees.find((n) => n.id === editingId)?.allocation ?? 0) : 0))}% unallocated`}
                required
                maxLength={3}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Address"
                  value={draft.address}
                  onChange={(v) => set('address', v)}
                  error={errors.address}
                  placeholder="Same as yours, or the nominee's own address"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submitDraft}>{editingId ? 'Update nominee' : 'Add nominee'}</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft(emptyDraft);
                  setEditingId(null);
                  setErrors({});
                  setFormOpen(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
