import type { StockMovement } from '../../models';
import type { IStockMovementRepository } from '../interfaces/IStockMovementRepository';
import { getItem, setItem } from '../../utils/storage';
const KEY = 'stock_movements';
export class StockMovementRepository implements IStockMovementRepository {
  getAll(): StockMovement[] { return getItem<StockMovement[]>(KEY) ?? []; }
  getByItem(stockItemId: string): StockMovement[] { return this.getAll().filter(m => m.stockItemId === stockItemId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  getByInventory(stockInventoryId: string): StockMovement[] { return this.getAll().filter(m => m.stockInventoryId === stockInventoryId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  getByOffice(office: string): StockMovement[] { return this.getAll().filter(m => m.office === office || m.office === 'all').sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  add(movement: StockMovement): void { setItem(KEY, [...this.getAll(), movement]); }
}
