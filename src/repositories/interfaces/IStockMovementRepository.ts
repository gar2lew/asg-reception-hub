import type { StockMovement } from '../../models';
export interface IStockMovementRepository {
  getByItem(stockItemId: string): StockMovement[];
  getByInventory(stockInventoryId: string): StockMovement[];
  getByOffice(office: string): StockMovement[];
  add(movement: StockMovement): void;
  getAll(): StockMovement[];
}
