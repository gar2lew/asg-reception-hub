import type { StockOrder } from '../../models';
import type { IStockOrderRepository } from '../interfaces/IStockOrderRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'stock_orders';
export class StockOrderRepository implements IStockOrderRepository {
  getAll(): StockOrder[] { return getItem<StockOrder[]>(KEY) ?? []; }
  getByOffice(office: string): StockOrder[] { return this.getAll().filter(o => o.office === office || o.office === 'all').sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  getById(id: string): StockOrder | undefined { return this.getAll().find(o => o.id === id); }
  create(data: Partial<StockOrder> & { office: string; requestedBy: string }): StockOrder {
    const all = this.getAll(); const o: StockOrder = { id: crypto.randomUUID(), ...data, status: 'draft', requestedAt: nowISO(), createdAt: nowISO(), updatedAt: nowISO() };
    setItem(KEY, [...all, o]); return o;
  }
  update(id: string, data: Partial<StockOrder>): StockOrder | undefined {
    const all = this.getAll(); const idx = all.findIndex(o => o.id === id); if (idx === -1) return;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() }; setItem(KEY, all); return all[idx];
  }
}
