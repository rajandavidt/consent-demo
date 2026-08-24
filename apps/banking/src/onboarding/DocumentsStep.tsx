// apps/banking/src/onboarding/DocumentsStep.tsx — requirement 10.
//
// Upload, replace, remove, preview, download — against six document slots.
//
// WHAT IS ACTUALLY STORED. Metadata only: name, size, type, timestamp, status. Not the file. A real
// file base64'd into localStorage would blow the ~5MB origin quota on the second photograph and fail
// in a way that looks like the app breaking. So "preview" and "download" produce a generated
// placeholder built from the metadata, and the screen says so — an honest mock beats one that
// silently corrupts.
//
// The file input is real, though: the browser's own picker, real size and type validation, real
// rejection messages. What a customer experiences is genuine right up to the point of transfer.
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, FileText, Trash2, Upload } from 'lucide-react';
import {
  useAuth,
  CollectionPointConsent,
  Button,
  InfoBanner,
  KEYS,
  StatusBadge,
  nowIso,
  read,
  setStepStatus,
  useToast,
  write,
  type VerificationStatus,
} from '@finsecure/shared';
import { OnboardingLayout } from '@finsecure/shared';

interface StoredDoc {
  userId: string;
  slot: DocSlot;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  status: VerificationStatus;
}

type DocSlot = 'pan' | 'aadhaar' | 'address' | 'photo' | 'signature' | 'income';

const SLOTS: { slot: DocSlot; label: string; hint: string; required: boolean }[] = [
  { slot: 'pan', label: 'PAN card', hint: 'Front side, all four corners visible', required: true },
  { slot: 'aadhaar', label: 'Aadhaar', hint: 'Front and back, or the e-Aadhaar PDF', required: true },
  { slot: 'address', label: 'Address proof', hint: 'Utility bill or rent agreement, under 3 months old', required: true },
  { slot: 'photo', label: 'Photograph', hint: 'Recent passport-style photo', required: true },
  { slot: 'signature', label: 'Signature', hint: 'On plain white paper', required: true },
  { slot: 'income', label: 'Income proof', hint: 'Salary slip or ITR — needed for cover above ₹50 Lakhs', required: false },
];

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];

export default function DocumentsStep({ standalone = false }: { standalone?: boolean } = {}) {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [docs, setDocs] = useState<StoredDoc[]>(() =>
    read<StoredDoc[]>(KEYS.documents, []).filter((d) => d.userId === session?.userId),
  );
  const [busySlot, setBusySlot] = useState<DocSlot | null>(null);
  const inputs = useRef<Partial<Record<DocSlot, HTMLInputElement | null>>>({});

  if (!session) return null;

  const persist = (next: StoredDoc[]) => {
    const others = read<StoredDoc[]>(KEYS.documents, []).filter((d) => d.userId !== session.userId);
    write(KEYS.documents, [...others, ...next]);
    setDocs(next);
  };

  const docFor = (slot: DocSlot) => docs.find((d) => d.slot === slot);

  const handleFile = (slot: DocSlot, file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Unsupported file type', 'Upload a PDF, JPG or PNG.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('File too large', `${formatSize(file.size)} — the limit is 5 MB.`);
      return;
    }

    setBusySlot(slot);
    // A simulated upload, long enough to show progress the way a real one would.
    window.setTimeout(() => {
      const record: StoredDoc = {
        userId: session.userId,
        slot,
        fileName: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        uploadedAt: nowIso(),
        // Pending, not verified: a document a human has not looked at is not verified, and marking
        // it so would make the status column meaningless.
        status: 'pending',
      };
      persist([...docs.filter((d) => d.slot !== slot), record]);
      setBusySlot(null);
      toast.success('Document uploaded', `${file.name} — awaiting verification.`);
    }, 900);
  };

  const remove = (slot: DocSlot, label: string) => {
    if (!window.confirm(`Remove the uploaded ${label}? You will need to upload it again.`)) return;
    persist(docs.filter((d) => d.slot !== slot));
    toast.info('Document removed', `${label} has been removed.`);
  };

  /** A stand-in file built from the metadata, so preview/download do something honest. */
  const openPlaceholder = (doc: StoredDoc, download: boolean) => {
    const text = [
      'FinSecure — DEMO DOCUMENT PLACEHOLDER',
      '',
      'This is not the file that was selected. This demo stores document METADATA only',
      'and never transfers or retains file contents.',
      '',
      `Slot:        ${doc.slot}`,
      `File name:   ${doc.fileName}`,
      `Size:        ${formatSize(doc.sizeBytes)}`,
      `Type:        ${doc.mimeType}`,
      `Uploaded:    ${new Date(doc.uploadedAt).toLocaleString('en-IN')}`,
      `Status:      ${doc.status}`,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    if (download) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.slot}-placeholder.txt`;
      link.click();
    } else {
      window.open(url, '_blank', 'noopener');
    }
    // Revoked on a delay so the new tab has time to read it.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const requiredMissing = SLOTS.filter((s) => s.required && !docFor(s.slot));

  const saveStep = () => {
    if (requiredMissing.length > 0) {
      toast.error(
        'Documents missing',
        `Still needed: ${requiredMissing.map((s) => s.label).join(', ')}.`,
      );
      return;
    }
    setStepStatus(session.userId, 'documents', 'verified');
    refresh();
    toast.success('Documents submitted', 'All required documents are on file.');
    navigate('/onboarding/consent');
  };

  return (
    <OnboardingLayout
      standalone={standalone}
      step="documents"
      title="Documents"
      description="Upload the documents that support the details you have given. PDF, JPG or PNG, up to 5 MB each."
      footer={
        <Button onClick={saveStep} disabled={requiredMissing.length > 0}>
          Save &amp; continue
        </Button>
      }
    >
      {/* Disclosed and asked from the PUBLISHED policy. Renders nothing while the policy
          attaches no consent purpose to this field, and starts asking the moment it does. */}
      <CollectionPointConsent
        element="identity"
        source="onboarding-documents"
        title="Before you upload your documents"
      />
      <div className="space-y-4">
        <InfoBanner tone="warning">
          <strong>No file leaves this browser.</strong> This demo records the name, size and type of
          what you choose and never stores or transfers the file itself — preview and download return
          a placeholder describing the upload.
        </InfoBanner>

        <ul className="space-y-3">
          {SLOTS.map(({ slot, label, hint, required }) => {
            const doc = docFor(slot);
            const busy = busySlot === slot;
            return (
              <li
                key={slot}
                className="flex flex-wrap items-center gap-3 rounded-control border border-border-subtle bg-surface p-4"
              >
                <span
                  className={
                    'grid h-10 w-10 shrink-0 place-items-center rounded-control ' +
                    (doc ? 'bg-status-verified-soft' : 'bg-surface-sunken')
                  }
                >
                  <FileText
                    className={'h-5 w-5 ' + (doc ? 'text-status-verified' : 'text-slate-400')}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    {label}
                    {!required && (
                      <span className="text-2xs font-normal text-slate-400">(optional)</span>
                    )}
                  </p>
                  {doc ? (
                    <p className="num truncate text-xs text-slate-500">
                      {doc.fileName} · {formatSize(doc.sizeBytes)} ·{' '}
                      {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">{hint}</p>
                  )}
                </div>

                {doc && <StatusBadge status={doc.status} />}

                <input
                  ref={(el) => {
                    inputs.current[slot] = el;
                  }}
                  type="file"
                  accept={ACCEPTED.join(',')}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(slot, file);
                    e.target.value = '';
                  }}
                />

                <div className="flex shrink-0 items-center gap-1">
                  {doc && (
                    <>
                      <button
                        type="button"
                        onClick={() => openPlaceholder(doc, false)}
                        aria-label={`Preview ${label}`}
                        // `press` on all three row actions here and in NomineeStep. They had a
                        // hover tint with no transition-property, so it snapped, and no pressed
                        // state — which on the delete button is the one place you most want to know
                        // the click registered, because the row it belonged to is about to vanish.
                        className="focus-ring press grid h-9 w-9 place-items-center rounded-control text-slate-500 hover:bg-surface-sunken hover:text-brand-600"
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => openPlaceholder(doc, true)}
                        aria-label={`Download ${label}`}
                        className="focus-ring press grid h-9 w-9 place-items-center rounded-control text-slate-500 hover:bg-surface-sunken hover:text-brand-600"
                      >
                        <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(slot, label)}
                        aria-label={`Remove ${label}`}
                        className="focus-ring press grid h-9 w-9 place-items-center rounded-control text-slate-500 hover:bg-status-rejected-soft hover:text-status-rejected"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </button>
                    </>
                  )}
                  <Button
                    variant={doc ? 'secondary' : 'primary'}
                    loading={busy}
                    onClick={() => inputs.current[slot]?.click()}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Upload className="h-4 w-4" strokeWidth={2} aria-hidden />
                      {doc ? 'Replace' : 'Upload'}
                    </span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </OnboardingLayout>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
