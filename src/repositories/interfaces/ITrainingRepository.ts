import type { Training, TrainingCreate } from '../../models';
export interface ITrainingRepository {
  getAll(): Training[];
  getActive(): Training[];
  getById(id: string): Training | undefined;
  create(data: TrainingCreate): Training;
  update(id: string, data: Partial<Training>): Training | undefined;
  delete(id: string): void;
  seed(data: Training[]): void;
}
