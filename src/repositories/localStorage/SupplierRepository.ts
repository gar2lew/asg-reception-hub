import type { Supplier } from '../../models';
import type { ISupplierRepository } from '../interfaces/ISupplierRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'suppliers';
export class SupplierRepository implements ISupplierRepository {
  getAll(): Supplier[] { return getItem<Supplier[]>(KEY) ?? []; }
  getActive(): Supplier[] { return this.getAll().filter(s => s.active); }
  getById(id: string): Supplier | undefined { return this.getAll().find(s => s.id === id); }
  create(data: Partial<Supplier> & { name: string }): Supplier {
    const all = this.getAll(); const s: Supplier = { id: crypto.randomUUID(), officeScope: ['all'], ...data, active: true, createdAt: nowISO(), updatedAt: nowISO() };
    setItem(KEY, [...all, s]); return s;
  }
  update(id: string, data: Partial<Supplier>): Supplier | undefined {
    const all = this.getAll(); const idx = all.findIndex(s => s.id === id); if (idx === -1) return;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() }; setItem(KEY, all); return all[idx];
  }
  archive(id: string): Supplier | undefined { return this.update(id, { active: false, archivedAt: nowISO() }); }
  seed(data: Supplier[]): void { const existing = getItem<Supplier[]>(KEY); if (existing && existing.length > 0) return; setItem(KEY, data); }
}
