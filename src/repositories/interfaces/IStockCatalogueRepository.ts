import type { StockCatalogueItem } from '../../models';
export interface IStockCatalogueRepository {
  getAll(): StockCatalogueItem[];
  getActive(): StockCatalogueItem[];
  getById(id: string): StockCatalogueItem | undefined;
  create(data: Partial<StockCatalogueItem> & { itemName: string; unitLabel: string }): StockCatalogueItem;
  update(id: string, data: Partial<StockCatalogueItem>): StockCatalogueItem | undefined;
  archive(id: string, archivedBy: string): StockCatalogueItem | undefined;
  seed(data: StockCatalogueItem[]): void;
}
