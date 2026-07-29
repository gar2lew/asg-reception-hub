import type { StockInventory } from '../../models';
import type { IStockInventoryRepository } from '../interfaces/IStockInventoryRepository';
import { getItem, setItem } from '../../utils/storage';
const KEY = 'stock_inventory';
export class StockInventoryRepository implements IStockInventoryRepository {
  getAll(): StockInventory[] { return getItem<StockInventory[]>(KEY) ?? []; }
  getByItem(stockItemId: string): StockInventory[] { return this.getAll().filter(i => i.stockItemId === stockItemId); }
  getByOffice(office: string): StockInventory[] { return this.getAll().filter(i => i.office === office || i.office === 'all'); }
  upsert(inv: StockInventory): void {
    const all = this.getAll(); const idx = all.findIndex(i => i.id === inv.id);
    if (idx >= 0) all[idx] = inv; else all.push(inv);
    setItem(KEY, all);
  }
}
