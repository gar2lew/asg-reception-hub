import type { StockOrder } from '../../models';
export interface IStockOrderRepository { getAll(): StockOrder[]; getByOffice(office: string): StockOrder[]; getById(id: string): StockOrder | undefined; create(data: Partial<StockOrder> & { office: string; requestedBy: string }): StockOrder; update(id: string, data: Partial<StockOrder>): StockOrder | undefined; }
