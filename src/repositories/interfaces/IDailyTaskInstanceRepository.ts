import type { TaskInstance } from '../../models';
export interface IDailyTaskInstanceRepository {
  getByDate(businessDate: string): TaskInstance[];
  getByDateAndStaff(businessDate: string, staffId: string): TaskInstance[];
  getById(id: string): TaskInstance | undefined;
  upsert(instance: TaskInstance): void;
  upsertMany(instances: TaskInstance[]): void;
  getLastGeneratedDate(): string | null;
  setLastGeneratedDate(date: string): void;
  getAll(): TaskInstance[];
}
