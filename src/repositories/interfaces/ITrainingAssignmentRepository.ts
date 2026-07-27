import type { TrainingAssignment } from '../../models';
export interface ITrainingAssignmentRepository {
  getByStaff(staffId: string): TrainingAssignment[];
  getByTraining(trainingId: string): TrainingAssignment[];
  getById(id: string): TrainingAssignment | undefined;
  upsert(assignment: TrainingAssignment): void;
  seed(data: TrainingAssignment[]): void;
}
