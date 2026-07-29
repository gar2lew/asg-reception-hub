import type { StockInventory } from '../../models';
export interface IStockInventoryRepository {
  getByItem(stockItemId: string): StockInventory[];
  getByOffice(office: string): StockInventory[];
  upsert(inv: StockInventory): void;
}
