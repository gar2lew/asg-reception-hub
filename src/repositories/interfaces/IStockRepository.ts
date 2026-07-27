import type { StockItem, StockUpdate } from '../../models';
export interface IStockRepository {
  getAll(): StockItem[];
  getById(id: string): StockItem | undefined;
  update(id: string, data: StockUpdate): StockItem | undefined;
  recordOrder(id: string, quantity: number, orderedBy: string): StockItem | undefined;
  seed(data: StockItem[]): void;
}
