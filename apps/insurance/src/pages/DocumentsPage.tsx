// apps/insurance/src/pages/DocumentsPage.tsx — the documents already on file, read-only.
//
// Same reasoning as NomineesPage: banking captures documents, insurance reads them. An underwriter
// needs to SEE that a PAN card and address proof exist; it does not need a second upload button that
// would create a divergent copy of the same document.
import { useMemo } from 'react';
import { FileText, Upload } from 'lucide-react';
import { InfoBanner, KEYS, StatusBadge, read, useAuth, type VerificationStatus } from '@finsecure/shared';
import { bankingLink } from '../config';

interface StoredDoc {
  userId: string;
  slot: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  status: VerificationStatus;
}

const SLOT_LABELS: Record<string, string> = {
  pan: 'PAN card',
  aadhaar: 'Aadhaar',
  address: 'Address proof',
  photo: 'Photograph',
  signature: 'Signature',
  income: 'Income proof',
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const docs = useMemo(
    () => read<StoredDoc[]>(KEYS.documents, []).filter((d) => d.userId === user?.id),
    [user?.id],
  );
  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Documents</h1>
        <p className="mt-1 text-sm text-slate-500">
          What underwriting can see. Uploaded once in FinSecure Bank and shared from there.
        </p>
      </header>

      {docs.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
          <Upload className="mx-auto h-9 w-9 text-slate-300" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-800">No documents on file</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Upload them once in FinSecure Bank — insurance reads the same set, so nothing needs
            uploading twice.
          </p>
          <a
            href={bankingLink('/documents')}
            className="focus-ring press mt-4 inline-flex min-h-11 items-center rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Upload in FinSecure Bank →
          </a>
        </div>
      ) : (
        <>
          <InfoBanner tone="success">
            {docs.length} document{docs.length === 1 ? '' : 's'} read from your shared record.
          </InfoBanner>
          <ul className="space-y-3">
            {docs.map((doc) => (
              <li
                key={doc.slot}
                className="flex flex-wrap items-center gap-3 rounded-control border border-border-subtle bg-surface p-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-status-verified-soft">
                  <FileText className="h-5 w-5 text-status-verified" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {SLOT_LABELS[doc.slot] ?? doc.slot}
                  </p>
                  <p className="num truncate text-xs text-slate-500">
                    {doc.fileName} · {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <StatusBadge status={doc.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
