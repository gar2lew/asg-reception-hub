import { StockOrderRepository } from '../repositories/localStorage/StockOrderRepository';
import { OrderLineItemRepository } from '../repositories/localStorage/OrderLineItemRepository';
import { StockCatalogueRepository } from '../repositories/localStorage/StockCatalogueRepository';
import { StockInventoryRepository } from '../repositories/localStorage/StockInventoryRepository';
import { SupplierRepository } from '../repositories/localStorage/SupplierRepository';
import { nowISO } from '../utils/date';
import type { StockOrder, OrderLineItem } from '../models';

const orderRepo = new StockOrderRepository();
const lineRepo = new OrderLineItemRepository();
const catRepo = new StockCatalogueRepository();
const invRepo = new StockInventoryRepository();
const suppRepo = new SupplierRepository();

function validateOrderLines(lines: { stockItemId: string; quantityRequested: number; orderId: string; office: string }[]) {
  if (!lines.length) throw new Error('At least one line required.');
  for (const line of lines) {
    if (!line.stockItemId) throw new Error('Stock item ID required.');
    if (!isFinite(line.quantityRequested) || line.quantityRequested <= 0) throw new Error('Invalid quantity.');
    const item = catRepo.getById(line.stockItemId);
    if (!item) throw new Error(`Item not found.`);
    if (!item.active) throw new Error(`Item ${item.itemName} is archived.`);
    const inv = invRepo.getByItem(line.stockItemId).find(i => i.office === line.office);
    if (!inv) throw new Error(`No inventory for ${item.itemName} in ${line.office}.`);
  }
}

export function localCreateDraft(office: string, uid: string): StockOrder {
  return orderRepo.create({ office, requestedBy: uid });
}

export function localUpdateDraft(id: string, data: Partial<StockOrder>, uid: string): StockOrder | undefined {
  const order = orderRepo.getById(id);
  if (!order) throw new Error('Order not found.');
  if (order.requestedBy !== uid) throw new Error('Not your draft.');
  if (order.status !== 'draft') throw new Error('Can only edit drafts.');
  return orderRepo.update(id, data);
}

export function localSubmitOrder(orderId: string, supplierId: string | undefined, lines: { stockItemId: string; itemName?: string; unitLabel?: string; quantityRequested: number }[], uid: string): void {
  const order = orderRepo.getById(orderId);
  if (!order) throw new Error('Order not found.');
  if (order.requestedBy !== uid) throw new Error('Not your order.');
  if (order.status !== 'draft') throw new Error('Can only submit drafts.');
  const supplier = supplierId ? suppRepo.getById(supplierId) : null;
  if (supplier && !supplier.active) throw new Error('Supplier is archived.');
  const office = order.office;
  validateOrderLines(lines.map(l => ({ ...l, orderId, office })));
  orderRepo.update(orderId, { status: 'requested', supplierId: supplierId || undefined, supplierName: supplier?.name || undefined });
  for (const line of lines) {
    const item = catRepo.getById(line.stockItemId)!;
    lineRepo.create({ orderId, stockItemId: line.stockItemId, itemName: item.itemName, unitLabel: item.unitLabel, quantityRequested: line.quantityRequested });
  }
}
