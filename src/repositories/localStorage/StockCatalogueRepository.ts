import type { StockCatalogueItem } from '../../models';
import type { IStockCatalogueRepository } from '../interfaces/IStockCatalogueRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'stock_catalogue';
export class StockCatalogueRepository implements IStockCatalogueRepository {
  getAll(): StockCatalogueItem[] { return getItem<StockCatalogueItem[]>(KEY) ?? []; }
  getActive(): StockCatalogueItem[] { return this.getAll().filter(s => s.active); }
  getById(id: string): StockCatalogueItem | undefined { return this.getAll().find(s => s.id === id); }
  create(data: Partial<StockCatalogueItem> & { itemName: string; unitLabel: string }): StockCatalogueItem {
    const all = this.getAll(); const item: StockCatalogueItem = { id: crypto.randomUUID(), ...data, active: true, createdAt: nowISO(), updatedAt: nowISO() };
    setItem(KEY, [...all, item]); return item;
  }
  update(id: string, data: Partial<StockCatalogueItem>): StockCatalogueItem | undefined {
    const all = this.getAll(); const idx = all.findIndex(s => s.id === id); if (idx === -1) return;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() }; setItem(KEY, all); return all[idx];
  }
  archive(id: string, archivedBy: string): StockCatalogueItem | undefined {
    return this.update(id, { active: false, archivedAt: nowISO(), archivedBy });
  }
  seed(data: StockCatalogueItem[]): void {
    const existing = getItem<StockCatalogueItem[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
