import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['requested', 'cancelled'],
  requested: ['approved', 'rejected', 'cancelled'],
  approved: ['ordered', 'cancelled'],
  ordered: ['cancelled'],
};

async function getActor(request: any) {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Authentication required.');
  const auth = getAuth();
  const user = await auth.getUser(request.auth.uid);
  const claims = user.customClaims || {};
  return {
    uid: request.auth.uid,
    name: user.displayName || claims.accountKey || 'Unknown',
    role: claims.role || 'reception',
    isAdmin: claims.role === 'administrator',
    office: claims.office || 'brisbane',
  };
}

function checkTransition(current: string, next: string) {
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new https.HttpsError('failed-precondition', `Cannot transition from ${current} to ${next}.`);
  }
}

async function validateOrder(db: any, orderId: string) {
  const snap = await db.collection('stockOrders').doc(orderId).get();
  if (!snap.exists) throw new https.HttpsError('not-found', 'Order not found.');
  return { id: snap.id, ...snap.data() };
}

export const createStockOrderDraft = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  const db = getFirestore();
  const ref = await db.collection('stockOrders').add({
    office: actor.office, requestedBy: actor.uid, status: 'draft',
    createdAt: Timestamp.now(), updatedAt: Timestamp.now(), requestedAt: Timestamp.now(),
  });
  return { id: ref.id, status: 'draft' };
});

export const submitStockOrder = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  const { orderId, supplierId, lines, notes } = request.data;
  if (!orderId || !lines || !Array.isArray(lines) || lines.length === 0) throw new https.HttpsError('invalid-argument', 'Order ID and at least one line required.');
  const db = getFirestore();
  const order = await validateOrder(db, orderId);
  if (order.requestedBy !== actor.uid && !actor.isAdmin) throw new https.HttpsError('permission-denied', 'Not your draft.');
  checkTransition(order.status, 'requested');
  if (order.office !== actor.office && !actor.isAdmin) throw new https.HttpsError('permission-denied', 'Office mismatch.');
  if (supplierId) {
    const suppSnap = await db.collection('suppliers').doc(supplierId).get();
    if (!suppSnap.exists) throw new https.HttpsError('not-found', 'Supplier not found.');
    if (suppSnap.data()?.active === false) throw new https.HttpsError('failed-precondition', 'Supplier is archived.');
  }
  for (const line of lines) {
    if (!line.stockItemId || !line.quantityRequested || line.quantityRequested <= 0 || !isFinite(line.quantityRequested)) {
      throw new https.HttpsError('invalid-argument', 'Invalid line item.');
    }
    const itemSnap = await db.collection('stockItems').doc(line.stockItemId).get();
    if (!itemSnap.exists) throw new https.HttpsError('not-found', `Item ${line.stockItemId} not found.`);
    if (itemSnap.data()?.active === false) throw new https.HttpsError('failed-precondition', `Item ${line.itemName || line.stockItemId} is archived.`);
    const invSnap = await db.collection('stockInventory').where('stockItemId', '==', line.stockItemId).where('office', '==', order.office).limit(1).get();
    if (invSnap.empty) throw new https.HttpsError('not-found', `No inventory record for item in ${order.office}.`);
  }
  await db.runTransaction(async (tx) => {
    tx.update(db.collection('stockOrders').doc(orderId), { status: 'requested', supplierId: supplierId || null, notes: notes || null, updatedAt: Timestamp.now() });
    for (const line of lines) {
      const itemSnap = await db.collection('stockItems').doc(line.stockItemId).get();
      const item = itemSnap.data()!;
      tx.set(db.collection('orderLineItems').doc(), {
        orderId, stockItemId: line.stockItemId, itemName: item.itemName || line.itemName,
        unitLabel: item.unitLabel || line.unitLabel,
        quantityRequested: line.quantityRequested, quantityReceived: 0, createdAt: Timestamp.now(),
      });
    }
  });
  return { success: true, status: 'requested' };
});

export const approveStockOrder = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  if (!actor.isAdmin) throw new https.HttpsError('permission-denied', 'Administrator access required.');
  const { orderId, lineApprovals, reason } = request.data;
  if (!orderId) throw new https.HttpsError('invalid-argument', 'Order ID required.');
  const db = getFirestore();
  const order = await validateOrder(db, orderId);
  if (order.requestedBy === actor.uid) throw new https.HttpsError('permission-denied', 'Self-approval denied.');
  checkTransition(order.status, 'approved');
  if (!reason?.trim()) throw new https.HttpsError('invalid-argument', 'Approval reason required.');
  await db.runTransaction(async (tx) => {
    tx.update(db.collection('stockOrders').doc(orderId), { status: 'approved', approvedBy: actor.uid, approvedAt: Timestamp.now(), notes: reason.trim(), updatedAt: Timestamp.now() });
    if (lineApprovals) {
      const lines = await db.collection('orderLineItems').where('orderId', '==', orderId).get();
      for (const la of lineApprovals) {
        if (!isFinite(la.quantityApproved) || la.quantityApproved < 0) throw new https.HttpsError('invalid-argument', 'Invalid approved quantity.');
        const match = lines.docs.find(l => l.data().stockItemId === la.stockItemId);
        if (match) tx.update(match.ref, { quantityApproved: la.quantityApproved });
      }
    }
  });
  return { success: true, status: 'approved' };
});

export const rejectStockOrder = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  if (!actor.isAdmin) throw new https.HttpsError('permission-denied', 'Administrator access required.');
  const { orderId, reason } = request.data;
  if (!orderId || !reason?.trim()) throw new https.HttpsError('invalid-argument', 'Order ID and reason required.');
  const db = getFirestore();
  const order = await validateOrder(db, orderId);
  checkTransition(order.status, 'rejected');
  await db.collection('stockOrders').doc(orderId).update({ status: 'rejected', notes: reason.trim(), updatedAt: Timestamp.now() });
  return { success: true, status: 'rejected' };
});

export const markStockOrderOrdered = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  if (!actor.isAdmin) throw new https.HttpsError('permission-denied', 'Administrator access required.');
  const { orderId, supplierReference, expectedDeliveryDate, notes } = request.data;
  if (!orderId) throw new https.HttpsError('invalid-argument', 'Order ID required.');
  const db = getFirestore();
  const order = await validateOrder(db, orderId);
  checkTransition(order.status, 'ordered');
  await db.collection('stockOrders').doc(orderId).update({
    status: 'ordered', orderedBy: actor.uid, orderedAt: Timestamp.now(),
    supplierReference: supplierReference || null, expectedDeliveryDate: expectedDeliveryDate || null,
    notes: notes || null, updatedAt: Timestamp.now(),
  });
  return { success: true, status: 'ordered' };
});

export const cancelStockOrder = https.onCall({ region: 'australia-southeast1' }, async (request) => {
  const actor = await getActor(request);
  const { orderId, reason } = request.data;
  if (!orderId) throw new https.HttpsError('invalid-argument', 'Order ID required.');
  const db = getFirestore();
  const order = await validateOrder(db, orderId);
  if (order.status === 'draft' && order.requestedBy === actor.uid) { /* owner can cancel draft */ }
  else if (!actor.isAdmin) throw new https.HttpsError('permission-denied', 'Administrator access required.');
  else if (order.status !== 'draft' && !reason?.trim()) throw new https.HttpsError('invalid-argument', 'Reason required for cancellation.');
  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed?.includes('cancelled')) throw new https.HttpsError('failed-precondition', `Cannot cancel a ${order.status} order.`);
  checkTransition(order.status, 'cancelled');
  await db.collection('stockOrders').doc(orderId).update({ status: 'cancelled', notes: reason?.trim() || null, updatedAt: Timestamp.now() });
  return { success: true, status: 'cancelled' };
});
