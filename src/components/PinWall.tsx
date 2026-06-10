import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Plus, X} from 'lucide-react';
import {
  type PinNote,
  createPinNote,
  deletePinNote,
  fetchPinNotes,
  updatePinNote,
} from '../services/pinWallService';

const COLORS = [
  '#FEFF9C',
  '#FFB3C8',
  '#B5D8FB',
  '#C6F7C1',
  '#D5BCFE',
];

const COLOR_BORDERS: Record<string, string> = {
  '#FEFF9C': '#D4D000',
  '#FFB3C8': '#E07090',
  '#B5D8FB': '#6AAEE0',
  '#C6F7C1': '#6DC465',
  '#D5BCFE': '#A07DE0',
};

function randomRotation() {
  return parseFloat((Math.random() * 10 - 5).toFixed(2));
}

type DragState = {
  noteId: string;
  startPointerX: number;
  startPointerY: number;
  startXPct: number;
  startYPct: number;
};

export default function PinWall() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<PinNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    fetchPinNotes()
      .then(setNotes)
      .catch(err => {
        const e = err as Record<string, unknown>;
        const msg = typeof e?.message === 'string' ? e.message : JSON.stringify(err);
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    setError(null);
    const board = boardRef.current;
    const rect = board?.getBoundingClientRect();
    const x_pct = rect ? Math.min(80, Math.random() * 60 + 5) : 10;
    const y_pct = rect ? Math.min(75, Math.random() * 55 + 5) : 10;
    const tempId = `temp-${Date.now()}`;
    const optimistic: PinNote = {
      id: tempId,
      user_id: '',
      content: '',
      color: COLORS[0],
      x_pct,
      y_pct,
      rotation: randomRotation(),
      created_at: new Date().toISOString(),
    };
    setNotes(prev => [...prev, optimistic]);
    setEditingId(tempId);
    try {
      const note = await createPinNote({
        content: '',
        color: COLORS[0],
        x_pct,
        y_pct,
        rotation: optimistic.rotation,
      });
      setNotes(prev => prev.map(n => (n.id === tempId ? note : n)));
      setEditingId(note.id);
    } catch (err: unknown) {
      setNotes(prev => prev.filter(n => n.id !== tempId));
      setEditingId(null);
      const e = err as Record<string, unknown>;
      const msg =
        typeof e?.message === 'string' ? e.message
        : typeof e?.error_description === 'string' ? e.error_description
        : typeof e?.details === 'string' ? e.details
        : JSON.stringify(err);
      setError(msg.includes('relation') || msg.includes('does not exist') || msg.includes('42P01')
        ? 'Database table not set up yet — apply the Supabase migration first.'
        : msg);
    }
  };

  const handleDelete = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await deletePinNote(id);
    } catch {
      // best-effort
    }
  };

  const handleContentChange = (id: string, content: string) => {
    setNotes(prev => prev.map(n => (n.id === id ? {...n, content} : n)));
  };

  const handleContentBlur = async (id: string, content: string) => {
    setEditingId(null);
    try {
      await updatePinNote(id, {content});
    } catch {
      // best-effort
    }
  };

  const handleColorChange = async (id: string, color: string) => {
    setNotes(prev => prev.map(n => (n.id === id ? {...n, color} : n)));
    try {
      await updatePinNote(id, {color});
    } catch {
      // best-effort
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent, note: PinNote) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    if (editingId === note.id) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      noteId: note.id,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startXPct: note.x_pct,
      startYPct: note.y_pct,
    };
  }, [editingId]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const dx = ((e.clientX - drag.startPointerX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startPointerY) / rect.height) * 100;
    const x_pct = Math.max(0, Math.min(85, drag.startXPct + dx));
    const y_pct = Math.max(0, Math.min(85, drag.startYPct + dy));
    setNotes(prev =>
      prev.map(n => (n.id === drag.noteId ? {...n, x_pct, y_pct} : n))
    );
  }, []);

  const handlePointerUp = useCallback(async (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const note = notes.find(n => n.id === drag.noteId);
    if (!note) return;
    const dx = Math.abs(e.clientX - drag.startPointerX);
    const dy = Math.abs(e.clientY - drag.startPointerY);
    if (dx < 4 && dy < 4) {
      setEditingId(note.id);
      return;
    }
    try {
      await updatePinNote(note.id, {x_pct: note.x_pct, y_pct: note.y_pct});
    } catch {
      // best-effort
    }
  }, [notes]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-widest text-[#C4C9D4]">Pin Wall</p>
          <p className="text-[13px] font-medium text-[#6B7280] mt-0.5">
            {notes.length === 0 ? 'No notes yet' : `${notes.length} note${notes.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111827] text-white text-[12px] font-medium hover:bg-[#374151] transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} />
          Add
        </button>
      </div>

      {error && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
          <p className="text-[11.5px] text-red-600 leading-snug">{error}</p>
        </div>
      )}

      <div
        ref={boardRef}
        className="relative flex-1 mx-3 mb-3 rounded-2xl overflow-hidden select-none"
        style={{
          background: '#F5F0E8',
          backgroundImage:
            'radial-gradient(circle, #C8BFA880 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#9CA3AF] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <p className="text-[13px] text-[#9CA3AF]">Your wall is empty</p>
            <p className="text-[11px] text-[#C4C9D4]">Press Add to place your first note</p>
          </div>
        )}

        {notes.map(note => {
          const isEditing = editingId === note.id;
          const borderColor = COLOR_BORDERS[note.color] ?? '#bbb';
          return (
            <div
              key={note.id}
              onPointerDown={e => handlePointerDown(e, note)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                position: 'absolute',
                left: `${note.x_pct}%`,
                top: `${note.y_pct}%`,
                width: 148,
                transform: isEditing ? 'rotate(0deg) scale(1.03)' : `rotate(${note.rotation}deg)`,
                transition: isEditing ? 'transform 0.15s ease' : undefined,
                cursor: isEditing ? 'default' : 'grab',
                zIndex: isEditing ? 50 : 10,
                filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.18))',
              }}
            >
              {/* Pin dot */}
              <div
                style={{
                  position: 'absolute',
                  top: -7,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#D97706',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  background: note.color,
                  borderRadius: 4,
                  padding: '6px 6px 10px',
                  border: `1.5px solid ${borderColor}`,
                  minHeight: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {/* Note top bar */}
                <div className="flex items-center justify-between gap-1" data-no-drag="1">
                  <div className="flex gap-1">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => handleColorChange(note.id, c)}
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          background: c,
                          border: note.color === c ? `1.5px solid ${COLOR_BORDERS[c]}` : '1.5px solid transparent',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors"
                    style={{flexShrink: 0}}
                  >
                    <X size={9} strokeWidth={2.5} style={{color: '#5f5f5f'}} />
                  </button>
                </div>

                {/* Note content */}
                <div data-no-drag="1" style={{flex: 1}}>
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={note.content}
                      onChange={e => handleContentChange(note.id, e.target.value)}
                      onBlur={e => handleContentBlur(note.id, e.currentTarget.value)}
                      placeholder="Write something…"
                      style={{
                        width: '100%',
                        minHeight: 80,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: '#1f2937',
                        fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <p
                      style={{
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: note.content ? '#1f2937' : '#9ca3af',
                        minHeight: 80,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        userSelect: 'none',
                      }}
                    >
                      {note.content || 'Tap to edit…'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
