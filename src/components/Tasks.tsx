import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MoreHorizontal, Clock, Calendar as CalendarIcon, CheckCircle2, X, Circle } from 'lucide-react';
import { 
  DndContext, 
  DragEndEvent, 
  useDroppable, 
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MOCK_TASKS } from '../constants';
import { Task, TaskStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

const COLUMN_META: Record<TaskStatus, { color: string; dot: string; label: string }> = {
  todo:    { color: 'bg-black/[0.04]',  dot: 'bg-black/20',    label: '' },
  started: { color: 'bg-[#dbeafe]',     dot: 'bg-[#1d4ed8]',  label: '' },
  done:    { color: 'bg-emerald-50',    dot: 'bg-emerald-500', label: '' },
};

export default function Tasks() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'todo',    title: t('todo') },
    { id: 'started', title: t('started') },
    { id: 'done',    title: t('done') },
  ];

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      const rect = event.active.rect.current.initial;
      if (rect) setDragWidth(rect.width);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDragWidth(null);
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    setTasks(prev => prev.map(task => {
      if (task.id === taskId && task.status !== newStatus) {
        const updated = { ...task, status: newStatus };
        if (newStatus === 'started' && !task.startedAt)
          updated.startedAt = new Date().toISOString().split('T')[0];
        if (newStatus === 'done' && !task.finishedAt)
          updated.finishedAt = new Date().toISOString().split('T')[0];
        return updated;
      }
      return task;
    }));
  };

  const handleAddTask = (taskData: Omit<Task, 'id' | 'status'>) => {
    setTasks(prev => [...prev, { ...taskData, id: Math.random().toString(36).substr(2, 9), status: modalStatus }]);
    setIsModalOpen(false);
  };

  const openModal = (status: TaskStatus = 'todo') => {
    setModalStatus(status);
    setIsModalOpen(true);
  };

  const totalDone = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between mb-7 shrink-0"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black">{t('tasks_title')}</h1>
          <p className="text-black/40 text-sm mt-1">{t('tasks_subtitle')}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress pill */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-black/[0.06] shadow-sm">
            <div className="relative w-20 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="absolute inset-y-0 left-0 bg-[#1d4ed8] rounded-full"
              />
            </div>
            <span className="text-xs font-semibold text-black/40">{progress}% done</span>
          </div>

          <button
            onClick={() => openModal('todo')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white transition-all text-xs font-semibold shadow-sm shadow-blue-900/20"
          >
            <Plus size={15} />
            {t('new_task')}
          </button>
        </div>
      </motion.div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 grid grid-cols-3 gap-5 overflow-hidden">
          {columns.map((col, i) => (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <Column
                id={col.id}
                title={col.title}
                tasks={getTasksByStatus(col.id)}
                onAddTask={() => openModal(col.id)}
              />
            </motion.div>
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
        }}>
          {activeTask ? (
            <div style={{ width: dragWidth ? `${dragWidth}px` : 'auto' }}>
              <TaskCard task={activeTask} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {isModalOpen && (
          <AddTaskModal
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleAddTask}
            initialStatus={modalStatus}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Column({ id, title, tasks, onAddTask }: {
  id: TaskStatus; title: string; tasks: Task[]; onAddTask: () => void;
}) {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({ id });
  const meta = COLUMN_META[id];

  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <h3 className="font-semibold text-sm text-black">{title}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            id === 'started' ? 'bg-[#dbeafe] text-[#1d4ed8]' :
            id === 'done'    ? 'bg-emerald-50 text-emerald-600' :
                               'bg-black/[0.05] text-black/40'
          }`}>
            {tasks.length}
          </span>
        </div>
        <button className="text-black/20 hover:text-black/50 transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-2xl p-3 overflow-y-auto no-scrollbar flex flex-col gap-2.5 transition-all duration-200 border ${
          isOver
            ? 'bg-[#dbeafe]/30 border-[#1d4ed8]/20'
            : 'bg-white border-black/[0.06] shadow-sm'
        }`}
      >
        {tasks.map(task => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}

        <button
          onClick={onAddTask}
          className="w-full py-3 border border-dashed border-black/[0.08] rounded-xl text-black/25 hover:text-black/50 hover:border-black/20 transition-all flex items-center justify-center gap-1.5 text-xs font-medium group mt-1"
        >
          <Plus size={13} className="group-hover:scale-110 transition-transform" />
          {t('add_task')}
        </button>
      </div>
    </div>
  );
}

function DraggableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0 : 1 }}
      {...listeners}
      {...attributes}
    >
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, isDragging }: TaskCardProps) {
  const { t } = useLanguage();

  const importanceColor = task.importance >= 4
    ? 'bg-red-400'
    : task.importance >= 3
    ? 'bg-amber-400'
    : 'bg-black/15';

  return (
    <motion.div
      layoutId={task.id}
      whileHover={!isDragging ? { y: -2 } : {}}
      transition={{ duration: 0.15 }}
      className={`bg-white rounded-xl p-4 cursor-grab active:cursor-grabbing border border-black/[0.06] transition-all ${
        isDragging ? 'shadow-xl ring-1 ring-black/10 scale-[1.02]' : 'shadow-sm hover:shadow-md'
      } ${task.status === 'done' ? 'opacity-60' : ''}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <h4 className={`font-semibold text-sm leading-snug text-black flex-1 ${task.status === 'done' ? 'line-through text-black/40' : ''}`}>
          {task.title}
        </h4>
        {task.status === 'done' ? (
          <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
        ) : task.status === 'started' ? (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#1d4ed8] shrink-0 mt-0.5 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
          </div>
        ) : (
          <Circle size={15} className="text-black/15 shrink-0 mt-0.5" />
        )}
      </div>

      {task.description && (
        <p className="text-xs text-black/40 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-3 border-t border-black/[0.05]">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-black/30">
          <CalendarIcon size={10} />
          {task.dueDate}
        </div>

        {/* Importance dots */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(level => (
            <div
              key={level}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                level <= task.importance ? importanceColor : 'bg-black/[0.06]'
              }`}
            />
          ))}
        </div>
      </div>

      {task.status === 'started' && task.startedAt && (
        <p className="mt-2 text-[9px] font-semibold text-[#1d4ed8]/60 uppercase tracking-widest">
          {t('started_on')} {task.startedAt}
        </p>
      )}
      {task.status === 'done' && task.finishedAt && (
        <p className="mt-2 text-[9px] font-semibold text-emerald-500/60 uppercase tracking-widest">
          {t('finished_on')} {task.finishedAt}
        </p>
      )}
    </motion.div>
  );
}

function AddTaskModal({ onClose, onSubmit, initialStatus }: {
  onClose: () => void;
  onSubmit: (data: Omit<Task, 'id' | 'status'>) => void;
  initialStatus: TaskStatus;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [importance, setImportance] = useState<1|2|3|4|5>(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, dueDate, importance });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/10 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-black/[0.07] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.05]">
          <h2 className="text-base font-semibold text-black">{t('new_task')}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-black/[0.05] flex items-center justify-center transition-colors">
            <X size={15} className="text-black/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-2">{t('title')}</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('what_needs_done')}
              className="w-full bg-black/[0.03] border border-black/[0.07] rounded-xl px-4 py-3 text-sm text-black placeholder:text-black/25 outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-2">{t('description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('add_details')}
              rows={3}
              className="w-full bg-black/[0.03] border border-black/[0.07] rounded-xl px-4 py-3 text-sm text-black placeholder:text-black/25 outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]/30 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-2">{t('due_date')}</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-black/[0.03] border border-black/[0.07] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-2">{t('importance')}</label>
              <div className="flex gap-1.5 h-[46px] items-center">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setImportance(level as 1|2|3|4|5)}
                    className={`flex-1 h-6 rounded-full transition-all ${
                      level <= importance ? 'bg-[#1d4ed8]' : 'bg-black/[0.06]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3 bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white rounded-xl font-semibold text-sm transition-all shadow-sm shadow-blue-900/20"
            >
              {t('create_task')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
