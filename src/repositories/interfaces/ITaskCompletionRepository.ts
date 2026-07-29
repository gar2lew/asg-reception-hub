import type { TaskCompletion } from '../../models';
export interface ITaskCompletionRepository {
  getByTask(taskDefinitionId: string): TaskCompletion[];
  getByUser(userId: string): TaskCompletion[];
  upsert(completion: TaskCompletion): void;
}
