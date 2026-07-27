import type { QuickLink } from '../../models';
import type { IQuickLinkRepository } from '../interfaces/IQuickLinkRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'quick_links';
export class QuickLinkRepository implements IQuickLinkRepository {
  getAll(): QuickLink[] {
    return getItem<QuickLink[]>(KEY) ?? [];
  }
  getByGroup(group: QuickLink['group']): QuickLink[] {
    return this.getAll().filter(l => l.group === group).sort((a, b) => a.order - b.order);
  }
  update(id: string, data: Partial<QuickLink>): QuickLink | undefined {
    const all = this.getAll();
    const idx = all.findIndex(l => l.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() };
    setItem(KEY, all);
    return all[idx];
  }
  create(data: QuickLink): QuickLink {
    const all = this.getAll();
    const link = { ...data, updatedAt: nowISO() };
    setItem(KEY, [...all, link]);
    return link;
  }
  delete(id: string): void {
    setItem(KEY, this.getAll().filter(l => l.id !== id));
  }
  seed(data: QuickLink[]): void {
    const existing = getItem<QuickLink[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
