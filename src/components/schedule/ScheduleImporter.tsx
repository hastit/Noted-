import {FileImage, FileText, PenSquare} from 'lucide-react';
import {useRef, useState} from 'react';
import ManualScheduleForm from './ManualScheduleForm';
import SchedulePreviewEditor from './SchedulePreviewEditor';
import {extractScheduleFromFile} from '../../utils/scheduleExtraction';
import type {DraftRecurringEvent, RecurringColorCategory} from '../../types/recurringSchedule';

type Props = {
  onSaveManual: (
    entries: Array<{
      title: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      colorCategory: RecurringColorCategory;
    }>,
    metadata: {
      startDate: string;
      endDate: string | null;
      scheduleName: string;
      sourceType: 'image' | 'pdf' | 'manual';
      replaceAll: boolean;
    },
  ) => Promise<void>;
};

function defaultScheduleName() {
  const now = new Date();
  return `Schedule imported ${now.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}`;
}

async function estimatePdfPageCount(file: File) {
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buffer);
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches?.length ?? 0;
  } catch {
    return 0;
  }
}

export default function ScheduleImporter({onSaveManual}: Props) {
  const [tab, setTab] = useState<'image' | 'pdf' | 'manual'>('manual');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRecurringEvent[] | null>(null);
  const [scheduleName, setScheduleName] = useState(defaultScheduleName());
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const setSelectedFile = async (next: File | null) => {
    setFile(next);
    setExtractError(null);
    setDraft(null);
    setPdfPageCount(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (!next) return;
    if (tab === 'image') {
      setImagePreviewUrl(URL.createObjectURL(next));
      return;
    }
    if (tab === 'pdf') {
      const count = await estimatePdfPageCount(next);
      setPdfPageCount(count > 0 ? count : null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setExtractError('File exceeds 10MB limit.');
      return;
    }
    setExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractScheduleFromFile(file);
      setDraft(extracted);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Couldn't extract schedule from this file.");
    } finally {
      setExtracting(false);
    }
  };

  const extractEnabled = Boolean(file) && !extracting;
  const inputClass =
    'mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none focus:border-[#60A5FA] focus:ring-4 focus:ring-[#DBEAFE]';
  const modes = [
    {id: 'image' as const, title: 'Image upload', desc: 'Upload a photo of your schedule', icon: FileImage},
    {id: 'pdf' as const, title: 'PDF upload', desc: 'Upload a PDF (school portal, work shifts...)', icon: FileText},
    {id: 'manual' as const, title: 'Manual entry', desc: 'Type each event yourself', icon: PenSquare},
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-[#111827]">Three ways to add your schedule — pick whichever is easiest.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {modes.map(item => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                void setSelectedFile(null);
              }}
              className={`rounded-2xl border p-3 text-left transition ${
                active
                  ? 'border-[#93C5FD] bg-[#EFF6FF] shadow-sm'
                  : 'border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'
              }`}
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm">
                <Icon size={16} />
              </div>
              <div className="mt-2 text-sm font-semibold text-[#111827]">{item.title}</div>
              <div className="mt-1 text-xs text-[#6B7280]">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {draft ? (
        <SchedulePreviewEditor
          initialEvents={draft}
          sourceType={tab === 'image' ? 'image' : tab === 'pdf' ? 'pdf' : 'manual'}
          scheduleName={scheduleName.trim() || defaultScheduleName()}
          onCancel={() => setDraft(null)}
          onConfirm={async (events, metadata) => {
            await onSaveManual(events, metadata);
            setDraft(null);
            await setSelectedFile(null);
          }}
        />
      ) : null}

      {tab === 'manual' ? (
        <ManualScheduleForm
          onSave={(entries, metadata) =>
            onSaveManual(entries, {
              ...metadata,
              scheduleName: scheduleName.trim() || defaultScheduleName(),
              sourceType: 'manual',
              replaceAll: false,
            })
          }
        />
      ) : null}

      {(tab === 'image' || tab === 'pdf') && !draft ? (
        <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <h3 className="text-sm font-semibold text-[#111827]">
            {tab === 'image' ? 'Upload an image of your schedule' : 'Upload a PDF of your schedule'}
          </h3>
          <p className="text-xs text-[#6B7280]">
            {tab === 'image'
              ? 'Drop or pick a clear photo. The AI will read the timetable and let you review before saving.'
              : 'Upload a PDF from your school portal or work planner. You can review every row before saving.'}
          </p>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/heic,image/heif"
            onChange={e => void setSelectedFile(e.target.files?.[0] ?? null)}
            style={{display: 'none'}}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            onChange={e => void setSelectedFile(e.target.files?.[0] ?? null)}
            style={{display: 'none'}}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB]"
              onClick={() => {
                if (tab === 'image') imageInputRef.current?.click();
                else pdfInputRef.current?.click();
              }}
            >
              Choose file
            </button>
            {file ? (
              <span className="text-xs text-[#6B7280]">
                Selected: <span className="font-semibold text-[#374151]">{file.name}</span>
              </span>
            ) : (
              <span className="text-xs text-[#9CA3AF]">No file selected</span>
            )}
          </div>

          {tab === 'image' && imagePreviewUrl && (
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-2">
              <img src={imagePreviewUrl} alt="Schedule preview" className="max-h-48 w-auto rounded-md object-contain" />
            </div>
          )}

          {tab === 'pdf' && file && (
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-2 text-xs text-[#6B7280]">
              PDF preview: {pdfPageCount ? `${pdfPageCount} page(s)` : 'Page count unavailable'}.
            </div>
          )}

          {extractError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{extractError}</div>}

          <button
            type="button"
            disabled={!extractEnabled}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void handleExtract()}
          >
            {extracting && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {extracting ? 'Extracting...' : 'Extract schedule'}
          </button>
        </div>
      ) : null}

      <label className="block text-xs font-medium text-[#4B5563]">
        Schedule name
        <input
          value={scheduleName}
          onChange={e => setScheduleName(e.target.value)}
          placeholder="e.g., Spring 2026 timetable"
          className={inputClass}
        />
      </label>
    </div>
  );
}
