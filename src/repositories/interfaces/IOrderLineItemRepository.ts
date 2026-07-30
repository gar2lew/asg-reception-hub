import type { OrderLineItem } from '../../models';
export interface IOrderLineItemRepository { getByOrder(orderId: string): OrderLineItem[]; create(data: Partial<OrderLineItem> & { orderId: string; stockItemId: string; itemName: string; unitLabel: string; quantityRequested: number }): OrderLineItem; update(id: string, data: Partial<OrderLineItem>): OrderLineItem | undefined; }
