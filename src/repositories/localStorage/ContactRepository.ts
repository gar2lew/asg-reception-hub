import type { Contact } from '../../models';
import type { IContactRepository } from '../interfaces/IContactRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'contacts';
export class ContactRepository implements IContactRepository {
  getAll(): Contact[] {
    return getItem<Contact[]>(KEY) ?? [];
  }
  getByCategory(category: Contact['category']): Contact[] {
    return this.getAll().filter(c => c.category === category).sort((a, b) => a.order - b.order);
  }
  update(id: string, data: Partial<Contact>): Contact | undefined {
    const all = this.getAll();
    const idx = all.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() };
    setItem(KEY, all);
    return all[idx];
  }
  create(data: Contact): Contact {
    const all = this.getAll();
    setItem(KEY, [...all, { ...data, updatedAt: nowISO() }]);
    return { ...data, updatedAt: nowISO() };
  }
  delete(id: string): void {
    setItem(KEY, this.getAll().filter(c => c.id !== id));
  }
  seed(data: Contact[]): void {
    const existing = getItem<Contact[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
