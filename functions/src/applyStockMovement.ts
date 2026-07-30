import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';

const ALLOWED_TYPES = ['manual-adjustment', 'stocktake-adjustment', 'consumed', 'damaged', 'correction'] as const;

export const applyStockMovement = https.onCall({
  region: 'australia-southeast1',
  minInstances: 0,
  maxInstances: 5,
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Authentication required.');

  const { stockItemId, stockInventoryId, movementType, quantity, observedQuantity, reason, notes, overrideRequest } = request.data as any;

  // === Server-derived identity ===
  const auth = getAuth();
  const user = await auth.getUser(request.auth.uid);
  const claims = user.customClaims || {};
  const actorUid = request.auth.uid;
  const actorDisplayName = user.displayName || claims.accountKey || 'Unknown';
  const role = claims.role || 'reception';
  const isAdmin = role === 'administrator';

  if (!stockItemId || !stockInventoryId || !movementType) {
    throw new https.HttpsError('invalid-argument', 'Missing required fields.');
  }
  if (!ALLOWED_TYPES.includes(movementType)) {
    throw new https.HttpsError('invalid-argument', 'Invalid movement type.');
  }

  const db = getFirestore();

  // === Load catalogue item ===
  const itemSnap = await db.collection('stockItems').doc(stockItemId).get();
  if (!itemSnap.exists) throw new https.HttpsError('not-found', 'Stock item not found.');
  const item = itemSnap.data()!;
  if (item.active === false) throw new https.HttpsError('failed-precondition', 'Stock item is inactive.');

  // === Load inventory ===
  const invRef = db.collection('stockInventory').doc(stockInventoryId);
  const invSnap = await invRef.get();
  if (!invSnap.exists) throw new https.HttpsError('not-found', 'Inventory record not found.');
  const inv = invSnap.data()!;
  if (inv.stockItemId !== stockItemId) throw new https.HttpsError('failed-precondition', 'Inventory does not match item.');

  // === Validate ===
  if (typeof inv.currentQuantity !== 'number' || isNaN(inv.currentQuantity) || !isFinite(inv.currentQuantity)) {
    throw new https.HttpsError('failed-precondition', 'Current quantity is invalid.');
  }

  let change = 0;
  if (movementType === 'stocktake-adjustment') {
    const observed = typeof observedQuantity === 'number' ? observedQuantity : parseFloat(observedQuantity);
    if (isNaN(observed) || !isFinite(observed)) throw new https.HttpsError('invalid-argument', 'Invalid observed quantity.');
    change = observed - inv.currentQuantity;
    if (change === 0) throw new https.HttpsError('invalid-argument', 'Stocktake variance is zero. No movement needed.');
  } else {
    const qty = typeof quantity === 'number' ? quantity : parseFloat(quantity);
    if (isNaN(qty) || !isFinite(qty) || qty <= 0) throw new https.HttpsError('invalid-argument', 'Quantity must be a positive finite number.');
    if (movementType === 'consumed' || movementType === 'damaged') {
      change = -qty;
    } else if (movementType === 'manual-adjustment') {
      change = qty; // client sends signed value
    }
  }
  if (change === 0) throw new https.HttpsError('invalid-argument', 'Quantity change must be non-zero.');
  if (!reason?.trim()) throw new https.HttpsError('invalid-argument', 'A reason is required.');

  const prevQty = inv.currentQuantity;
  const resultingQty = prevQty + change;

  if (resultingQty < 0 && !isAdmin) {
    throw new https.HttpsError('permission-denied', 'Resulting quantity would be negative. Administrator override required.');
  }
  if (resultingQty < 0 && isAdmin && (!overrideRequest || !reason.trim())) {
    throw new https.HttpsError('invalid-argument', 'Administrator override requires a reason.');
  }

  // === Transaction ===
  await db.runTransaction(async (tx) => {
    tx.update(invRef, { currentQuantity: resultingQty, updatedAt: Timestamp.now(), updatedBy: actorUid });
    const movRef = db.collection('stockMovements').doc();
    tx.set(movRef, {
      stockItemId, stockInventoryId, office: inv.office,
      movementType, quantityChange: change, previousQuantity: prevQty,
      resultingQuantity: resultingQty, reason: reason.trim(), notes: notes || null,
      actorUid, actorDisplayName, createdAt: Timestamp.now(),
      overrideApplied: resultingQty < 0,
    });
  });

  return { success: true, resultingQuantity: resultingQty, movementType };
});
