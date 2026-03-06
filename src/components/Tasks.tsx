import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MoreHorizontal, Clock, Calendar as CalendarIcon, CheckCircle2, X } from 'lucide-react';
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

export default function Tasks() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'todo', title: t('todo') },
    { id: 'started', title: t('started') },
    { id: 'done', title: t('done') },
  ];

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
      const rect = active.rect.current.initial;
      if (rect) {
        setDragWidth(rect.width);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDragWidth(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId && task.status !== newStatus) {
          const updatedTask = { ...task, status: newStatus };
          if (newStatus === 'started' && !task.startedAt) {
            updatedTask.startedAt = new Date().toISOString().split('T')[0];
          }
          if (newStatus === 'done' && !task.finishedAt) {
            updatedTask.finishedAt = new Date().toISOString().split('T')[0];
          }
          return updatedTask;
        }
        return task;
      })
    );
  };

  const handleAddTask = (taskData: Omit<Task, 'id' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substr(2, 9),
      status: modalStatus,
    };
    setTasks(prev => [...prev, newTask]);
    setIsModalOpen(false);
  };

  const openModal = (status: TaskStatus = 'todo') => {
    setModalStatus(status);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col gap-8">
      <div className="flex items-end justify-between mb-12 pt-4">
        <div>
          <h1 className="text-5xl font-bold tracking-tight mb-2 uppercase">{t('tasks_title')}</h1>
          <p className="text-muted text-sm font-bold uppercase tracking-widest opacity-60">{t('tasks_subtitle')}</p>
        </div>
        <button 
          onClick={() => openModal('todo')}
          className="px-8 h-14 bg-ink text-canvas rounded-pill flex items-center gap-3 hover:scale-105 transition-transform font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-black/10"
        >
          <Plus size={24} />
          <span>{t('new_task')}</span>
        </button>
      </div>

      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pb-8">
          {columns.map((column) => (
            <Column 
              key={column.id} 
              id={column.id} 
              title={column.title} 
              tasks={getTasksByStatus(column.id)} 
              onAddTask={() => openModal(column.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
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

interface ColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onAddTask: () => void;
  key?: string | number;
}

function Column({ id, title, tasks, onAddTask }: ColumnProps) {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold uppercase tracking-tight">{title}</h3>
          <span className="text-[11px] font-bold bg-ink text-canvas px-3 py-1 rounded-full tracking-[0.2em] shadow-sm">
            {tasks.length}
          </span>
        </div>
        <button className="w-10 h-10 rounded-xl hover:bg-black/5 flex items-center justify-center text-muted hover:text-ink transition-all">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div 
        ref={setNodeRef}
        className={`flex-1 bg-surface/50 rounded-[32px] p-6 overflow-y-auto no-scrollbar flex flex-col gap-6 transition-all duration-300 border border-black/5 ${
          isOver ? 'bg-black/5 ring-2 ring-black/5 scale-[1.01]' : ''
        }`}
      >
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}
        
        <button 
          onClick={onAddTask}
          className="w-full py-6 border-2 border-dashed border-black/10 rounded-[24px] text-muted hover:text-ink hover:border-black/20 transition-all flex flex-col items-center justify-center gap-3 group bg-white/30"
        >
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
            <Plus size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{t('add_task')}</span>
        </button>
      </div>
    </div>
  );
}

interface DraggableTaskCardProps {
  task: Task;
  key?: string | number;
}

function DraggableTaskCard({ task }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, isDragging }: TaskCardProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      layoutId={task.id}
      whileHover={!isDragging ? { y: -4, scale: 1.02 } : {}}
      className={`bg-canvas p-8 rounded-[28px] cursor-grab active:cursor-grabbing group border border-black/5 transition-all ${
        isDragging ? 'shadow-2xl ring-2 ring-black/5 scale-105 z-50' : 'shadow-sm hover:shadow-xl hover:shadow-black/5'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-lg font-bold leading-tight pr-6 group-hover:text-ink/70 transition-colors tracking-tight">{task.title}</h4>
        <div className="flex gap-1 pt-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div 
              key={level}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                level <= task.importance 
                  ? 'bg-ink scale-110' 
                  : 'bg-black/5'
              }`}
            />
          ))}
        </div>
      </div>
      
      {task.description && (
        <p className="text-sm font-medium text-muted line-clamp-3 mb-6 leading-relaxed opacity-80">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-5 border-t border-black/5">
        <div className="flex items-center gap-3 text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
          <CalendarIcon size={14} className="opacity-40" />
          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </div>
        
        {task.status === 'done' ? (
          <div className="w-10 h-10 rounded-xl bg-ink text-canvas flex items-center justify-center shadow-lg">
            <CheckCircle2 size={20} />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-ink/20 group-hover:text-ink/40 transition-all border border-black/5">
            <Clock size={20} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AddTaskModal({ 
  onClose, 
  onSubmit,
  initialStatus 
}: { 
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-xl bg-canvas rounded-[48px] overflow-hidden p-12 shadow-2xl border border-black/5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-4xl font-bold tracking-tight uppercase">{t('new_task')}</h2>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-surface rounded-full transition-all border border-black/5">
            <X size={24} className="text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.3em] mb-4">{t('title')}</label>
            <input 
              autoFocus
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('what_needs_done')}
              className="w-full bg-surface border border-black/5 outline-none rounded-3xl px-8 py-5 text-lg placeholder:text-muted focus:ring-4 ring-black/5 transition-all font-bold uppercase tracking-tight"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.3em] mb-4">{t('description')}</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('add_details')}
              rows={4}
              className="w-full bg-surface border border-black/5 outline-none rounded-3xl px-8 py-5 text-lg placeholder:text-muted focus:ring-4 ring-black/5 transition-all resize-none font-medium leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.3em] mb-4">{t('due_date')}</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-surface border border-black/5 outline-none rounded-3xl px-8 py-5 text-lg focus:ring-4 ring-black/5 transition-all font-bold uppercase tracking-tight"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.3em] mb-4">{t('importance')}</label>
              <div className="flex gap-2 h-[68px] items-center bg-surface rounded-3xl px-4 border border-black/5">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setImportance(level as 1|2|3|4|5)}
                    className={`flex-1 h-8 rounded-2xl transition-all ${
                      level <= importance ? 'bg-ink shadow-lg scale-105' : 'bg-white/50 hover:bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              className="w-full py-6 bg-ink text-canvas rounded-pill font-bold text-lg shadow-2xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em]"
            >
              {t('create_task')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}


