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

  const normalizedReceipts = receipts.map((receipt: any) => ({
    stockItemId: receipt.stockItemId,
    quantity: Number(receipt.quantity),
  }));
  const seenStockItemIds = new Set<string>();
  for (const receipt of normalizedReceipts) {
    if (!receipt.stockItemId || !isFinite(receipt.quantity) || receipt.quantity <= 0) {
      throw new https.HttpsError('invalid-argument', 'Invalid receipt line.');
    }
    if (seenStockItemIds.has(receipt.stockItemId)) {
      throw new https.HttpsError('invalid-argument', `Duplicate receipt line for ${receipt.stockItemId}.`);
    }
    seenStockItemIds.add(receipt.stockItemId);
  }

  const db = getFirestore();
  const orderRef = db.collection('stockOrders').doc(orderId);

  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new https.HttpsError('not-found', 'Order not found.');
    const order = orderSnap.data()!;
    if (order.status !== 'ordered' && order.status !== 'partially-received') {
      throw new https.HttpsError('failed-precondition', `Cannot receive a ${order.status} order.`);
    }
    if (order.office !== office && !isAdmin) {
      throw new https.HttpsError('permission-denied', 'Office mismatch.');
    }

    const linesQuery = db.collection('orderLineItems').where('orderId', '==', orderId);
    const linesSnap = await tx.get(linesQuery);
    const receiptPlans = [];

    // Firestore requires transaction reads to complete before transaction writes.
    for (const receipt of normalizedReceipts) {
      const line = linesSnap.docs.find(lineDoc => lineDoc.data().stockItemId === receipt.stockItemId);
      if (!line) throw new https.HttpsError('not-found', `Line item ${receipt.stockItemId} not found.`);
      const lineData = line.data();
      const orderedQty = lineData.quantityOrdered ?? lineData.quantityApproved ?? lineData.quantityRequested;
      const remaining = orderedQty - (lineData.quantityReceived || 0);
      if (receipt.quantity > remaining) throw new https.HttpsError('failed-precondition', `Over-receipt rejected for ${lineData.itemName}. Max remaining: ${remaining}`);

      const inventoryQuery = db.collection('stockInventory')
        .where('stockItemId', '==', receipt.stockItemId)
        .where('office', '==', order.office)
        .limit(1);
      const invSnap = await tx.get(inventoryQuery);
      if (invSnap.empty) throw new https.HttpsError('not-found', `No inventory for item in ${order.office}.`);
      const inv = invSnap.docs[0];
      const prevQty = inv.data().currentQuantity || 0;

      receiptPlans.push({
        receipt,
        line,
        lineData,
        projectedLineQuantity: (lineData.quantityReceived || 0) + receipt.quantity,
        inv,
        prevQty,
      });
    }

    const projectedQuantities = new Map(
      receiptPlans.map(plan => [plan.line.id, plan.projectedLineQuantity]),
    );
    const allDone = linesSnap.docs.every(line => {
      const lineData = line.data();
      const orderedQty = lineData.quantityOrdered ?? lineData.quantityApproved ?? lineData.quantityRequested;
      const projectedReceived = projectedQuantities.get(line.id) ?? (lineData.quantityReceived || 0);
      return orderedQty - projectedReceived <= 0;
    });
    const anyReceived = linesSnap.docs.some(line => {
      const projectedReceived = projectedQuantities.get(line.id) ?? (line.data().quantityReceived || 0);
      return projectedReceived > 0;
    });

    for (const plan of receiptPlans) {
      const { receipt, line, inv, prevQty } = plan;
      tx.update(line.ref, { quantityReceived: plan.projectedLineQuantity });
      tx.update(inv.ref, { currentQuantity: prevQty + receipt.quantity, updatedAt: Timestamp.now(), updatedBy: actorUid });

      const movRef = db.collection('stockMovements').doc();
      tx.set(movRef, {
        stockItemId: receipt.stockItemId, stockInventoryId: inv.id, office: order.office,
        movementType: 'received-order', quantityChange: receipt.quantity, previousQuantity: prevQty,
        resultingQuantity: prevQty + receipt.quantity, reason: `Received from order ${orderId}`,
        relatedOrderId: orderId, notes: notes || null, actorUid, actorDisplayName: actorName,
        createdAt: Timestamp.now(),
      });
    }

    tx.update(orderRef, {
      status: allDone ? 'received' : anyReceived ? 'partially-received' : order.status,
      updatedAt: Timestamp.now(),
    });

    const receiptRef = db.collection('stockReceipts').doc();
    tx.set(receiptRef, {
      orderId, office: order.office, receivedBy: actorUid, receivedAt: Timestamp.now(),
      deliveryReference: deliveryReference || null, notes: notes || null,
      lines: receiptPlans.map(({ receipt, line, lineData }) => ({
        orderLineItemId: line.id,
        stockItemId: receipt.stockItemId,
        itemName: lineData.itemName,
        unitLabel: lineData.unitLabel,
        quantityReceived: receipt.quantity,
      })),
    });
  });

  return { success: true };
});
