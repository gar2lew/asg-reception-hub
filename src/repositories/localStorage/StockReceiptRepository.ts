import type { StockReceipt } from '../../models';
import type { IStockReceiptRepository } from '../interfaces/IStockReceiptRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'stock_receipts';
export class StockReceiptRepository implements IStockReceiptRepository {
  getAll(): StockReceipt[] { return getItem<StockReceipt[]>(KEY) ?? []; }
  getByOrder(orderId: string): StockReceipt[] { return this.getAll().filter(r => r.orderId === orderId); }
  create(data: StockReceipt): StockReceipt { setItem(KEY, [...this.getAll(), { ...data, receivedAt: nowISO() }]); return data; }
}
