import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getProvider } from '../firebase/config';
import { OrderLineItemRepository } from '../repositories/localStorage/OrderLineItemRepository';
import { StockInventoryRepository } from '../repositories/localStorage/StockInventoryRepository';
import { StockOrderRepository } from '../repositories/localStorage/StockOrderRepository';
import { StockReceiptRepository } from '../repositories/localStorage/StockReceiptRepository';
import { applyMovement } from './stockMovementService';
import { localCreateDraft, localSubmitSavedDraft } from './orderService';
import { nowISO } from '../utils/date';

const REGION = 'australia-southeast1';
const orderRepo = new StockOrderRepository();
const lineRepo = new OrderLineItemRepository();
const inventoryRepo = new StockInventoryRepository();
const receiptRepo = new StockReceiptRepository();

export interface DraftLine {
  stockItemId: string;
  itemName?: string;
  unitLabel?: string;
  quantityRequested: number;
}

export interface LocalActor {
  uid: string;
  name: string;
  role: string;
}

async function callOrderFunction<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const functions = getFunctions(getFirebaseApp(), REGION);
  const callable = httpsCallable<Record<string, unknown>, T>(functions, name);
  const result = await callable(payload);
  return result.data;
}

export function usesFirebaseOrders(): boolean {
  return getProvider() === 'firebase';
}

export async function createOrderDraft(input: {
  office: string;
  requestedBy: string;
  supplierId?: string;
  notes?: string;
  lines?: DraftLine[];
}): Promise<{ id: string; status: string }> {
  if (usesFirebaseOrders()) {
    return callOrderFunction('createStockOrderDraft', {});
  }

  const draft = localCreateDraft(input.office, input.requestedBy);
  orderRepo.update(draft.id, { supplierId: input.supplierId || undefined, notes: input.notes || undefined });
  for (const line of input.lines ?? []) {
    lineRepo.create({
      orderId: draft.id,
      stockItemId: line.stockItemId,
      itemName: line.itemName ?? line.stockItemId,
      unitLabel: line.unitLabel ?? '',
      quantityRequested: line.quantityRequested,
    });
  }
  return { id: draft.id, status: draft.status };
}

export async function submitOrder(input: {
  orderId: string;
  supplierId?: string;
  lines: DraftLine[];
  notes?: string;
  requestedBy?: string;
}): Promise<unknown> {
  const payload = {
    orderId: input.orderId,
    supplierId: input.supplierId,
    lines: input.lines.map(line => ({
      stockItemId: line.stockItemId,
      quantityRequested: line.quantityRequested,
      ...(line.itemName ? { itemName: line.itemName } : {}),
      ...(line.unitLabel ? { unitLabel: line.unitLabel } : {}),
    })),
    notes: input.notes,
  };
  if (usesFirebaseOrders()) return callOrderFunction('submitStockOrder', payload);
  localSubmitSavedDraft(input.orderId, input.supplierId, input.requestedBy ?? '');
  return { success: true, status: 'requested' };
}

export async function approveOrder(input: {
  orderId: string;
  lineApprovals: { stockItemId: string; quantityApproved: number }[];
  reason: string;
  localActor?: LocalActor;
}): Promise<unknown> {
  const payload = { orderId: input.orderId, lineApprovals: input.lineApprovals, reason: input.reason };
  if (usesFirebaseOrders()) return callOrderFunction('approveStockOrder', payload);
  orderRepo.update(input.orderId, {
    status: 'approved', approvedBy: input.localActor?.uid, approvedAt: nowISO(), notes: input.reason.trim(),
  });
  for (const approval of input.lineApprovals) {
    const line = lineRepo.getByOrder(input.orderId).find(candidate => candidate.stockItemId === approval.stockItemId);
    if (line) lineRepo.update(line.id, { quantityApproved: approval.quantityApproved });
  }
  return { success: true, status: 'approved' };
}

export async function rejectOrder(input: { orderId: string; reason: string }): Promise<unknown> {
  const payload = { orderId: input.orderId, reason: input.reason };
  if (usesFirebaseOrders()) return callOrderFunction('rejectStockOrder', payload);
  orderRepo.update(input.orderId, { status: 'rejected', notes: input.reason.trim() });
  return { success: true, status: 'rejected' };
}

export async function markOrderOrdered(input: {
  orderId: string;
  supplierReference?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  localActor?: LocalActor;
}): Promise<unknown> {
  const payload = {
    orderId: input.orderId,
    supplierReference: input.supplierReference,
    expectedDeliveryDate: input.expectedDeliveryDate,
    notes: input.notes,
  };
  if (usesFirebaseOrders()) return callOrderFunction('markStockOrderOrdered', payload);
  orderRepo.update(input.orderId, {
    status: 'ordered', orderedBy: input.localActor?.uid, orderedAt: nowISO(),
    supplierReference: input.supplierReference || undefined,
    expectedDeliveryDate: input.expectedDeliveryDate || undefined,
    notes: input.notes || undefined,
  });
  for (const line of lineRepo.getByOrder(input.orderId)) {
    lineRepo.update(line.id, { quantityOrdered: line.quantityApproved ?? line.quantityRequested });
  }
  return { success: true, status: 'ordered' };
}

export async function cancelOrder(input: { orderId: string; reason?: string }): Promise<unknown> {
  const payload = { orderId: input.orderId, reason: input.reason };
  if (usesFirebaseOrders()) return callOrderFunction('cancelStockOrder', payload);
  orderRepo.update(input.orderId, { status: 'cancelled', notes: input.reason?.trim() || undefined });
  return { success: true, status: 'cancelled' };
}

export async function receiveOrder(input: {
  orderId: string;
  receipts: { stockItemId: string; quantity: number }[];
  deliveryReference?: string;
  notes?: string;
  localActor?: LocalActor;
}): Promise<unknown> {
  const payload = {
    orderId: input.orderId,
    receipts: input.receipts.map(receipt => ({ stockItemId: receipt.stockItemId, quantity: receipt.quantity })),
    deliveryReference: input.deliveryReference,
    notes: input.notes,
  };
  if (usesFirebaseOrders()) return callOrderFunction('receiveStockOrder', payload);

  const order = orderRepo.getById(input.orderId);
  if (!order) throw new Error('Order not found.');
  const actor = input.localActor ?? { uid: 'admin-local', name: 'Administrator', role: 'admin' };
  for (const received of input.receipts) {
    const line = lineRepo.getByOrder(input.orderId).find(candidate => candidate.stockItemId === received.stockItemId);
    if (!line) continue;
    const inventory = inventoryRepo.getByItem(received.stockItemId).find(candidate => candidate.office === order.office);
    if (!inventory) continue;
    const ordered = line.quantityOrdered ?? line.quantityApproved ?? line.quantityRequested;
    if (received.quantity <= 0 || received.quantity > ordered - line.quantityReceived) continue;
    applyMovement(inventory.id, 'received-order', received.quantity, `Received from order ${order.id}`, actor, input.notes);
    lineRepo.update(line.id, { quantityReceived: line.quantityReceived + received.quantity });
  }
  const lines = lineRepo.getByOrder(input.orderId);
  const allDone = lines.every(line => (line.quantityOrdered ?? line.quantityApproved ?? line.quantityRequested) <= line.quantityReceived);
  const anyDone = lines.some(line => line.quantityReceived > 0);
  orderRepo.update(input.orderId, { status: allDone ? 'received' : anyDone ? 'partially-received' : order.status });
  receiptRepo.create({
    id: crypto.randomUUID(), orderId: input.orderId, office: order.office, receivedBy: actor.uid,
    receivedAt: nowISO(), deliveryReference: input.deliveryReference, notes: input.notes,
  });
  return { success: true };
}
