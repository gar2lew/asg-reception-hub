import type { StockReceipt } from '../../models';
export interface IStockReceiptRepository { getByOrder(orderId: string): StockReceipt[]; create(data: StockReceipt): StockReceipt; }
