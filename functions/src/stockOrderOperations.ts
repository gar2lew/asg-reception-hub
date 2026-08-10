import { adminAuth, adminDb } from './admin.js';
import { Timestamp } from 'firebase-admin/firestore';
import * as https from 'firebase-functions/v2/https';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['requested', 'cancelled'],
  requested: ['approved', 'rejected', 'cancelled'],
  approved: ['ordered', 'cancelled'],
  ordered: ['cancelled'],
};

const VALID_OFFICES = new Set(['brisbane', 'perth']);
const VALID_ROLES = new Set(['administrator', 'reception']);

function requireData(request: any) {
  if (!request.data || typeof request.data !== 'object' || Array.isArray(request.data)) {
    throw new https.HttpsError('invalid-argument', 'Invalid request data.');
  }
  return request.data;
}

async function getActor(request: any) {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Authentication required.');
  const auth = adminAuth;
  const user = await auth.getUser(request.auth.uid);
  const claims = user.customClaims || {};
  const role = typeof claims.role === 'string' ? claims.role : undefined;
  if (!role || !VALID_ROLES.has(role)) {
    throw new https.HttpsError('permission-denied', 'A valid role claim is required.');
  }
  return {
    uid: request.auth.uid,
    name: user.displayName || claims.accountKey || 'Unknown',
    role,
    isAdmin: role === 'administrator',
    office: typeof claims.office === 'string' ? claims.office : undefined,
  };
}

function requireOffice(actor: { office?: string }) {
  if (!actor.office || !VALID_OFFICES.has(actor.office)) {
    throw new https.HttpsError('permission-denied', 'A valid office claim is required.');
  }
  return actor.office;
}

function checkTransition(current: string, next: string) {
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new https.HttpsError('failed-precondition', `Cannot transition from ${current} to ${next}.`);
  }
}

export const createStockOrderDraft = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  requireData(request);
  const office = requireOffice(actor);
  const db = adminDb;
  const ref = await db.collection('stockOrders').add({
    office, requestedBy: actor.uid, status: 'draft',
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(), requestedAt: Timestamp.now(),
  });
  return { id: ref.id, status: 'draft' };
});

export const submitStockOrder = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  const { orderId, supplierId, lines, notes } = requireData(request);
  if (!orderId || !lines || !Array.isArray(lines) || lines.length === 0) throw new https.HttpsError('invalid-argument', 'Order ID and at least one line required.');
  const stockItemIds = new Set<string>();
  for (const line of lines) {
    if (!line.stockItemId || !line.quantityRequested || line.quantityRequested <= 0 || !isFinite(line.quantityRequested)) {
      throw new https.HttpsError('invalid-argument', 'Invalid line item.');
    }
    if (stockItemIds.has(line.stockItemId)) throw new https.HttpsError('invalid-argument', 'Duplicate stock item in order lines.');
    stockItemIds.add(line.stockItemId);
  }

  const db = adminDb;
  const orderRef = db.collection('stockOrders').doc(orderId);
  const existingLinesQuery = db.collection('orderLineItems').where('orderId', '==', orderId);
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new https.HttpsError('not-found', 'Order not found.');
    const order = orderSnap.data()!;
    if (!VALID_OFFICES.has(order.office)) throw new https.HttpsError('failed-precondition', 'Order has an invalid office.');
    if (!actor.isAdmin) {
      if (order.requestedBy !== actor.uid) throw new https.HttpsError('permission-denied', 'Not your draft.');
      if (order.office !== requireOffice(actor)) throw new https.HttpsError('permission-denied', 'Office mismatch.');
    }
    checkTransition(order.status, 'requested');

    if (supplierId) {
      const suppSnap = await tx.get(db.collection('suppliers').doc(supplierId));
      if (!suppSnap.exists) throw new https.HttpsError('not-found', 'Supplier not found.');
      if (suppSnap.data()?.active === false) throw new https.HttpsError('failed-precondition', 'Supplier is archived.');
    }

    const existingLines = await tx.get(existingLinesQuery);
    if (!existingLines.empty) throw new https.HttpsError('failed-precondition', 'Order lines already exist.');

    const lineDocuments: Array<{ ref: any; data: Record<string, unknown> }> = [];
    for (const line of lines) {
      const itemSnap = await tx.get(db.collection('stockItems').doc(line.stockItemId));
      if (!itemSnap.exists) throw new https.HttpsError('not-found', `Item ${line.stockItemId} not found.`);
      const item = itemSnap.data()!;
      if (item.active === false) throw new https.HttpsError('failed-precondition', `Item ${line.itemName || line.stockItemId} is archived.`);
      const inventoryQuery = db.collection('stockInventory')
        .where('stockItemId', '==', line.stockItemId)
        .where('office', '==', order.office)
        .limit(1);
      const inventorySnap = await tx.get(inventoryQuery);
      if (inventorySnap.empty) throw new https.HttpsError('not-found', `No inventory record for item in ${order.office}.`);
      lineDocuments.push({ ref: db.collection('orderLineItems').doc(), data: {
        orderId, stockItemId: line.stockItemId, itemName: item.itemName || line.itemName,
        unitLabel: item.unitLabel || line.unitLabel,
        quantityRequested: line.quantityRequested, quantityReceived: 0, createdAt: Timestamp.now(),
      } });
    }

    tx.update(orderRef, { status: 'requested', supplierId: supplierId || null, notes: notes || null, updatedAt: Timestamp.now() });
    for (const lineDocument of lineDocuments) {
      tx.set(lineDocument.ref, lineDocument.data);
    }
  });
  return { success: true, status: 'requested' };
});

export const approveStockOrder = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  const { orderId, lineApprovals, reason } = requireData(request);
  if (!actor.isAdmin) throw new https.HttpsError('permission-denied', 'Administrator access required.');
  if (!orderId) throw new https.HttpsError('invalid-argument', 'Order ID required.');
  if (!reason?.trim()) throw new https.HttpsError('invalid-argument', 'Approval reason required.');
  const db = adminDb;
  const orderRef = db.collection('stockOrders').doc(orderId);
  const linesQuery = db.collection('orderLineItems').where('orderId', '==', orderId);
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new https.HttpsError('not-found', 'Order not found.');
    const order = orderSnap.data()!;
    if (order.requestedBy === actor.uid) throw new https.HttpsError('permission-denied', 'Self-approval denied.');
    checkTransition(order.status, 'approved');

    const lineUpdates: Array<{ ref: any; quantityApproved: number }> = [];
    if (lineApprovals) {
      const lines = await tx.get(linesQuery);
      for (const la of lineApprovals) {
        if (!isFinite(la.quantityApproved) || la.quantityApproved < 0) throw new https.HttpsError('invalid-argument', 'Invalid approved quantity.');
        const match = lines.docs.find(l => l.data().stockItemId === la.stockItemId);
        if (match) lineUpdates.push({ ref: match.ref, quantityApproved: la.quantityApproved });
      }
    }

    tx.update(orderRef, { status: 'approved', approvedBy: actor.uid, approvedAt: Timestamp.now(), notes: reason.trim(), updatedAt: Timestamp.now() });
    for (const line of lineUpdates) {
      tx.update(line.ref, { quantityApproved: line.quantityApproved });
    }
  });
  return { success: true, status: 'approved' };
});

export const rejectStockOrder = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  const { orderId, reason } = requireData(request);
  if (!actor.isAdmin) throw new https.HttpsError('permission-denied', 'Administrator access required.');
  if (!orderId || !reason?.trim()) throw new https.HttpsError('invalid-argument', 'Order ID and reason required.');
  const db = adminDb;
  const orderRef = db.collection('stockOrders').doc(orderId);
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new https.HttpsError('not-found', 'Order not found.');
    checkTransition(orderSnap.data()!.status, 'rejected');
    tx.update(orderRef, { status: 'rejected', notes: reason.trim(), updatedAt: Timestamp.now() });
  });
  return { success: true, status: 'rejected' };
});

export const markStockOrderOrdered = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  const { orderId, supplierReference, expectedDeliveryDate, notes } = requireData(request);
  if (!actor.isAdmin) throw new https.HttpsError('permission-denied', 'Administrator access required.');
  if (!orderId) throw new https.HttpsError('invalid-argument', 'Order ID required.');
  const db = adminDb;
  const orderRef = db.collection('stockOrders').doc(orderId);
  const linesQuery = db.collection('orderLineItems').where('orderId', '==', orderId);
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new https.HttpsError('not-found', 'Order not found.');
    const order = orderSnap.data()!;
    checkTransition(order.status, 'ordered');

    const lines = await tx.get(linesQuery);
    const orderedQuantities = lines.docs.map((line: any) => {
      const data = line.data();
      const quantityOrdered = data.quantityApproved ?? data.quantityRequested;
      if (!isFinite(quantityOrdered) || quantityOrdered < 0) {
        throw new https.HttpsError('failed-precondition', 'Order line has an invalid approved or requested quantity.');
      }
      return { ref: line.ref, quantityOrdered };
    });

    tx.update(orderRef, {
      status: 'ordered', orderedBy: actor.uid, orderedAt: Timestamp.now(),
      supplierReference: supplierReference || null, expectedDeliveryDate: expectedDeliveryDate || null,
      notes: notes || null, updatedAt: Timestamp.now(),
    });
    for (const line of orderedQuantities) {
      tx.update(line.ref, { quantityOrdered: line.quantityOrdered });
    }
  });
  return { success: true, status: 'ordered' };
});

export const cancelStockOrder = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  const { orderId, reason } = requireData(request);
  if (!orderId) throw new https.HttpsError('invalid-argument', 'Order ID required.');
  const db = adminDb;
  const orderRef = db.collection('stockOrders').doc(orderId);
  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new https.HttpsError('not-found', 'Order not found.');
    const order = orderSnap.data()!;
    if (!actor.isAdmin && order.status === 'draft' && order.requestedBy === actor.uid) {
      if (order.office !== requireOffice(actor)) throw new https.HttpsError('permission-denied', 'Office mismatch.');
    } else if (!actor.isAdmin) {
      throw new https.HttpsError('permission-denied', 'Administrator access required.');
    } else if (order.status !== 'draft' && !reason?.trim()) {
      throw new https.HttpsError('invalid-argument', 'Reason required for cancellation.');
    }
    checkTransition(order.status, 'cancelled');
    tx.update(orderRef, { status: 'cancelled', notes: reason?.trim() || null, updatedAt: Timestamp.now() });
  });
  return { success: true, status: 'cancelled' };
});
