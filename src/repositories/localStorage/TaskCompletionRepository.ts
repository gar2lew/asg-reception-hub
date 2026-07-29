import type { TaskCompletion } from '../../models';
import type { ITaskCompletionRepository } from '../interfaces/ITaskCompletionRepository';
import { getItem, setItem } from '../../utils/storage';
const KEY = 'task_completions';
export class TaskCompletionRepository implements ITaskCompletionRepository {
  getAll(): TaskCompletion[] { return getItem<TaskCompletion[]>(KEY) ?? []; }
  getByTask(taskDefinitionId: string): TaskCompletion[] { return this.getAll().filter(c => c.taskDefinitionId === taskDefinitionId); }
  getByUser(userId: string): TaskCompletion[] { return this.getAll().filter(c => c.userId === userId); }
  upsert(completion: TaskCompletion): void {
    const all = this.getAll(); const idx = all.findIndex(c => c.id === completion.id);
    if (idx >= 0) all[idx] = completion; else all.push(completion);
    setItem(KEY, all);
  }
}
