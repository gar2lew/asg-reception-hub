import type { StockItem, StockUpdate } from '../../models';
import type { IStockRepository } from '../interfaces/IStockRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'stock';
export class StockRepository implements IStockRepository {
  getAll(): StockItem[] {
    return getItem<StockItem[]>(KEY) ?? [];
  }
  getById(id: string): StockItem | undefined {
    return this.getAll().find(s => s.id === id);
  }
  update(id: string, data: StockUpdate): StockItem | undefined {
    const all = this.getAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() };
    setItem(KEY, all);
    return all[idx];
  }
  recordOrder(id: string, quantity: number, orderedBy: string): StockItem | undefined {
    const all = this.getAll();
    const idx = all.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    all[idx] = {
      ...all[idx],
      lastOrderedDate: nowISO().split('T')[0],
      lastOrderedQuantity: quantity,
      updatedBy: orderedBy,
      updatedAt: nowISO(),
    };
    setItem(KEY, all);
    return all[idx];
  }
  seed(data: StockItem[]): void {
    const existing = getItem<StockItem[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
