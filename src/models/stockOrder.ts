export type OrderStatus = 'draft' | 'requested' | 'approved' | 'rejected' | 'ordered' | 'partially-received' | 'received' | 'cancelled';
export interface StockOrder {
  id: string;
  office: string;
  supplierId?: string;
  supplierName?: string;
  status: OrderStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  orderedBy?: string;
  orderedAt?: string;
  expectedDeliveryDate?: string;
  supplierReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface OrderLineItem {
  id: string;
  orderId: string;
  stockItemId: string;
  itemName: string;
  unitLabel: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityOrdered?: number;
  quantityReceived: number;
  createdAt: string;
}
export interface StockReceipt {
  id: string;
  orderId: string;
  office: string;
  receivedBy: string;
  receivedAt: string;
  deliveryReference?: string;
  notes?: string;
}
