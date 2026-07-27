import type { TaskInstance } from '../../models';
import type { IDailyTaskInstanceRepository } from '../interfaces/IDailyTaskInstanceRepository';
import { getItem, setItem } from '../../utils/storage';
const KEY = 'daily_tasks';
const GEN_KEY = 'last_generated';
export class DailyTaskInstanceRepository implements IDailyTaskInstanceRepository {
  getByDate(businessDate: string): TaskInstance[] {
    return this.getAll().filter(t => t.businessDate === businessDate);
  }
  getByDateAndStaff(businessDate: string, staffId: string): TaskInstance[] {
    return this.getAll().filter(t => t.businessDate === businessDate && t.assignedStaffId === staffId);
  }
  getById(id: string): TaskInstance | undefined {
    return this.getAll().find(t => t.id === id);
  }
  upsert(instance: TaskInstance): void {
    const all = this.getAll();
    const idx = all.findIndex(t => t.id === instance.id);
    if (idx >= 0) {
      all[idx] = instance;
    } else {
      all.push(instance);
    }
    setItem(KEY, all);
  }
  upsertMany(instances: TaskInstance[]): void {
    const all = this.getAll();
    for (const inst of instances) {
      const idx = all.findIndex(t => t.id === inst.id);
      if (idx >= 0) {
        all[idx] = inst;
      } else {
        all.push(inst);
      }
    }
    setItem(KEY, all);
  }
  getLastGeneratedDate(): string | null {
    return getItem<string>(GEN_KEY);
  }
  setLastGeneratedDate(date: string): void {
    setItem(GEN_KEY, date);
  }
  getAll(): TaskInstance[] {
    return getItem<TaskInstance[]>(KEY) ?? [];
  }
}
