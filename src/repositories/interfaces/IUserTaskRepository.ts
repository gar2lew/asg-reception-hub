import type { UserTask } from '../../models';
export interface IUserTaskRepository {
  getByUser(userId: string): UserTask[];
  getById(id: string): UserTask | undefined;
  create(data: Partial<UserTask> & { title: string; ownerUid: string }): UserTask;
  update(id: string, data: Partial<UserTask>): UserTask | undefined;
  delete(id: string): void;
  archive(id: string): UserTask | undefined;
  restore(id: string): UserTask | undefined;
}
