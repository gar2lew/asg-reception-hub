import type { UserTask } from '../../models';
import type { IUserTaskRepository } from '../interfaces/IUserTaskRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'user_tasks';
export class UserTaskRepository implements IUserTaskRepository {
  getAll(): UserTask[] { return getItem<UserTask[]>(KEY) ?? []; }
  getByUser(userId: string): UserTask[] { return this.getAll().filter(t => t.ownerUid === userId && !t.archived); }
  getById(id: string): UserTask | undefined { return this.getAll().find(t => t.id === id); }
  create(data: Partial<UserTask> & { title: string; ownerUid: string }): UserTask {
    const all = this.getAll();
    const task: UserTask = { id: crypto.randomUUID(), priority: 'normal', order: all.length, recurrence: 'none', scope: 'personal', completed: false, archived: false, createdAt: nowISO(), updatedAt: nowISO(), ...data };
    setItem(KEY, [...all, task]); return task;
  }
  update(id: string, data: Partial<UserTask>): UserTask | undefined {
    const all = this.getAll(); const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    if (data.completed !== undefined) { all[idx].completed = data.completed; all[idx].completedAt = data.completed ? nowISO() : undefined; }
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() }; setItem(KEY, all); return all[idx];
  }
  delete(id: string): void { setItem(KEY, this.getAll().filter(t => t.id !== id)); }
  archive(id: string): UserTask | undefined { return this.update(id, { archived: true, archivedAt: nowISO() }); }
  restore(id: string): UserTask | undefined { return this.update(id, { archived: false, archivedAt: undefined }); }
}
