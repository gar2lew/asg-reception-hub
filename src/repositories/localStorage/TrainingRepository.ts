import type { Training, TrainingCreate } from '../../models';
import type { ITrainingRepository } from '../interfaces/ITrainingRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'training';
export class TrainingRepository implements ITrainingRepository {
  getAll(): Training[] {
    return getItem<Training[]>(KEY) ?? [];
  }
  getActive(): Training[] {
    return this.getAll().filter(t => t.active);
  }
  getById(id: string): Training | undefined {
    return this.getAll().find(t => t.id === id);
  }
  create(data: TrainingCreate): Training {
    const all = this.getAll();
    const training: Training = {
      id: crypto.randomUUID(),
      title: data.title,
      category: data.category,
      summary: data.summary,
      content: data.content,
      steps: data.steps,
      externalUrl: data.externalUrl,
      documentUrl: data.documentUrl,
      estimatedMinutes: data.estimatedMinutes,
      assignedStaffIds: data.assignedStaffIds ?? [],
      active: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    setItem(KEY, [...all, training]);
    return training;
  }
  update(id: string, data: Partial<Training>): Training | undefined {
    const all = this.getAll();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() };
    setItem(KEY, all);
    return all[idx];
  }
  delete(id: string): void {
    setItem(KEY, this.getAll().filter(t => t.id !== id));
  }
  seed(data: Training[]): void {
    const existing = getItem<Training[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
