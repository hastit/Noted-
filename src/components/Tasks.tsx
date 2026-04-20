import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MoreHorizontal, Clock, Calendar as CalendarIcon, CheckCircle2, X, Circle, Book, ExternalLink, Pencil } from 'lucide-react';
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
import { Task, TaskStatus, Notebook, TabType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileFab from './MobileFab';

export type RemoteTasksBridge = {
  create: (partial: Omit<Task, 'id' | 'status'>, status: TaskStatus) => Promise<Task>;
  update: (task: Task) => Promise<void>;
};

interface TasksProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  notebooks: Notebook[];
  remoteTasks?: RemoteTasksBridge;
  onNavigate: (tab: TabType, notebookId?: string) => void;
}

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  linkedNotebook?: Notebook;
  onNavigateToNotebook?: () => void;
  onEdit?: () => void;
}

const COLUMN_META: Record<TaskStatus, { color: string; dot: string; label: string }> = {
  todo:    { color: 'bg-black/[0.04]',  dot: 'bg-black/20',    label: '' },
  started: { color: 'bg-[#dbeafe]',     dot: 'bg-[#1d4ed8]',  label: '' },
  done:    { color: 'bg-emerald-50',    dot: 'bg-emerald-500', label: '' },
};

export default function Tasks({ tasks, onTasksChange, notebooks, remoteTasks, onNavigate }: TasksProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [mobileTaskTab, setMobileTaskTab] = useState<TaskStatus>('todo');

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
    const prevById = new Map(tasks.map(t => [t.id, t]));
    const prevMoved = prevById.get(taskId);
    const next = tasks.map(task => {
      if (task.id === taskId && task.status !== newStatus) {
        const updated = {...task, status: newStatus};
        if (newStatus === 'started' && !task.startedAt)
          updated.startedAt = new Date().toISOString().split('T')[0];
        if (newStatus === 'done' && !task.finishedAt)
          updated.finishedAt = new Date().toISOString().split('T')[0];
        return updated;
      }
      return task;
    });
    onTasksChange(next);
    const moved = next.find(t => t.id === taskId);
    if (remoteTasks && moved && prevMoved && prevMoved.status !== moved.status) {
      void remoteTasks.update(moved).catch(err => console.error(err));
    }
  };

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'status'>) => {
    if (remoteTasks) {
      try {
        const created = await remoteTasks.create(taskData, modalStatus);
        onTasksChange([...tasks, created]);
      } catch (e) {
        console.error(e);
      }
    } else {
      onTasksChange([...tasks, {...taskData, id: Math.random().toString(36).substr(2, 9), status: modalStatus}]);
    }
    setIsModalOpen(false);
  };

  const handleEditTask = async (taskData: Omit<Task, 'id' | 'status'>) => {
    if (!editingTask) return;
    const merged = {...editingTask, ...taskData};
    if (remoteTasks) {
      try {
        await remoteTasks.update(merged);
      } catch (e) {
        console.error(e);
        return;
      }
    }
    onTasksChange(tasks.map(t => (t.id === editingTask.id ? merged : t)));
    setEditingTask(null);
  };

  const openModal = (status: TaskStatus = 'todo') => {
    setModalStatus(status);
    setIsModalOpen(true);
  };

  const setTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const prevById = new Map(tasks.map(x => [x.id, x]));
    const prevMoved = prevById.get(taskId);
    const next = tasks.map(task => {
      if (task.id === taskId && task.status !== newStatus) {
        const updated = {...task, status: newStatus};
        if (newStatus === 'started' && !task.startedAt)
          updated.startedAt = new Date().toISOString().split('T')[0];
        if (newStatus === 'done' && !task.finishedAt)
          updated.finishedAt = new Date().toISOString().split('T')[0];
        return updated;
      }
      return task;
    });
    onTasksChange(next);
    const moved = next.find(x => x.id === taskId);
    if (remoteTasks && moved && prevMoved && prevMoved.status !== moved.status) {
      void remoteTasks.update(moved).catch(err => console.error(err));
    }
  };

  const totalDone = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  if (isMobile) {
    return (
      <div className="h-full min-h-0 flex flex-col overflow-x-hidden relative px-0 pb-1">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-2.5 mb-3 shrink-0 min-w-0"
        >
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight text-black truncate leading-tight">{t('tasks_title')}</h1>
            <p className="text-[13px] text-black/45 mt-0.5 leading-snug">{t('tasks_subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg bg-white border border-black/[0.06]">
            <div className="relative flex-1 h-1 bg-black/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                className="absolute inset-y-0 left-0 bg-[#1d4ed8] rounded-full"
              />
            </div>
            <span className="text-[11px] font-semibold text-black/40 tabular-nums">{progress}%</span>
          </div>

          <div className="flex rounded-lg bg-black/[0.05] p-0.5 gap-0.5">
            {columns.map(col => {
              const active = mobileTaskTab === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileTaskTab(col.id)}
                  className={`flex-1 min-h-9 rounded-md text-[11px] font-semibold transition-colors ${
                    active ? 'bg-white text-black shadow-sm' : 'text-black/40 active:text-black/60'
                  }`}
                >
                  {col.title}
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2 [scrollbar-width:thin]">
          {getTasksByStatus(mobileTaskTab).map(task => {
            const linkedNotebook = notebooks.find(nb => nb.id === task.notebookId);
            const dotClass = COLUMN_META[task.status].dot;
            return (
              <div
                key={task.id}
                className={`rounded-xl border border-black/[0.06] bg-white px-2.5 py-2.5 shadow-sm ${
                  task.status === 'done' ? 'opacity-55' : ''
                }`}
              >
                <div className="flex gap-2.5">
                  <div className="mt-1.5 shrink-0 w-2 flex justify-center">
                    <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setEditingTask(task)}
                      className="text-left w-full"
                    >
                      <p
                        className={`text-[13px] font-normal leading-snug ${
                          task.status === 'done' ? 'line-through text-black/40' : 'text-black'
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-[11px] text-black/38 mt-1 flex items-center gap-1">
                        <CalendarIcon size={11} className="shrink-0 opacity-60" />
                        {task.dueDate}
                      </p>
                      {task.description ? (
                        <p className="text-[11px] text-black/35 line-clamp-2 mt-1">{task.description}</p>
                      ) : null}
                    </button>
                    {linkedNotebook && task.notebookId ? (
                      <button
                        type="button"
                        onClick={() => onNavigate('notes', task.notebookId)}
                        className="mt-1.5 text-[11px] font-medium text-[#1d4ed8]"
                      >
                        {linkedNotebook.title}
                      </button>
                    ) : null}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(['todo', 'started', 'done'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTaskStatus(task.id, s)}
                          className={`min-h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors ${
                            task.status === s
                              ? 'bg-black text-white border-black'
                              : 'bg-black/[0.03] text-black/45 border-black/[0.08] active:bg-black/[0.07]'
                          }`}
                        >
                          {s === 'todo' ? t('todo') : s === 'started' ? t('started') : t('done')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {getTasksByStatus(mobileTaskTab).length === 0 && (
            <p className="text-center text-[13px] text-black/35 py-8">{t('add_task')}</p>
          )}
        </div>

        {!isModalOpen && !editingTask && (
          <MobileFab label={t('new_task')} onClick={() => openModal(mobileTaskTab)} />
        )}

        <AnimatePresence>
          {isModalOpen && (
            <AddTaskModal
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleAddTask}
              initialStatus={modalStatus}
              notebooks={notebooks}
            />
          )}
          {editingTask && (
            <AddTaskModal
              onClose={() => setEditingTask(null)}
              onSubmit={handleEditTask}
              initialStatus={editingTask.status}
              notebooks={notebooks}
              existingTask={editingTask}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-x-hidden">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5 sm:mb-7 shrink-0 min-w-0"
      >
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black truncate">{t('tasks_title')}</h1>
          <p className="text-black/40 text-sm mt-1">{t('tasks_subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Progress pill */}
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2 rounded-xl bg-white border border-black/[0.06] shadow-sm">
            <div className="relative w-16 sm:w-20 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="absolute inset-y-0 left-0 bg-[#1d4ed8] rounded-full"
              />
            </div>
            <span className="text-xs font-semibold text-black/40 whitespace-nowrap">{progress}% done</span>
          </div>

          <button
            onClick={() => openModal('todo')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white transition-all text-xs font-semibold shadow-sm shadow-blue-900/20"
          >
            <Plus size={15} />
            {t('new_task')}
          </button>
        </div>
      </motion.div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 grid grid-cols-3 gap-4 md:gap-5 overflow-hidden min-h-0">
          {columns.map((col, i) => (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="flex flex-col min-h-0"
            >
              <Column
                id={col.id}
                title={col.title}
                tasks={getTasksByStatus(col.id)}
                notebooks={notebooks}
                onAddTask={() => openModal(col.id)}
                onNavigate={onNavigate}
                onEditTask={setEditingTask}
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
            notebooks={notebooks}
          />
        )}
        {editingTask && (
          <AddTaskModal
            onClose={() => setEditingTask(null)}
            onSubmit={handleEditTask}
            initialStatus={editingTask.status}
            notebooks={notebooks}
            existingTask={editingTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Column({ id, title, tasks, notebooks, onAddTask, onNavigate, onEditTask }: {
  id: TaskStatus; title: string; tasks: Task[]; notebooks: Notebook[]; onAddTask: () => void;
  onNavigate: (tab: TabType, notebookId?: string) => void;
  onEditTask: (task: Task) => void;
}) {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({ id });
  const meta = COLUMN_META[id];

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1 gap-2 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <h3 className="font-semibold text-sm text-black truncate">{title}</h3>
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
        className={`flex-1 min-h-0 rounded-2xl p-3 overflow-y-auto overflow-x-hidden flex flex-col gap-2.5 transition-all duration-200 border [scrollbar-width:thin] ${
          isOver
            ? 'bg-[#dbeafe]/30 border-[#1d4ed8]/20'
            : 'bg-white border-black/[0.06] shadow-sm'
        }`}
      >
        {tasks.map(task => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            linkedNotebook={notebooks.find(nb => nb.id === task.notebookId)}
            onNavigateToNotebook={task.notebookId ? () => onNavigate('notes', task.notebookId) : undefined}
            onEdit={() => onEditTask(task)}
          />
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

interface DraggableTaskCardProps {
  task: Task;
  linkedNotebook?: Notebook;
  onNavigateToNotebook?: () => void;
  onEdit?: () => void;
}

const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({ task, linkedNotebook, onNavigateToNotebook, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0 : 1 }}
      {...listeners}
      {...attributes}
    >
      <TaskCard
        task={task}
        linkedNotebook={linkedNotebook}
        onNavigateToNotebook={onNavigateToNotebook}
        onEdit={onEdit}
      />
    </div>
  );
}

function TaskCard({ task, isDragging, linkedNotebook, onNavigateToNotebook, onEdit }: TaskCardProps) {
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
      className={`group/card bg-white rounded-xl p-4 cursor-grab active:cursor-grabbing border border-black/[0.06] transition-all ${
        isDragging ? 'shadow-xl ring-1 ring-black/10 scale-[1.02]' : 'shadow-sm hover:shadow-md'
      } ${task.status === 'done' ? 'opacity-60' : ''}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <h4 className={`font-semibold text-sm leading-snug text-black flex-1 min-w-0 truncate ${task.status === 'done' ? 'line-through text-black/40' : ''}`}>
          {task.title}
        </h4>
        <div className="flex items-center gap-1.5 shrink-0">
          {onEdit && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="opacity-0 group-hover/card:opacity-100 p-1 rounded-md hover:bg-black/[0.06] text-black/20 hover:text-black/50 transition-all"
              title="Edit task"
            >
              <Pencil size={12} />
            </button>
          )}
        {task.status === 'done' ? (
          <CheckCircle2 size={15} className="text-emerald-500 mt-0.5" />
        ) : task.status === 'started' ? (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#1d4ed8] mt-0.5 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
          </div>
        ) : (
          <Circle size={15} className="text-black/15 mt-0.5" />
        )}
        </div>
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

      {/* Linked notebook badge */}
      {linkedNotebook && onNavigateToNotebook && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onNavigateToNotebook(); }}
          className="mt-3 w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 active:scale-95"
          style={{ backgroundColor: linkedNotebook.color }}
        >
          <Book size={10} className="shrink-0 text-black/50" />
          <span className="truncate text-black/60">{linkedNotebook.title}</span>
          <ExternalLink size={9} className="ml-auto shrink-0 text-black/30" />
        </button>
      )}
    </motion.div>
  );
}

function AddTaskModal({ onClose, onSubmit, initialStatus, notebooks, existingTask }: {
  onClose: () => void;
  onSubmit: (data: Omit<Task, 'id' | 'status'>) => void | Promise<void>;
  initialStatus: TaskStatus;
  notebooks: Notebook[];
  existingTask?: Task;
}) {
  const { t } = useLanguage();
  const isEditing = !!existingTask;
  const [title, setTitle] = useState(existingTask?.title ?? '');
  const [description, setDescription] = useState(existingTask?.description ?? '');
  const [dueDate, setDueDate] = useState(existingTask?.dueDate ?? new Date().toISOString().split('T')[0]);
  const [importance, setImportance] = useState<1|2|3|4|5>(existingTask?.importance ?? 3);
  const [notebookId, setNotebookId] = useState<string>(existingTask?.notebookId ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await Promise.resolve(
      onSubmit({title, description, dueDate, importance, notebookId: notebookId || undefined}),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-end md:items-center justify-center p-0 md:p-8 bg-black/10 backdrop-blur-sm md:z-[100]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md max-h-[min(90dvh,100dvh)] md:max-h-none overflow-y-auto overscroll-contain bg-white rounded-t-3xl md:rounded-2xl shadow-xl border border-black/[0.07] overflow-x-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-5 border-b border-black/[0.05]">
          <h2 className="text-base font-semibold text-black">{isEditing ? 'Edit Task' : t('new_task')}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-black/[0.05] flex items-center justify-center transition-colors">
            <X size={15} className="text-black/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-md:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-2">{t('due_date')}</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full min-h-11 bg-black/[0.03] border border-black/[0.07] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-2">{t('importance')}</label>
              <div className="flex gap-1.5 min-h-11 h-auto items-center">
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

          {/* Notebook linker */}
          {notebooks.length > 0 && (
            <div>
              <label className="block text-[10px] font-semibold text-black/30 uppercase tracking-widest mb-2">
                Link to Notebook <span className="normal-case font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setNotebookId('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    !notebookId ? 'bg-black text-white' : 'bg-black/[0.04] text-black/40 hover:bg-black/[0.08]'
                  }`}
                >
                  None
                </button>
                {notebooks.map(nb => (
                  <button
                    key={nb.id}
                    type="button"
                    onClick={() => setNotebookId(nb.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      notebookId === nb.id ? 'ring-2 ring-black/25 scale-105' : 'hover:opacity-80'
                    }`}
                    style={{ backgroundColor: nb.color }}
                  >
                    <Book size={10} className="text-black/50" />
                    <span className="text-black/70">{nb.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              className="w-full min-h-12 py-3 bg-[#1d4ed8] active:bg-[#1e3a8a] text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-blue-900/20"
            >
              {isEditing ? 'Save Changes' : t('create_task')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
