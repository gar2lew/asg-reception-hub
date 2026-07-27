import type { Staff, StaffCreate } from '../../models';
import type { IStaffRepository } from '../interfaces/IStaffRepository';
import { getItem, setItem } from '../../utils/storage';
import { simpleHash } from '../../utils/hash';
import { nowISO } from '../../utils/date';
const KEY = 'staff';
export class StaffRepository implements IStaffRepository {
  getAll(): Staff[] {
    return getItem<Staff[]>(KEY) ?? [];
  }
  getById(id: string): Staff | undefined {
    return this.getAll().find(s => s.id === id);
  }
  getByName(name: string): Staff | undefined {
    return this.getAll().find(s => s.name.toLowerCase() === name.toLowerCase());
  }
  create(data: StaffCreate): Staff {
    const all = this.getAll();
    const staff: Staff = {
      id: crypto.randomUUID(),
      name: data.name,
      pinHash: simpleHash(data.pin),
      role: data.role,
      location: data.location,
      email: data.email,
      phone: data.phone,
      jobTitle: data.jobTitle,
      notes: data.notes,
      active: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    setItem(KEY, [...all, staff]);
    return staff;
  }
  update(id: string, data: Partial<Staff>): Staff | undefined {
    const all = this.getAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    if (data.pinHash) {
      all[idx] = { ...all[idx], ...data, pinHash: data.pinHash, updatedAt: nowISO() };
    } else {
      all[idx] = { ...all[idx], ...data, updatedAt: nowISO() };
    }
    setItem(KEY, all);
    return all[idx];
  }
  deactivate(id: string): void {
    this.update(id, { active: false });
  }
  seed(data: Staff[]): void {
    const existing = getItem<Staff[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
