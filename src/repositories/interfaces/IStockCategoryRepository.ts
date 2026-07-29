import type { StockCategory } from '../../models';
export interface IStockCategoryRepository {
  getAll(): StockCategory[];
  create(data: Partial<StockCategory> & { name: string }): StockCategory;
  update(id: string, data: Partial<StockCategory>): StockCategory | undefined;
  archive(id: string): StockCategory | undefined;
}
