import type {Task} from '../types';

export function getDatedTasks(tasks: Task[]) {
  return tasks
    .filter(task => Boolean(task.dueDate))
    .map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      status: task.status,
    }));
}
