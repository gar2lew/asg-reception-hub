import type { Staff, StaffCreate } from '../../models';
export interface IStaffRepository {
  getAll(): Staff[];
  getById(id: string): Staff | undefined;
  getByName(name: string): Staff | undefined;
  create(data: StaffCreate): Staff;
  update(id: string, data: Partial<Staff>): Staff | undefined;
  deactivate(id: string): void;
  seed(data: Staff[]): void;
}
