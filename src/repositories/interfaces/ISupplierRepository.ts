import type { Supplier } from '../../models';
export interface ISupplierRepository {
  getAll(): Supplier[];
  getActive(): Supplier[];
  getById(id: string): Supplier | undefined;
  create(data: Partial<Supplier> & { name: string }): Supplier;
  update(id: string, data: Partial<Supplier>): Supplier | undefined;
  archive(id: string): Supplier | undefined;
  seed(data: Supplier[]): void;
}
