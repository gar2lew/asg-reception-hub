import type { StockCategory } from '../../models';
import type { IStockCategoryRepository } from '../interfaces/IStockCategoryRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'stock_categories';
export class StockCategoryRepository implements IStockCategoryRepository {
  getAll(): StockCategory[] { return getItem<StockCategory[]>(KEY) ?? []; }
  create(data: Partial<StockCategory> & { name: string }): StockCategory {
    const all = this.getAll(); const c: StockCategory = { id: crypto.randomUUID(), ...data, order: data.order ?? all.length, createdAt: nowISO(), updatedAt: nowISO() };
    setItem(KEY, [...all, c]); return c;
  }
  update(id: string, data: Partial<StockCategory>): StockCategory | undefined {
    const all = this.getAll(); const idx = all.findIndex(c => c.id === id); if (idx === -1) return;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() }; setItem(KEY, all); return all[idx];
  }
  archive(id: string): StockCategory | undefined { return this.update(id, { archived: true }); }
}
