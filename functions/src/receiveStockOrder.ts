import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';

export const receiveStockOrder = https.onCall({ region: 'australia-southeast1', minInstances: 0, maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' }, async (request) => {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Authentication required.');
  const auth = getAuth();
  const user = await auth.getUser(request.auth.uid);
  const claims = user.customClaims || {};
  const actorUid = request.auth.uid;
  const actorName = user.displayName || claims.accountKey || 'Unknown';
  const role = claims.role || 'reception';
  const isAdmin = role === 'administrator';
  const office = claims.office || 'brisbane';

  const { orderId, receipts, deliveryReference, notes } = request.data as any;
  if (!orderId || !receipts || !Array.isArray(receipts) || receipts.length === 0) {
    throw new https.HttpsError('invalid-argument', 'Order ID and receipt lines required.');
  }

  const db = getFirestore();
  const orderSnap = await db.collection('stockOrders').doc(orderId).get();
  if (!orderSnap.exists) throw new https.HttpsError('not-found', 'Order not found.');
  const order = orderSnap.data()!;
  if (order.status !== 'ordered' && order.status !== 'partially-received') {
    throw new https.HttpsError('failed-precondition', `Cannot receive a ${order.status} order.`);
  }
  if (order.office !== office && !isAdmin) {
    throw new https.HttpsError('permission-denied', 'Office mismatch.');
  }

  await db.runTransaction(async (tx) => {
    for (const rc of receipts) {
      if (!rc.stockItemId || !isFinite(rc.quantity) || rc.quantity <= 0) {
        throw new https.HttpsError('invalid-argument', 'Invalid receipt line.');
      }
      const lineSnap = await db.collection('orderLineItems').where('orderId', '==', orderId).where('stockItemId', '==', rc.stockItemId).limit(1).get();
      if (lineSnap.empty) throw new https.HttpsError('not-found', `Line item ${rc.stockItemId} not found.`);
      const line = lineSnap.docs[0];
      const lineData = line.data();
      const orderedQty = lineData.quantityOrdered ?? lineData.quantityApproved ?? lineData.quantityRequested;
      const remaining = orderedQty - (lineData.quantityReceived || 0);
      if (rc.quantity > remaining) throw new https.HttpsError('failed-precondition', `Over-receipt rejected for ${lineData.itemName}. Max remaining: ${remaining}`);

      // Update line
      tx.update(line.ref, { quantityReceived: (lineData.quantityReceived || 0) + rc.quantity });

      // Update inventory
      const invSnap = await db.collection('stockInventory').where('stockItemId', '==', rc.stockItemId).where('office', '==', order.office).limit(1).get();
      if (invSnap.empty) throw new https.HttpsError('not-found', `No inventory for item in ${order.office}.`);
      const inv = invSnap.docs[0];
      const prevQty = inv.data().currentQuantity || 0;
      tx.update(inv.ref, { currentQuantity: prevQty + rc.quantity, updatedAt: Timestamp.now(), updatedBy: actorUid });

      // Create movement
      const movRef = db.collection('stockMovements').doc();
      tx.set(movRef, {
        stockItemId: rc.stockItemId, stockInventoryId: inv.id, office: order.office,
        movementType: 'received-order', quantityChange: rc.quantity, previousQuantity: prevQty,
        resultingQuantity: prevQty + rc.quantity, reason: `Received from order ${orderId}`,
        relatedOrderId: orderId, notes: notes || null, actorUid, actorDisplayName: actorName,
        createdAt: Timestamp.now(),
      });
    }

    // Update order status
    const linesSnap = await db.collection('orderLineItems').where('orderId', '==', orderId).get();
    const allDone = linesSnap.docs.every(l => ((l.data().quantityOrdered ?? l.data().quantityApproved ?? l.data().quantityRequested) - (l.data().quantityReceived || 0)) <= 0);
    const anyReceived = linesSnap.docs.some(l => (l.data().quantityReceived || 0) > 0);
    tx.update(db.collection('stockOrders').doc(orderId), {
      status: allDone ? 'received' : anyReceived ? 'partially-received' : order.status,
      updatedAt: Timestamp.now(),
    });

    // Create receipt record
    const receiptRef = db.collection('stockReceipts').doc();
    tx.set(receiptRef, {
      orderId, office: order.office, receivedBy: actorUid, receivedAt: Timestamp.now(),
      deliveryReference: deliveryReference || null, notes: notes || null,
    });
  });

  return { success: true };
});
