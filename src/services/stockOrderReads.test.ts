import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  provider: 'firebase' as 'local' | 'firebase',
  orderGetAll: vi.fn(), orderGetByOffice: vi.fn(),
  inventoryGetAll: vi.fn(), inventoryGetByOffice: vi.fn(),
  movementGetAll: vi.fn(), movementGetByOffice: vi.fn(),
  receiptGetAll: vi.fn(), receiptGetByOffice: vi.fn(),
}));

vi.mock('../firebase/config', () => ({ getProvider: () => mocks.provider }));
vi.mock('../repositories/firebase/StockOrderRepository', () => ({
  FirebaseStockOrderRepository: class { getAll = mocks.orderGetAll; getByOffice = mocks.orderGetByOffice; },
  FirebaseOrderLineItemRepository: class {},
  FirebaseStockReceiptRepository: class { getAll = mocks.receiptGetAll; getByOffice = mocks.receiptGetByOffice; },
}));
vi.mock('../repositories/firebase/StockInventoryRepository', () => ({
  FirebaseStockInventoryRepository: class { getAll = mocks.inventoryGetAll; getByOffice = mocks.inventoryGetByOffice; },
}));
vi.mock('../repositories/firebase/StockMovementRepository', () => ({
  FirebaseStockMovementRepository: class { getAll = mocks.movementGetAll; getByOffice = mocks.movementGetByOffice; },
}));

import { loadInventory, loadMovements, loadOrders, loadReceipts } from './stockOrderReads';

describe('authenticated Firebase operational reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.provider = 'firebase';
    for (const fn of Object.values(mocks)) if (typeof fn === 'function') fn.mockResolvedValue([]);
  });

  it('uses own-office constraints for every receptionist collection query', async () => {
    const session = { role: 'receptionist', location: 'brisbane' };

    await Promise.all([loadOrders(session), loadInventory(session), loadMovements(session), loadReceipts(session)]);

    expect(mocks.orderGetByOffice).toHaveBeenCalledWith('brisbane');
    expect(mocks.inventoryGetByOffice).toHaveBeenCalledWith('brisbane');
    expect(mocks.movementGetByOffice).toHaveBeenCalledWith('brisbane');
    expect(mocks.receiptGetByOffice).toHaveBeenCalledWith('brisbane');
    expect(mocks.orderGetAll).not.toHaveBeenCalled();
    expect(mocks.inventoryGetAll).not.toHaveBeenCalled();
    expect(mocks.movementGetAll).not.toHaveBeenCalled();
    expect(mocks.receiptGetAll).not.toHaveBeenCalled();
  });

  it('allows an administrator to read across offices', async () => {
    const session = { role: 'admin', location: 'brisbane' };

    await Promise.all([loadOrders(session), loadInventory(session), loadMovements(session), loadReceipts(session)]);

    expect(mocks.orderGetAll).toHaveBeenCalledOnce();
    expect(mocks.inventoryGetAll).toHaveBeenCalledOnce();
    expect(mocks.movementGetAll).toHaveBeenCalledOnce();
    expect(mocks.receiptGetAll).toHaveBeenCalledOnce();
  });
});
