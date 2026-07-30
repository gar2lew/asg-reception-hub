import type { OrderLineItem } from '../../models';
import type { IOrderLineItemRepository } from '../interfaces/IOrderLineItemRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'order_line_items';
export class OrderLineItemRepository implements IOrderLineItemRepository {
  getAll(): OrderLineItem[] { return getItem<OrderLineItem[]>(KEY) ?? []; }
  getByOrder(orderId: string): OrderLineItem[] { return this.getAll().filter(l => l.orderId === orderId); }
  create(data: Partial<OrderLineItem> & { orderId: string; stockItemId: string; itemName: string; unitLabel: string; quantityRequested: number }): OrderLineItem {
    const all = this.getAll(); const l: OrderLineItem = { id: crypto.randomUUID(), quantityReceived: 0, ...data, createdAt: nowISO() };
    setItem(KEY, [...all, l]); return l;
  }
  update(id: string, data: Partial<OrderLineItem>): OrderLineItem | undefined {
    const all = this.getAll(); const idx = all.findIndex(l => l.id === id); if (idx === -1) return;
    all[idx] = { ...all[idx], ...data }; setItem(KEY, all); return all[idx];
  }
}
