import type { TaskDefinition, TaskDefinitionCreate } from '../../models';
import type { ITaskDefinitionRepository } from '../interfaces/ITaskDefinitionRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'task_definitions';
export class TaskDefinitionRepository implements ITaskDefinitionRepository {
  getAll(): TaskDefinition[] {
    return getItem<TaskDefinition[]>(KEY) ?? [];
  }
  getActive(): TaskDefinition[] {
    return this.getAll().filter(t => t.active);
  }
  getById(id: string): TaskDefinition | undefined {
    return this.getAll().find(t => t.id === id);
  }
  create(data: TaskDefinitionCreate): TaskDefinition {
    const all = this.getAll();
    const task: TaskDefinition = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      category: data.category,
      recurrence: data.recurrence,
      assignedStaffIds: data.assignedStaffIds,
      required: data.required ?? true,
      priority: data.priority ?? 'normal',
      dueTime: data.dueTime,
      instructions: data.instructions,
      relatedTrainingId: data.relatedTrainingId,
      externalUrl: data.externalUrl,
      active: data.active ?? true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    setItem(KEY, [...all, task]);
    return task;
  }
  update(id: string, data: Partial<TaskDefinition>): TaskDefinition | undefined {
    const all = this.getAll();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() };
    setItem(KEY, all);
    return all[idx];
  }
  delete(id: string): void {
    const all = this.getAll().filter(t => t.id !== id);
    setItem(KEY, all);
  }
  seed(data: TaskDefinition[]): void {
    const existing = getItem<TaskDefinition[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
