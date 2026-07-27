import type { TrainingAssignment } from '../../models';
import type { ITrainingAssignmentRepository } from '../interfaces/ITrainingAssignmentRepository';
import { getItem, setItem } from '../../utils/storage';
const KEY = 'training_assignments';
export class TrainingAssignmentRepository implements ITrainingAssignmentRepository {
  getByStaff(staffId: string): TrainingAssignment[] {
    return this.getAll().filter(a => a.staffId === staffId);
  }
  getByTraining(trainingId: string): TrainingAssignment[] {
    return this.getAll().filter(a => a.trainingId === trainingId);
  }
  getById(id: string): TrainingAssignment | undefined {
    return this.getAll().find(a => a.id === id);
  }
  upsert(assignment: TrainingAssignment): void {
    const all = this.getAll();
    const idx = all.findIndex(a => a.id === assignment.id);
    if (idx >= 0) all[idx] = assignment;
    else all.push(assignment);
    setItem(KEY, all);
  }
  getAll(): TrainingAssignment[] {
    return getItem<TrainingAssignment[]>(KEY) ?? [];
  }
  seed(data: TrainingAssignment[]): void {
    const existing = getItem<TrainingAssignment[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
