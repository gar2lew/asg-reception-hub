import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  provider: 'firebase' as 'local' | 'firebase',
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
  invoke: vi.fn(),
  app: { name: 'test-app' },
}));

vi.mock('../firebase/config', () => ({
  getProvider: () => mocks.provider,
  getFirebaseApp: () => mocks.app,
}));

vi.mock('firebase/functions', () => ({
  getFunctions: mocks.getFunctions,
  httpsCallable: mocks.httpsCallable,
}));

import {
  approveOrder,
  cancelOrder,
  createOrderDraft,
  markOrderOrdered,
  receiveOrder,
  rejectOrder,
  submitOrder,
} from './stockOrderActions';
import { OrderLineItemRepository } from '../repositories/localStorage/OrderLineItemRepository';
import { StockCatalogueRepository } from '../repositories/localStorage/StockCatalogueRepository';
import { StockInventoryRepository } from '../repositories/localStorage/StockInventoryRepository';
import { StockOrderRepository } from '../repositories/localStorage/StockOrderRepository';

describe('Firebase stock order commands', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.provider = 'firebase';
    mocks.getFunctions.mockReset().mockReturnValue({ region: 'australia-southeast1' });
    mocks.invoke.mockReset().mockResolvedValue({ data: { id: 'order-1', success: true } });
    mocks.httpsCallable.mockReset().mockReturnValue(mocks.invoke);
  });

  it('uses the Australia regional Functions instance', async () => {
    await createOrderDraft({ office: 'brisbane', requestedBy: 'spoofed' });

    expect(mocks.getFunctions).toHaveBeenCalledWith(mocks.app, 'australia-southeast1');
  });

  it.each([
    ['createStockOrderDraft', () => createOrderDraft({ office: 'brisbane', requestedBy: 'spoofed' }), {}],
    ['submitStockOrder', () => submitOrder({
      orderId: 'order-1', supplierId: 'supplier-1', notes: 'Urgent',
      lines: [{ stockItemId: 'paper', quantityRequested: 4 }],
      actor: { uid: 'spoofed', role: 'administrator' }, office: 'perth',
    } as never), {
      orderId: 'order-1', supplierId: 'supplier-1', notes: 'Urgent',
      lines: [{ stockItemId: 'paper', quantityRequested: 4 }],
    }],
    ['approveStockOrder', () => approveOrder({
      orderId: 'order-1', reason: 'Within budget',
      lineApprovals: [{ stockItemId: 'paper', quantityApproved: 3 }],
    }), {
      orderId: 'order-1', reason: 'Within budget',
      lineApprovals: [{ stockItemId: 'paper', quantityApproved: 3 }],
    }],
    ['rejectStockOrder', () => rejectOrder({ orderId: 'order-1', reason: 'Duplicate' }), { orderId: 'order-1', reason: 'Duplicate' }],
    ['markStockOrderOrdered', () => markOrderOrdered({
      orderId: 'order-1', supplierReference: 'PO-123', expectedDeliveryDate: '2026-08-12', notes: 'Call on arrival',
    }), {
      orderId: 'order-1', supplierReference: 'PO-123', expectedDeliveryDate: '2026-08-12', notes: 'Call on arrival',
    }],
    ['cancelStockOrder', () => cancelOrder({ orderId: 'order-1', reason: 'No longer needed' }), { orderId: 'order-1', reason: 'No longer needed' }],
    ['receiveStockOrder', () => receiveOrder({
      orderId: 'order-1', receipts: [{ stockItemId: 'paper', quantity: 2 }],
      deliveryReference: 'DEL-9', notes: 'One box damaged',
      actor: { uid: 'spoofed', role: 'administrator' }, office: 'perth', receivedAt: '2026-08-03',
    } as never), {
      orderId: 'order-1', receipts: [{ stockItemId: 'paper', quantity: 2 }],
      deliveryReference: 'DEL-9', notes: 'One box damaged',
    }],
  ])('calls %s with only server-authoritative payload fields', async (endpoint, run, payload) => {
    await run();

    expect(mocks.httpsCallable).toHaveBeenCalledWith(expect.anything(), endpoint);
    expect(mocks.invoke).toHaveBeenCalledWith(payload);
  });
});

describe('local stock order commands', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.provider = 'local';
  });

  it('submits the lines saved with a draft without duplicating them', async () => {
    const item = new StockCatalogueRepository().create({ itemName: 'Copy paper', unitLabel: 'ream' });
    new StockInventoryRepository().upsert({
      id: 'inventory-1', stockItemId: item.id, office: 'brisbane', currentQuantity: 3,
      minimumQuantity: 5, updatedAt: '2026-08-10T00:00:00.000Z',
    });
    const draft = await createOrderDraft({
      office: 'brisbane', requestedBy: 'reception-1', notes: 'Weekly order',
      lines: [{ stockItemId: item.id, itemName: item.itemName, unitLabel: item.unitLabel, quantityRequested: 4 }],
    });

    await submitOrder({
      orderId: draft.id, requestedBy: 'reception-1', notes: 'Weekly order',
      lines: [{ stockItemId: item.id, itemName: item.itemName, unitLabel: item.unitLabel, quantityRequested: 4 }],
    });

    expect(new StockOrderRepository().getById(draft.id)?.status).toBe('requested');
    expect(new OrderLineItemRepository().getByOrder(draft.id)).toHaveLength(1);
  });
});
