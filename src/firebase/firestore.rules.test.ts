import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-reception-hub-rules-test';
const FIRESTORE_PORT = 8080;
const emulatorRequired = process.env.npm_lifecycle_event === 'test:rules';
const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (emulatorRequired && !emulatorAvailable) {
  throw new Error('The Firestore rules suite requires the Firestore emulator. Run it with npm run test:rules.');
}

let testEnv: RulesTestEnvironment;

describe.skipIf(!emulatorAvailable)('Firestore security rules', () => {
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: FIRESTORE_PORT,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all([
      setDoc(doc(db, 'userProfiles', 'brisbane-user'), {
        uid: 'brisbane-user', role: 'reception', office: 'brisbane', active: true,
      }),
      setDoc(doc(db, 'userProfiles', 'perth-user'), {
        uid: 'perth-user', role: 'reception', office: 'perth', active: true,
      }),
      setDoc(doc(db, 'userProfiles', 'inactive-user'), {
        uid: 'inactive-user', role: 'reception', office: 'brisbane', active: false,
      }),
      setDoc(doc(db, 'userProfiles', 'administrator'), {
        uid: 'administrator', role: 'administrator', office: 'all', active: true,
      }),
      setDoc(doc(db, 'stockOrders', 'brisbane-order'), {
        office: 'brisbane', status: 'approved', requestedBy: 'brisbane-user', createdAt: '2026-08-01',
      }),
      setDoc(doc(db, 'stockOrders', 'perth-order'), {
        office: 'perth', status: 'approved', requestedBy: 'perth-user', createdAt: '2026-08-01',
      }),
      setDoc(doc(db, 'orderLineItems', 'brisbane-line'), {
        orderId: 'brisbane-order', stockItemId: 'paper', quantityRequested: 2,
      }),
      setDoc(doc(db, 'orderLineItems', 'perth-line'), {
        orderId: 'perth-order', stockItemId: 'pens', quantityRequested: 4,
      }),
      setDoc(doc(db, 'stockReceipts', 'brisbane-receipt'), {
        orderId: 'brisbane-order', office: 'brisbane', receivedBy: 'brisbane-user', receivedAt: '2026-08-01',
      }),
      setDoc(doc(db, 'stockReceipts', 'perth-receipt'), {
        orderId: 'perth-order', office: 'perth', receivedBy: 'perth-user', receivedAt: '2026-08-01',
      }),
      setDoc(doc(db, 'stockInventory', 'brisbane-inventory'), {
        stockItemId: 'paper', office: 'brisbane', currentQuantity: 10,
      }),
      setDoc(doc(db, 'stockInventory', 'perth-inventory'), {
        stockItemId: 'pens', office: 'perth', currentQuantity: 12,
      }),
      setDoc(doc(db, 'stockMovements', 'brisbane-movement'), {
        stockItemId: 'paper', stockInventoryId: 'brisbane-inventory', office: 'brisbane', quantity: 2,
        createdAt: '2026-08-01',
      }),
      setDoc(doc(db, 'stockMovements', 'perth-movement'), {
        stockItemId: 'pens', stockInventoryId: 'perth-inventory', office: 'perth', quantity: 3,
        createdAt: '2026-08-01',
      }),
      setDoc(doc(db, 'operationalAccounts', 'brisbane-reception'), {
        active: true, pinHash: 'not-a-real-hash',
      }),
    ]);
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function dbFor(uid?: string) {
  return uid
    ? testEnv.authenticatedContext(uid, { office: 'forged-token-office', role: 'administrator' }).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

describe('active profile and office read boundaries', () => {
  it('denies unauthenticated and inactive users', async () => {
    await assertFails(getDoc(doc(dbFor(), 'stockOrders', 'brisbane-order')));
    await assertFails(getDoc(doc(dbFor('inactive-user'), 'stockOrders', 'brisbane-order')));
  });

  it('uses the active profile office rather than forged auth claims', async () => {
    const db = dbFor('brisbane-user');

    await assertSucceeds(getDoc(doc(db, 'stockOrders', 'brisbane-order')));
    await assertFails(getDoc(doc(db, 'stockOrders', 'perth-order')));
  });

  it('enforces office scope for inventory, movements, and receipts', async () => {
    const db = dbFor('brisbane-user');

    await assertSucceeds(getDoc(doc(db, 'stockInventory', 'brisbane-inventory')));
    await assertFails(getDoc(doc(db, 'stockInventory', 'perth-inventory')));
    await assertSucceeds(getDoc(doc(db, 'stockMovements', 'brisbane-movement')));
    await assertFails(getDoc(doc(db, 'stockMovements', 'perth-movement')));
    await assertSucceeds(getDoc(doc(db, 'stockReceipts', 'brisbane-receipt')));
    await assertFails(getDoc(doc(db, 'stockReceipts', 'perth-receipt')));
  });

  it('lets an active administrator read all offices', async () => {
    const db = dbFor('administrator');

    await assertSucceeds(getDocs(collection(db, 'stockOrders')));
    await assertSucceeds(getDocs(collection(db, 'orderLineItems')));
    await assertSucceeds(getDocs(collection(db, 'stockReceipts')));
    await assertSucceeds(getDocs(collection(db, 'stockInventory')));
    await assertSucceeds(getDocs(collection(db, 'stockMovements')));
  });

  it('requires reception order queries to state their own office scope', async () => {
    const db = dbFor('brisbane-user');

    await assertSucceeds(getDocs(query(
      collection(db, 'stockOrders'),
      where('office', '==', 'brisbane'),
      orderBy('createdAt', 'desc'),
    )));
    await assertFails(getDocs(query(collection(db, 'stockOrders'), orderBy('createdAt', 'desc'))));
    await assertFails(getDocs(query(
      collection(db, 'stockOrders'),
      where('office', '==', 'perth'),
      orderBy('createdAt', 'desc'),
    )));
  });

  it('requires stock inventory queries to combine item and own-office filters', async () => {
    const db = dbFor('brisbane-user');

    await assertSucceeds(getDocs(query(
      collection(db, 'stockInventory'),
      where('stockItemId', '==', 'paper'),
      where('office', '==', 'brisbane'),
    )));
    await assertFails(getDocs(query(
      collection(db, 'stockInventory'),
      where('stockItemId', '==', 'paper'),
    )));
    await assertFails(getDocs(query(
      collection(db, 'stockInventory'),
      where('stockItemId', '==', 'pens'),
      where('office', '==', 'perth'),
    )));
  });

  it('requires stock movement queries to combine inventory and own-office filters', async () => {
    const db = dbFor('brisbane-user');

    await assertSucceeds(getDocs(query(
      collection(db, 'stockMovements'),
      where('stockInventoryId', '==', 'brisbane-inventory'),
      where('office', '==', 'brisbane'),
      orderBy('createdAt', 'desc'),
      limit(50),
    )));
    await assertFails(getDocs(query(
      collection(db, 'stockMovements'),
      where('stockInventoryId', '==', 'brisbane-inventory'),
      orderBy('createdAt', 'desc'),
      limit(50),
    )));
    await assertFails(getDocs(query(
      collection(db, 'stockMovements'),
      where('stockInventoryId', '==', 'perth-inventory'),
      where('office', '==', 'perth'),
      orderBy('createdAt', 'desc'),
      limit(50),
    )));
  });

  it('requires stock receipt queries to combine order and own-office filters', async () => {
    const db = dbFor('brisbane-user');

    await assertSucceeds(getDocs(query(
      collection(db, 'stockReceipts'),
      where('orderId', '==', 'brisbane-order'),
      where('office', '==', 'brisbane'),
    )));
    await assertFails(getDocs(query(
      collection(db, 'stockReceipts'),
      where('orderId', '==', 'brisbane-order'),
    )));
    await assertFails(getDocs(query(
      collection(db, 'stockReceipts'),
      where('orderId', '==', 'perth-order'),
      where('office', '==', 'perth'),
    )));
  });
});

describe('order line parent scoping', () => {
  it('authorizes a line through its parent order office', async () => {
    const db = dbFor('brisbane-user');

    await assertSucceeds(getDoc(doc(db, 'orderLineItems', 'brisbane-line')));
    await assertFails(getDoc(doc(db, 'orderLineItems', 'perth-line')));
  });

  it('allows a query constrained to an accessible parent and rejects a cross-office parent', async () => {
    const db = dbFor('brisbane-user');

    await assertSucceeds(getDocs(query(collection(db, 'orderLineItems'), where('orderId', '==', 'brisbane-order'))));
    await assertFails(getDocs(query(collection(db, 'orderLineItems'), where('orderId', '==', 'perth-order'))));
    await assertFails(getDocs(collection(db, 'orderLineItems')));
  });
});

describe('trusted-server-only writes', () => {
  it('denies forged and direct order writes', async () => {
    const db = dbFor('brisbane-user');

    await assertFails(setDoc(doc(db, 'stockOrders', 'forged-order'), {
      office: 'brisbane', requestedBy: 'brisbane-user', status: 'draft',
    }));
    await assertFails(updateDoc(doc(db, 'stockOrders', 'brisbane-order'), { status: 'received' }));
    await assertFails(deleteDoc(doc(db, 'stockOrders', 'brisbane-order')));
  });

  it('denies forged and direct line-item writes', async () => {
    const db = dbFor('brisbane-user');

    await assertFails(setDoc(doc(db, 'orderLineItems', 'forged-line'), {
      orderId: 'brisbane-order', stockItemId: 'paper', quantityRequested: 999,
    }));
    await assertFails(updateDoc(doc(db, 'orderLineItems', 'brisbane-line'), { quantityRequested: 999 }));
    await assertFails(deleteDoc(doc(db, 'orderLineItems', 'brisbane-line')));
  });

  it('denies forged and direct receipt writes', async () => {
    const db = dbFor('brisbane-user');

    await assertFails(setDoc(doc(db, 'stockReceipts', 'forged-receipt'), {
      orderId: 'brisbane-order', office: 'brisbane', receivedBy: 'brisbane-user',
    }));
    await assertFails(updateDoc(doc(db, 'stockReceipts', 'brisbane-receipt'), { office: 'perth' }));
    await assertFails(deleteDoc(doc(db, 'stockReceipts', 'brisbane-receipt')));
  });

  it('retains inventory and movement write denial', async () => {
    const db = dbFor('administrator');

    await assertFails(setDoc(doc(db, 'stockInventory', 'forged-inventory'), {
      stockItemId: 'paper', office: 'brisbane', currentQuantity: 999,
    }));
    await assertFails(updateDoc(doc(db, 'stockInventory', 'brisbane-inventory'), { currentQuantity: 999 }));
    await assertFails(deleteDoc(doc(db, 'stockInventory', 'brisbane-inventory')));
    await assertFails(setDoc(doc(db, 'stockMovements', 'forged-movement'), {
      stockItemId: 'paper', stockInventoryId: 'brisbane-inventory', office: 'brisbane', quantity: 999,
    }));
    await assertFails(updateDoc(doc(db, 'stockMovements', 'brisbane-movement'), { quantity: 999 }));
    await assertFails(deleteDoc(doc(db, 'stockMovements', 'brisbane-movement')));
  });

  it('keeps operational account documents inaccessible to clients', async () => {
    const db = dbFor('administrator');

    await assertFails(getDoc(doc(db, 'operationalAccounts', 'brisbane-reception')));
    await assertFails(setDoc(doc(db, 'operationalAccounts', 'forged-account'), { active: true }));
    await assertFails(updateDoc(doc(db, 'operationalAccounts', 'brisbane-reception'), { active: false }));
    await assertFails(deleteDoc(doc(db, 'operationalAccounts', 'brisbane-reception')));
  });
});
});
