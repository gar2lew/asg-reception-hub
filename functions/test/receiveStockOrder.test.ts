import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  db: undefined as any,
  user: {
    displayName: 'Real Receptionist',
    customClaims: { role: 'reception', office: 'brisbane' },
  } as any,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ getUser: async () => firebaseMocks.user }),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => firebaseMocks.db,
  Timestamp: { now: () => 'timestamp-now' },
}));

vi.mock('firebase-functions', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }

  return {
    https: {
      HttpsError,
      onCall: (_options: unknown, handler: (request: unknown) => unknown) => handler,
    },
  };
});

import { receiveStockOrder } from '../src/receiveStockOrder';

type DocumentData = Record<string, any>;

class DocumentReference {
  readonly kind = 'document';

  constructor(
    readonly firestore: FakeFirestore,
    readonly collectionName: string,
    readonly id: string,
  ) {}

  async get() {
    this.firestore.nonTransactionalReads.push(`${this.collectionName}/${this.id}`);
    return this.firestore.documentSnapshot(this);
  }
}

class Query {
  readonly kind = 'query';

  constructor(
    readonly firestore: FakeFirestore,
    readonly collectionName: string,
    readonly filters: Array<[string, unknown]> = [],
    readonly maximum?: number,
  ) {}

  where(field: string, _operator: string, value: unknown) {
    return new Query(this.firestore, this.collectionName, [...this.filters, [field, value]], this.maximum);
  }

  limit(maximum: number) {
    return new Query(this.firestore, this.collectionName, this.filters, maximum);
  }

  async get() {
    this.firestore.nonTransactionalReads.push(`${this.collectionName}?query`);
    return this.firestore.querySnapshot(this);
  }
}

class CollectionReference extends Query {
  doc(id?: string) {
    return new DocumentReference(this.firestore, this.collectionName, id ?? this.firestore.nextId(this.collectionName));
  }
}

class FakeFirestore {
  readonly nonTransactionalReads: string[] = [];
  readonly transactionReads: string[] = [];
  private generatedId = 0;
  private readonly collections = new Map<string, Map<string, DocumentData>>();

  constructor(seed: Record<string, Record<string, DocumentData>>) {
    for (const [collectionName, documents] of Object.entries(seed)) {
      this.collections.set(
        collectionName,
        new Map(Object.entries(documents).map(([id, data]) => [id, structuredClone(data)])),
      );
    }
  }

  collection(name: string) {
    return new CollectionReference(this, name);
  }

  nextId(collectionName: string) {
    this.generatedId += 1;
    return `${collectionName}-${this.generatedId}`;
  }

  documentSnapshot(ref: DocumentReference) {
    const data = this.collections.get(ref.collectionName)?.get(ref.id);
    return {
      id: ref.id,
      ref,
      exists: data !== undefined,
      data: () => data === undefined ? undefined : structuredClone(data),
    };
  }

  querySnapshot(query: Query) {
    const documents = [...(this.collections.get(query.collectionName)?.entries() ?? [])]
      .filter(([, data]) => query.filters.every(([field, value]) => data[field] === value))
      .slice(0, query.maximum)
      .map(([id]) => this.documentSnapshot(new DocumentReference(this, query.collectionName, id)));
    return { docs: documents, empty: documents.length === 0 };
  }

  async runTransaction<T>(callback: (transaction: any) => Promise<T>) {
    const writes: Array<() => void> = [];
    let hasWritten = false;
    const transaction = {
      get: async (target: DocumentReference | Query) => {
        if (hasWritten) throw new Error('Firestore transaction read attempted after a write');
        this.transactionReads.push(
          target.kind === 'document'
            ? `${target.collectionName}/${target.id}`
            : `${target.collectionName}?query`,
        );
        return target.kind === 'document'
          ? this.documentSnapshot(target)
          : this.querySnapshot(target);
      },
      update: (ref: DocumentReference, changes: DocumentData) => {
        hasWritten = true;
        writes.push(() => {
          const collection = this.collections.get(ref.collectionName) ?? new Map<string, DocumentData>();
          const current = collection.get(ref.id);
          if (!current) throw new Error(`Missing document ${ref.collectionName}/${ref.id}`);
          collection.set(ref.id, { ...current, ...structuredClone(changes) });
          this.collections.set(ref.collectionName, collection);
        });
      },
      set: (ref: DocumentReference, data: DocumentData) => {
        hasWritten = true;
        writes.push(() => {
          const collection = this.collections.get(ref.collectionName) ?? new Map<string, DocumentData>();
          collection.set(ref.id, structuredClone(data));
          this.collections.set(ref.collectionName, collection);
        });
      },
    };

    const result = await callback(transaction);
    writes.forEach(write => write());
    return result;
  }

  data(collectionName: string, id: string) {
    return this.collections.get(collectionName)?.get(id);
  }

  all(collectionName: string) {
    return [...(this.collections.get(collectionName)?.values() ?? [])];
  }
}

function createFirestore(options: {
  status?: string;
  office?: string;
  quantityOrdered?: number;
  quantityReceived?: number;
  inventoryQuantity?: number;
} = {}) {
  return new FakeFirestore({
    stockOrders: {
      'order-1': {
        office: options.office ?? 'brisbane',
        status: options.status ?? 'ordered',
      },
    },
    orderLineItems: {
      'line-1': {
        orderId: 'order-1',
        stockItemId: 'item-1',
        itemName: 'Paper',
        unitLabel: 'reams',
        quantityOrdered: options.quantityOrdered ?? 10,
        quantityReceived: options.quantityReceived ?? 0,
      },
    },
    stockInventory: {
      'inventory-1': {
        stockItemId: 'item-1',
        office: options.office ?? 'brisbane',
        currentQuantity: options.inventoryQuantity ?? 5,
      },
    },
  });
}

function callReceive(data: DocumentData, auth: DocumentData | null = { uid: 'real-user' }) {
  return (receiveStockOrder as any)({ auth, data });
}

beforeEach(() => {
  firebaseMocks.db = createFirestore();
  firebaseMocks.user = {
    displayName: 'Real Receptionist',
    customClaims: { role: 'reception', office: 'brisbane' },
  };
});

describe('receiveStockOrder', () => {
  it('reads every mutable order, line, and inventory document through the transaction', async () => {
    await callReceive({ orderId: 'order-1', receipts: [{ stockItemId: 'item-1', quantity: 2 }] });

    expect(firebaseMocks.db.nonTransactionalReads).toEqual([]);
    expect(firebaseMocks.db.transactionReads).toEqual([
      'stockOrders/order-1',
      'orderLineItems?query',
      'stockInventory?query',
    ]);
  });

  it('marks a first partial delivery partially-received using projected quantities', async () => {
    await callReceive({ orderId: 'order-1', receipts: [{ stockItemId: 'item-1', quantity: 4 }] });

    expect(firebaseMocks.db.data('stockOrders', 'order-1')?.status).toBe('partially-received');
    expect(firebaseMocks.db.data('orderLineItems', 'line-1')?.quantityReceived).toBe(4);
  });

  it('marks an order received when this delivery completes its remaining quantity', async () => {
    firebaseMocks.db = createFirestore({ quantityOrdered: 10, quantityReceived: 6 });

    await callReceive({ orderId: 'order-1', receipts: [{ stockItemId: 'item-1', quantity: 4 }] });

    expect(firebaseMocks.db.data('stockOrders', 'order-1')?.status).toBe('received');
    expect(firebaseMocks.db.data('orderLineItems', 'line-1')?.quantityReceived).toBe(10);
  });

  it('rejects duplicate stock item rows in one receipt', async () => {
    await expect(callReceive({
      orderId: 'order-1',
      receipts: [
        { stockItemId: 'item-1', quantity: 2 },
        { stockItemId: 'item-1', quantity: 3 },
      ],
    })).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(firebaseMocks.db.data('orderLineItems', 'line-1')?.quantityReceived).toBe(0);
    expect(firebaseMocks.db.data('stockInventory', 'inventory-1')?.currentQuantity).toBe(5);
  });

  it('retains receipt line details and ignores client-supplied actor and office fields', async () => {
    await callReceive({
      orderId: 'order-1',
      receipts: [{ stockItemId: 'item-1', quantity: 2 }],
      deliveryReference: 'DEL-42',
      notes: 'Two boxes intact',
      actorUid: 'spoofed-user',
      receivedBy: 'spoofed-user',
      office: 'sydney',
    });

    expect(firebaseMocks.db.all('stockReceipts')).toEqual([expect.objectContaining({
      orderId: 'order-1',
      office: 'brisbane',
      receivedBy: 'real-user',
      deliveryReference: 'DEL-42',
      notes: 'Two boxes intact',
      lines: [{
        orderLineItemId: 'line-1',
        stockItemId: 'item-1',
        itemName: 'Paper',
        unitLabel: 'reams',
        quantityReceived: 2,
      }],
    })]);
    expect(firebaseMocks.db.all('stockMovements')).toEqual([expect.objectContaining({
      office: 'brisbane',
      actorUid: 'real-user',
      actorDisplayName: 'Real Receptionist',
    })]);
  });

  it('preserves authentication, office, and over-receipt protections', async () => {
    await expect(callReceive(
      { orderId: 'order-1', receipts: [{ stockItemId: 'item-1', quantity: 1 }] },
      null,
    )).rejects.toMatchObject({ code: 'unauthenticated' });

    firebaseMocks.db = createFirestore({ office: 'sydney' });
    await expect(callReceive({
      orderId: 'order-1',
      receipts: [{ stockItemId: 'item-1', quantity: 1 }],
    })).rejects.toMatchObject({ code: 'permission-denied' });

    firebaseMocks.db = createFirestore({ quantityOrdered: 10, quantityReceived: 8 });
    await expect(callReceive({
      orderId: 'order-1',
      receipts: [{ stockItemId: 'item-1', quantity: 3 }],
    })).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
