import type { QuickLinkGroup } from '../../models';
import type { IQuickLinkGroupRepository } from '../interfaces/IQuickLinkGroupRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'quick_link_groups';
export class QuickLinkGroupRepository implements IQuickLinkGroupRepository {
  getAll(): QuickLinkGroup[] { return getItem<QuickLinkGroup[]>(KEY) ?? []; }
  getByScope(scope: QuickLinkGroup['scope']): QuickLinkGroup[] { return this.getAll().filter(g => g.scope === scope).sort((a, b) => a.order - b.order); }
  getById(id: string): QuickLinkGroup | undefined { return this.getAll().find(g => g.id === id); }
  create(data: Partial<QuickLinkGroup> & { name: string }): QuickLinkGroup {
    const all = this.getAll(); const g: QuickLinkGroup = { id: crypto.randomUUID(), ...data, scope: (data.scope ?? 'organisation') as QuickLinkGroup['scope'], order: data.order ?? all.length, enabled: true, createdAt: nowISO(), updatedAt: nowISO() };
    setItem(KEY, [...all, g]); return g;
  }
  update(id: string, data: Partial<QuickLinkGroup>): QuickLinkGroup | undefined {
    const all = this.getAll(); const idx = all.findIndex(g => g.id === id); if (idx === -1) return;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() }; setItem(KEY, all); return all[idx];
  }
  delete(id: string): void { setItem(KEY, this.getAll().filter(g => g.id !== id)); }
}
