import type { TaskDefinition, TaskDefinitionCreate } from '../../models';
export interface ITaskDefinitionRepository {
  getAll(): TaskDefinition[];
  getActive(): TaskDefinition[];
  getById(id: string): TaskDefinition | undefined;
  create(data: TaskDefinitionCreate): TaskDefinition;
  update(id: string, data: Partial<TaskDefinition>): TaskDefinition | undefined;
  delete(id: string): void;
  seed(data: TaskDefinition[]): void;
}
