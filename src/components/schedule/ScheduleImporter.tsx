import {FileImage, FileText} from 'lucide-react';
import {useRef, useState} from 'react';
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
  return `Imported ${now.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}`;
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

const INPUT =
  'mt-1 w-full rounded-xl border border-black/[0.08] bg-white/80 px-3 py-2 text-[13px] text-[#1e293b] outline-none focus:border-rose-200/70 focus:ring-2 focus:ring-rose-50/80 placeholder:text-[#9CA3AF]';

const MODES = [
  {
    id: 'image' as const,
    Icon: FileImage,
    title: 'Upload image',
    desc: 'Use a screenshot or photo of your timetable.',
  },
  {
    id: 'pdf' as const,
    Icon: FileText,
    title: 'Upload PDF',
    desc: 'Use a school, university, or work planning PDF.',
  },
];

export default function ScheduleImporter({onSaveManual}: Props) {
  const [mode, setMode] = useState<'image' | 'pdf'>('image');
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
    if (mode === 'image') {
      setImagePreviewUrl(URL.createObjectURL(next));
    } else {
      const count = await estimatePdfPageCount(next);
      setPdfPageCount(count > 0 ? count : null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setExtractError('File exceeds 10 MB limit.');
      return;
    }
    setExtracting(true);
    setExtractError(null);
    try {
      const extracted = await extractScheduleFromFile(file);
      setDraft(extracted);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Couldn't extract a schedule from this file.",
      );
    } finally {
      setExtracting(false);
    }
  };

  if (draft) {
    return (
      <SchedulePreviewEditor
        initialEvents={draft}
        sourceType={mode}
        scheduleName={scheduleName.trim() || defaultScheduleName()}
        onCancel={() => setDraft(null)}
        onConfirm={async (events, metadata) => {
          await onSaveManual(events, metadata);
          setDraft(null);
          await setSelectedFile(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Mode selection */}
      <div className="grid grid-cols-2 gap-2.5">
        {MODES.map(({id, Icon, title, desc}) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                void setSelectedFile(null);
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-rose-200/80 bg-rose-50/60 shadow-[0_2px_8px_-2px_rgba(244,114,182,0.12)]'
                  : 'border-black/[0.06] bg-white/60 hover:bg-white/90'
              }`}
            >
              <div
                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${
                  active
                    ? 'border-rose-200/60 bg-white text-rose-500'
                    : 'border-black/[0.06] bg-white text-[#6B7280]'
                }`}
              >
                <Icon size={15} />
              </div>
              <div className={`text-[13px] font-semibold ${active ? 'text-rose-700' : 'text-[#111827]'}`}>
                {title}
              </div>
              <div className="mt-0.5 text-[12px] text-[#9CA3AF]">{desc}</div>
            </button>
          );
        })}
      </div>

      {/* File upload */}
      <div className="space-y-3 rounded-2xl border border-black/[0.05] bg-white/60 p-4">
        <p className="text-[12.5px] text-[#6B7280]">
          {mode === 'image'
            ? 'Drop or pick a clear photo. Noted will read the timetable and let you review it before saving.'
            : 'Upload a PDF from your school portal, work planner, or scheduling tool. You can review everything before saving.'}
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-black/[0.07] bg-white px-3.5 py-2 text-[12.5px] font-medium text-[#374151] transition hover:bg-white/80"
            onClick={() => {
              if (mode === 'image') imageInputRef.current?.click();
              else pdfInputRef.current?.click();
            }}
          >
            Choose file
          </button>
          {file ? (
            <span className="text-[12px] text-[#6B7280]">
              <span className="font-medium text-[#374151]">{file.name}</span>
            </span>
          ) : (
            <span className="text-[12px] text-[#9CA3AF]">No file selected</span>
          )}
        </div>

        {mode === 'image' && imagePreviewUrl && (
          <div className="overflow-hidden rounded-xl border border-black/[0.05]">
            <img
              src={imagePreviewUrl}
              alt="Schedule preview"
              className="max-h-48 w-auto object-contain"
            />
          </div>
        )}

        {mode === 'pdf' && file && (
          <p className="text-[12px] text-[#9CA3AF]">
            {pdfPageCount ? `${pdfPageCount} page${pdfPageCount === 1 ? '' : 's'} detected` : 'PDF selected'}
          </p>
        )}

        {extractError && (
          <p className="rounded-xl bg-rose-50/80 px-3 py-2 text-[12px] text-rose-700">{extractError}</p>
        )}

        <button
          type="button"
          disabled={!file || extracting}
          className="flex items-center gap-2 rounded-2xl bg-[#18181b] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
          onClick={() => void handleExtract()}
        >
          {extracting && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {extracting ? 'Reading schedule...' : 'Read schedule'}
        </button>
      </div>

      {/* Schedule name */}
      <label className="block">
        <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
          Schedule name
        </span>
        <input
          className={INPUT}
          value={scheduleName}
          onChange={e => setScheduleName(e.target.value)}
          placeholder="e.g. School timetable, Work shifts"
        />
      </label>
    </div>
  );
}
