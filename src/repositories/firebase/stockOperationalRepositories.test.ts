import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, name: string) => ({ kind: 'collection', name })),
  doc: vi.fn((_db: unknown, name: string, id: string) => ({ kind: 'doc', name, id })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  query: vi.fn((...constraints: unknown[]) => ({ kind: 'query', constraints })),
  where: vi.fn((field: string, op: string, value: string) => ({ kind: 'where', field, op, value })),
  orderBy: vi.fn((field: string, direction: string) => ({ kind: 'orderBy', field, direction })),
  limit: vi.fn((count: number) => ({ kind: 'limit', count })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => firestore);
vi.mock('../../firebase/config', () => ({ getFirestoreDb: () => ({}) }));

describe('operational Firestore repository reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestore.getDocs.mockResolvedValue({ docs: [] });
  });

  it('builds the office-constrained stock order query required by Firestore Rules', async () => {
    const { FirebaseStockOrderRepository } = await import('./StockOrderRepository');

    await new FirebaseStockOrderRepository().getByOffice('brisbane');

    expect(firestore.query).toHaveBeenCalledWith(
      { kind: 'collection', name: 'stockOrders' },
      { kind: 'where', field: 'office', op: '==', value: 'brisbane' },
      { kind: 'orderBy', field: 'createdAt', direction: 'desc' },
    );
  });

  it('exposes all-office inventory reads for administrators and constrained reads for reception', async () => {
    const { FirebaseStockInventoryRepository } = await import('./StockInventoryRepository');
    const repo = new FirebaseStockInventoryRepository();

    await repo.getAll();
    await repo.getByOffice('perth');

    expect(firestore.getDocs).toHaveBeenNthCalledWith(1, { kind: 'collection', name: 'stockInventory' });
    expect(firestore.getDocs).toHaveBeenNthCalledWith(2, {
      kind: 'query',
      constraints: [
        { kind: 'collection', name: 'stockInventory' },
        { kind: 'where', field: 'office', op: '==', value: 'perth' },
      ],
    });
  });

  it('exposes ordered all-office and office-constrained movement reads', async () => {
    const { FirebaseStockMovementRepository } = await import('./StockMovementRepository');
    const repo = new FirebaseStockMovementRepository();

    await repo.getAll();
    await repo.getByOffice('brisbane');

    expect(firestore.query).toHaveBeenNthCalledWith(
      1,
      { kind: 'collection', name: 'stockMovements' },
      { kind: 'orderBy', field: 'createdAt', direction: 'desc' },
      { kind: 'limit', count: 50 },
    );
    expect(firestore.query).toHaveBeenNthCalledWith(
      2,
      { kind: 'collection', name: 'stockMovements' },
      { kind: 'where', field: 'office', op: '==', value: 'brisbane' },
      { kind: 'orderBy', field: 'createdAt', direction: 'desc' },
      { kind: 'limit', count: 50 },
    );
  });

  it('constrains receipt reads by office and by both parent order and office', async () => {
    const { FirebaseStockReceiptRepository } = await import('./StockOrderRepository');
    const repo = new FirebaseStockReceiptRepository();

    await repo.getAll();
    await repo.getByOffice('perth');
    await repo.getByOrder('order-1', 'perth');

    expect(firestore.getDocs).toHaveBeenNthCalledWith(1, { kind: 'collection', name: 'stockReceipts' });
    expect(firestore.query).toHaveBeenNthCalledWith(
      1,
      { kind: 'collection', name: 'stockReceipts' },
      { kind: 'where', field: 'office', op: '==', value: 'perth' },
    );
    expect(firestore.query).toHaveBeenNthCalledWith(
      2,
      { kind: 'collection', name: 'stockReceipts' },
      { kind: 'where', field: 'orderId', op: '==', value: 'order-1' },
      { kind: 'where', field: 'office', op: '==', value: 'perth' },
    );
  });

  it('maps Firestore document IDs into concrete inventory results', async () => {
    firestore.getDocs.mockResolvedValueOnce({
      docs: [{ id: 'inventory-1', data: () => ({ stockItemId: 'paper', office: 'brisbane', currentQuantity: 8 }) }],
    });
    const { FirebaseStockInventoryRepository } = await import('./StockInventoryRepository');

    const result = await new FirebaseStockInventoryRepository().getAll();

    expect(result).toEqual([{ id: 'inventory-1', stockItemId: 'paper', office: 'brisbane', currentQuantity: 8 }]);
  });
});
