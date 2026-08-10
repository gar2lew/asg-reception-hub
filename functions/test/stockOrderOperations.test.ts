import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  db: undefined as any,
  pinValid: false,
  tokenClaims: undefined as any,
  user: {
    displayName: 'Real Administrator',
    customClaims: { role: 'administrator', office: 'brisbane' },
  } as any,
}));

vi.mock('../src/admin.js', () => ({
  adminAuth: {
    getUser: async () => firebaseMocks.user,
    createCustomToken: async (_uid: string, claims: unknown) => {
      firebaseMocks.tokenClaims = claims;
      return 'custom-token';
    },
  },
  get adminDb() { return firebaseMocks.db; },
}));

vi.mock('firebase-admin/firestore', () => {
  class MockTimestamp {
    constructor(readonly milliseconds: number) {}
    toMillis() { return this.milliseconds; }
  }
  return {
    Timestamp: {
      now: () => new MockTimestamp(1_000),
      fromMillis: (value: number) => new MockTimestamp(value),
    },
  };
});

vi.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'test-pepper' }),
}));

vi.mock('bcrypt', () => ({
  compare: async () => firebaseMocks.pinValid,
}));

vi.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }

 return {
    HttpsError,
    onCall: (_options: unknown, handler: (request: unknown) => unknown) => handler,
 };
});

import {
  approveStockOrder,
  cancelStockOrder,
  createStockOrderDraft,
  markStockOrderOrdered,
  rejectStockOrder,
  submitStockOrder,
} from '../src/stockOrderOperations';
import { applyStockMovement } from '../src/applyStockMovement';
import { operationalLogin } from '../src/operationalLogin';

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

  async update(changes: DocumentData) {
    this.firestore.runConcurrentMutation();
    this.firestore.update(this, changes);
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

  async add(data: DocumentData) {
    const ref = this.doc();
    this.firestore.set(ref, data);
    return ref;
  }
}

class FakeFirestore {
  readonly nonTransactionalReads: string[] = [];
  readonly transactionReads: string[] = [];
  private concurrentMutation?: () => void;
  private generatedId = 0;
  private readonly collections = new Map<string, Map<string, DocumentData>>();

  constructor(seed: Record<string, Record<string, DocumentData>>) {
    for (const [collectionName, documents] of Object.entries(seed)) {
      this.collections.set(collectionName, new Map(Object.entries(documents).map(([id, data]) => [id, structuredClone(data)])));
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
    return { id: ref.id, ref, exists: data !== undefined, data: () => data === undefined ? undefined : structuredClone(data) };
  }

  querySnapshot(query: Query) {
    const docs = [...(this.collections.get(query.collectionName)?.entries() ?? [])]
      .filter(([, data]) => query.filters.every(([field, value]) => data[field] === value))
      .slice(0, query.maximum ?? Number.POSITIVE_INFINITY)
      .map(([id]) => this.documentSnapshot(new DocumentReference(this, query.collectionName, id)));
    return { docs, empty: docs.length === 0 };
  }

  async runTransaction<T>(callback: (transaction: any) => Promise<T>) {
    this.runConcurrentMutation();
    const writes: Array<() => void> = [];
    let hasWritten = false;
    const transaction = {
      get: async (target: DocumentReference | Query) => {
        if (hasWritten) throw new Error('Firestore transaction read attempted after a write');
        this.transactionReads.push(target.kind === 'document' ? `${target.collectionName}/${target.id}` : `${target.collectionName}?query`);
        return target.kind === 'document' ? this.documentSnapshot(target) : this.querySnapshot(target);
      },
      update: (ref: DocumentReference, changes: DocumentData) => {
        hasWritten = true;
        writes.push(() => this.update(ref, changes));
      },
      set: (ref: DocumentReference, data: DocumentData) => {
        hasWritten = true;
        writes.push(() => this.set(ref, data));
      },
    };
    const result = await callback(transaction);
    writes.forEach(write => write());
    return result;
  }

  update(ref: DocumentReference, changes: DocumentData) {
    const collection = this.collections.get(ref.collectionName) ?? new Map<string, DocumentData>();
    const current = collection.get(ref.id);
    if (!current) throw new Error(`Missing document ${ref.collectionName}/${ref.id}`);
    collection.set(ref.id, { ...current, ...structuredClone(changes) });
    this.collections.set(ref.collectionName, collection);
  }

  set(ref: DocumentReference, data: DocumentData) {
    const collection = this.collections.get(ref.collectionName) ?? new Map<string, DocumentData>();
    collection.set(ref.id, structuredClone(data));
    this.collections.set(ref.collectionName, collection);
  }

  mutateBeforeNextWrite(mutation: () => void) {
    this.concurrentMutation = mutation;
  }

  runConcurrentMutation() {
    const mutation = this.concurrentMutation;
    this.concurrentMutation = undefined;
    mutation?.();
  }

  data(collectionName: string, id: string) {
    return this.collections.get(collectionName)?.get(id);
  }

  all(collectionName: string) {
    return [...(this.collections.get(collectionName)?.values() ?? [])];
  }
}

function createFirestore(status = 'approved', requestedBy = 'requester') {
  return new FakeFirestore({
    stockOrders: {
      'order-1': { office: 'brisbane', requestedBy, status },
    },
    orderLineItems: {
      'line-approved': { orderId: 'order-1', stockItemId: 'item-1', quantityRequested: 8, quantityApproved: 5, quantityOrdered: 999 },
      'line-requested': { orderId: 'order-1', stockItemId: 'item-2', quantityRequested: 3, quantityOrdered: 999 },
      'other-order-line': { orderId: 'order-2', stockItemId: 'item-3', quantityRequested: 10, quantityOrdered: 999 },
    },
  });
}

function createSubmitFirestore(status = 'draft', requestedBy = 'real-user') {
  return new FakeFirestore({
    stockOrders: {
      'order-1': { office: 'brisbane', requestedBy, status },
    },
    suppliers: {
      'supplier-1': { name: 'Office Supplier', active: true },
    },
    stockItems: {
      'item-1': { itemName: 'Paper', unitLabel: 'reams', active: true },
      'item-2': { itemName: 'Pens', unitLabel: 'boxes', active: true },
    },
    stockInventory: {
      'inventory-1': { stockItemId: 'item-1', office: 'brisbane', currentQuantity: 4 },
      'inventory-2': { stockItemId: 'item-2', office: 'brisbane', currentQuantity: 6 },
    },
  });
}

function createMovementFirestore(office = 'brisbane', currentQuantity = 5) {
  return new FakeFirestore({
    stockItems: {
      'item-1': { itemName: 'Paper', active: true },
    },
    stockInventory: {
      'inventory-1': { stockItemId: 'item-1', office, currentQuantity },
    },
  });
}

function createLoginFirestore(options: { role?: string; office?: string; failedAttemptCount?: number } = {}) {
  return new FakeFirestore({
    operationalAccounts: {
      'account-1': {
        accountKey: 'brisbane-reception', uid: 'account-user', displayName: 'Reception',
        role: options.role ?? 'reception', office: options.office ?? 'brisbane', active: true,
        pinHash: 'hash', failedAttemptCount: options.failedAttemptCount ?? 0, lockedUntil: null,
      },
    },
  });
}

function useReceptionist(office?: unknown) {
  firebaseMocks.user = {
    displayName: 'Real Receptionist',
    customClaims: { role: 'reception', ...(office === undefined ? {} : { office }) },
  };
}

function call(handler: unknown, data: DocumentData, auth: DocumentData | null = { uid: 'real-admin' }) {
  return (handler as any)({ auth, data });
}

beforeEach(() => {
  firebaseMocks.db = createFirestore();
  firebaseMocks.user = {
    displayName: 'Real Administrator',
    customClaims: { role: 'administrator', office: 'brisbane' },
  };
  firebaseMocks.pinValid = false;
  firebaseMocks.tokenClaims = undefined;
});

describe('stock order lifecycle callables', () => {
  it.each([
    ['createStockOrderDraft', createStockOrderDraft],
    ['submitStockOrder', submitStockOrder],
    ['approveStockOrder', approveStockOrder],
    ['rejectStockOrder', rejectStockOrder],
    ['markStockOrderOrdered', markStockOrderOrdered],
    ['cancelStockOrder', cancelStockOrder],
  ])('rejects nullable data for %s', async (_name, handler) => {
    await expect(call(handler, null as any)).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rejects missing and unsupported authenticated role claims', async () => {
    firebaseMocks.user = { displayName: 'No Role', customClaims: { office: 'brisbane' } };
    await expect(call(createStockOrderDraft, {})).rejects.toMatchObject({ code: 'permission-denied' });

    firebaseMocks.user = { displayName: 'Manager', customClaims: { role: 'manager', office: 'brisbane' } };
    await expect(call(createStockOrderDraft, {})).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('marks an order ordered and snapshots every line quantity in the same transaction', async () => {
    await call(markStockOrderOrdered, {
      orderId: 'order-1',
      supplierReference: 'SUP-42',
      expectedDeliveryDate: '2026-08-12',
      actorUid: 'spoofed-user',
      office: 'sydney',
      lines: [
        { stockItemId: 'item-1', quantityOrdered: 700 },
        { stockItemId: 'item-2', quantityOrdered: 800 },
      ],
    });

    expect(firebaseMocks.db.nonTransactionalReads).toEqual([]);
    expect(firebaseMocks.db.transactionReads).toEqual([
      'stockOrders/order-1',
      'orderLineItems?query',
    ]);
    expect(firebaseMocks.db.data('stockOrders', 'order-1')).toEqual(expect.objectContaining({
      status: 'ordered',
      orderedBy: 'real-admin',
      supplierReference: 'SUP-42',
      expectedDeliveryDate: '2026-08-12',
    }));
    expect(firebaseMocks.db.data('orderLineItems', 'line-approved')?.quantityOrdered).toBe(5);
    expect(firebaseMocks.db.data('orderLineItems', 'line-requested')?.quantityOrdered).toBe(3);
    expect(firebaseMocks.db.data('orderLineItems', 'other-order-line')?.quantityOrdered).toBe(999);
  });

  it('preserves administrator, transition, and self-approval protections', async () => {
    firebaseMocks.user.customClaims.role = 'reception';
    await expect(call(markStockOrderOrdered, { orderId: 'order-1' })).rejects.toMatchObject({ code: 'permission-denied' });

    firebaseMocks.user.customClaims.role = 'administrator';
    firebaseMocks.db = createFirestore('requested', 'real-admin');
    await expect(call(approveStockOrder, { orderId: 'order-1', reason: 'Needed' })).rejects.toMatchObject({ code: 'permission-denied' });

    firebaseMocks.db = createFirestore('requested');
    await expect(call(markStockOrderOrdered, { orderId: 'order-1' })).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('approves against transactional order and line snapshots before writing', async () => {
    firebaseMocks.db = createFirestore('requested');

    await call(approveStockOrder, {
      orderId: 'order-1',
      reason: 'Approved for the office',
      lineApprovals: [{ stockItemId: 'item-1', quantityApproved: 4 }],
      approvedBy: 'spoofed-user',
    });

    expect(firebaseMocks.db.nonTransactionalReads).toEqual([]);
    expect(firebaseMocks.db.transactionReads).toEqual([
      'stockOrders/order-1',
      'orderLineItems?query',
    ]);
    expect(firebaseMocks.db.data('stockOrders', 'order-1')).toEqual(expect.objectContaining({
      status: 'approved',
      approvedBy: 'real-admin',
    }));
    expect(firebaseMocks.db.data('orderLineItems', 'line-approved')?.quantityApproved).toBe(4);
  });

  it('derives draft ownership and office from authenticated server claims', async () => {
    firebaseMocks.db = createFirestore();
    await call(createStockOrderDraft, { requestedBy: 'spoofed-user', office: 'sydney' });

    expect(firebaseMocks.db.all('stockOrders')).toContainEqual(expect.objectContaining({
      requestedBy: 'real-admin',
      office: 'brisbane',
    }));
  });

  it('submits from transactional order and prerequisite snapshots without duplicate lines', async () => {
    firebaseMocks.db = createSubmitFirestore();
    useReceptionist('brisbane');

    await call(submitStockOrder, {
      orderId: 'order-1',
      supplierId: 'supplier-1',
      lines: [{ stockItemId: 'item-1', quantityRequested: 2 }],
      requestedBy: 'spoofed-user',
      office: 'perth',
    }, { uid: 'real-user' });

    expect(firebaseMocks.db.nonTransactionalReads).toEqual([]);
    expect(firebaseMocks.db.transactionReads).toEqual([
      'stockOrders/order-1',
      'suppliers/supplier-1',
      'orderLineItems?query',
      'stockItems/item-1',
      'stockInventory?query',
    ]);
    expect(firebaseMocks.db.data('stockOrders', 'order-1')?.status).toBe('requested');
    expect(firebaseMocks.db.all('orderLineItems')).toHaveLength(1);
  });

  it('rejects a stale concurrent submit instead of creating another line set', async () => {
    firebaseMocks.db = createSubmitFirestore();
    useReceptionist('brisbane');
    firebaseMocks.db.mutateBeforeNextWrite(() => {
      firebaseMocks.db.update(firebaseMocks.db.collection('stockOrders').doc('order-1'), { status: 'requested' });
      firebaseMocks.db.set(firebaseMocks.db.collection('orderLineItems').doc('existing-line'), {
        orderId: 'order-1', stockItemId: 'item-1', quantityRequested: 2,
      });
    });

    await expect(call(submitStockOrder, {
      orderId: 'order-1',
      lines: [{ stockItemId: 'item-1', quantityRequested: 2 }],
    }, { uid: 'real-user' })).rejects.toMatchObject({ code: 'failed-precondition' });

    expect(firebaseMocks.db.data('stockOrders', 'order-1')?.status).toBe('requested');
    expect(firebaseMocks.db.all('orderLineItems')).toHaveLength(1);
  });

  it('rejects duplicate stock items in one submission', async () => {
    firebaseMocks.db = createSubmitFirestore();
    useReceptionist('brisbane');

    await expect(call(submitStockOrder, {
      orderId: 'order-1',
      lines: [
        { stockItemId: 'item-1', quantityRequested: 2 },
        { stockItemId: 'item-1', quantityRequested: 3 },
      ],
    }, { uid: 'real-user' })).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(firebaseMocks.db.all('orderLineItems')).toHaveLength(0);
  });

  it('rejects against the current transactional status after a concurrent change', async () => {
    firebaseMocks.db = createFirestore('requested');
    firebaseMocks.db.mutateBeforeNextWrite(() => {
      firebaseMocks.db.update(firebaseMocks.db.collection('stockOrders').doc('order-1'), { status: 'approved' });
    });

    await expect(call(rejectStockOrder, { orderId: 'order-1', reason: 'No budget' }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(firebaseMocks.db.data('stockOrders', 'order-1')?.status).toBe('approved');
  });

  it('cancels against current transactional ownership and status', async () => {
    firebaseMocks.db = createSubmitFirestore('draft', 'real-user');
    firebaseMocks.db.mutateBeforeNextWrite(() => {
      firebaseMocks.db.update(firebaseMocks.db.collection('stockOrders').doc('order-1'), { status: 'received' });
    });

    await expect(call(cancelStockOrder, { orderId: 'order-1', reason: 'No longer required' }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(firebaseMocks.db.data('stockOrders', 'order-1')?.status).toBe('received');
  });

  it('fails closed when a non-admin operation requires a missing or invalid office claim', async () => {
    firebaseMocks.db = createSubmitFirestore();
    useReceptionist();
    await expect(call(createStockOrderDraft, {}, { uid: 'real-user' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    await expect(call(submitStockOrder, {
      orderId: 'order-1', lines: [{ stockItemId: 'item-1', quantityRequested: 1 }],
    }, { uid: 'real-user' })).rejects.toMatchObject({ code: 'permission-denied' });

    useReceptionist('sydney');
    await expect(call(createStockOrderDraft, {}, { uid: 'real-user' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('preserves administrator all-office actions without requiring an office claim', async () => {
    firebaseMocks.user = { displayName: 'Global Admin', customClaims: { role: 'administrator' } };
    firebaseMocks.db = createFirestore('requested');

    await expect(call(rejectStockOrder, { orderId: 'order-1', reason: 'Duplicate request' }))
      .resolves.toMatchObject({ status: 'rejected' });
  });

  it('preserves submit, reject, and cancel authorization boundaries', async () => {
    useReceptionist('brisbane');

    firebaseMocks.db = createSubmitFirestore('draft', 'another-user');
    await expect(call(submitStockOrder, {
      orderId: 'order-1', lines: [{ stockItemId: 'item-1', quantityRequested: 1 }],
    }, { uid: 'real-user' })).rejects.toMatchObject({ code: 'permission-denied' });

    firebaseMocks.db = createFirestore('requested');
    await expect(call(rejectStockOrder, { orderId: 'order-1', reason: 'No' }, { uid: 'real-user' }))
      .rejects.toMatchObject({ code: 'permission-denied' });

    firebaseMocks.db = createSubmitFirestore('draft', 'another-user');
    await expect(call(cancelStockOrder, { orderId: 'order-1' }, { uid: 'real-user' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('applyStockMovement security and concurrency', () => {
  const movement = { stockItemId: 'item-1', stockInventoryId: 'inventory-1', movementType: 'manual-adjustment', quantity: 2, reason: 'Count correction' };

  it('rejects nullable callable data as invalid-argument', async () => {
    await expect(call(applyStockMovement, null as any, { uid: 'real-user' }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rejects reception cross-office movements and invalid roles', async () => {
    firebaseMocks.db = createMovementFirestore('perth');
    useReceptionist('brisbane');
    await expect(call(applyStockMovement, movement, { uid: 'real-user' }))
      .rejects.toMatchObject({ code: 'permission-denied' });

    firebaseMocks.db = createMovementFirestore('brisbane');
    firebaseMocks.user.customClaims = { role: 'manager', office: 'brisbane' };
    await expect(call(applyStockMovement, movement, { uid: 'real-user' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('uses the transactional inventory quantity after a concurrent change', async () => {
    firebaseMocks.db = createMovementFirestore('brisbane', 5);
    useReceptionist('brisbane');
    firebaseMocks.db.mutateBeforeNextWrite(() => {
      firebaseMocks.db.update(firebaseMocks.db.collection('stockInventory').doc('inventory-1'), { currentQuantity: 8 });
    });

    await expect(call(applyStockMovement, movement, { uid: 'real-user' }))
      .resolves.toMatchObject({ resultingQuantity: 10 });
    expect(firebaseMocks.db.data('stockInventory', 'inventory-1')?.currentQuantity).toBe(10);
    expect(firebaseMocks.db.transactionReads).toContain('stockInventory/inventory-1');
  });

  it('allows an administrator without an office claim to move stock in a permitted office', async () => {
    firebaseMocks.db = createMovementFirestore('perth');
    firebaseMocks.user = { displayName: 'Global Admin', customClaims: { role: 'administrator' } };
    await expect(call(applyStockMovement, movement, { uid: 'real-admin' }))
      .resolves.toMatchObject({ resultingQuantity: 7 });
  });
});

describe('operationalLogin validation and concurrency', () => {
  it('rejects nullable callable data as invalid-argument', async () => {
    await expect(call(operationalLogin, null as any, null))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('does not mint a token for an invalid account role and office combination', async () => {
    firebaseMocks.db = createLoginFirestore({ role: 'administrator', office: 'brisbane' });
    firebaseMocks.pinValid = true;

    await expect(call(operationalLogin, { accountKey: 'brisbane-reception', pin: '1234' }, null))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(firebaseMocks.tokenClaims).toBeUndefined();
  });

  it('increments from the current transactional failure count', async () => {
    firebaseMocks.db = createLoginFirestore({ failedAttemptCount: 1 });
    firebaseMocks.db.mutateBeforeNextWrite(() => {
      firebaseMocks.db.update(firebaseMocks.db.collection('operationalAccounts').doc('account-1'), { failedAttemptCount: 3 });
    });

    await expect(call(operationalLogin, { accountKey: 'brisbane-reception', pin: '9999' }, null))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    expect(firebaseMocks.db.data('operationalAccounts', 'account-1')?.failedAttemptCount).toBe(4);
    expect(firebaseMocks.db.transactionReads).toContain('operationalAccounts/account-1');
  });

  it('rejects a verified PIN when credential or identity fields change before token issuance', async () => {
    firebaseMocks.db = createLoginFirestore();
    firebaseMocks.pinValid = true;
    firebaseMocks.db.mutateBeforeNextWrite(() => {
      firebaseMocks.db.update(firebaseMocks.db.collection('operationalAccounts').doc('account-1'), {
        pinHash: 'replacement-hash', role: 'administrator', office: 'all',
      });
    });

    await expect(call(operationalLogin, { accountKey: 'brisbane-reception', pin: '1234' }, null))
      .rejects.toMatchObject({ code: 'unauthenticated' });
    expect(firebaseMocks.tokenClaims).toBeUndefined();
  });
});
