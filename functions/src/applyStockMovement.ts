import { adminAuth, adminDb } from './admin.js';
import { Timestamp } from 'firebase-admin/firestore';
import * as https from 'firebase-functions/v2/https';

const ALLOWED_TYPES = ['manual-adjustment', 'stocktake-adjustment', 'consumed', 'damaged', 'correction'] as const;
const VALID_OFFICES = new Set(['brisbane', 'perth']);
const VALID_ROLES = new Set(['administrator', 'reception']);

export const applyStockMovement = https.onCall({
  region: 'australia-southeast1',
  minInstances: 0,
  maxInstances: 5,
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new https.HttpsError('unauthenticated', 'Authentication required.');
  if (!request.data || typeof request.data !== 'object' || Array.isArray(request.data)) {
    throw new https.HttpsError('invalid-argument', 'Invalid request data.');
  }

  const { stockItemId, stockInventoryId, movementType, quantity, observedQuantity, reason, notes, overrideRequest } = request.data as any;

  // === Server-derived identity ===
  const auth = adminAuth;
  const user = await auth.getUser(request.auth.uid);
  const claims = user.customClaims || {};
  const actorUid = request.auth.uid;
  const actorDisplayName = user.displayName || claims.accountKey || 'Unknown';
  const role = typeof claims.role === 'string' ? claims.role : undefined;
  const actorOffice = typeof claims.office === 'string' ? claims.office : undefined;
  if (!role || !VALID_ROLES.has(role)) {
    throw new https.HttpsError('permission-denied', 'A valid role claim is required.');
  }
  const isAdmin = role === 'administrator';
  if (!isAdmin && (!actorOffice || !VALID_OFFICES.has(actorOffice))) {
    throw new https.HttpsError('permission-denied', 'A valid office claim is required.');
  }

  if (!stockItemId || !stockInventoryId || !movementType) {
    throw new https.HttpsError('invalid-argument', 'Missing required fields.');
  }
  if (!ALLOWED_TYPES.includes(movementType)) {
    throw new https.HttpsError('invalid-argument', 'Invalid movement type.');
  }

  const db = adminDb;

  // === Load catalogue item ===
  const itemSnap = await db.collection('stockItems').doc(stockItemId).get();
  if (!itemSnap.exists) throw new https.HttpsError('not-found', 'Stock item not found.');
  const item = itemSnap.data()!;
  if (item.active === false) throw new https.HttpsError('failed-precondition', 'Stock item is inactive.');

  // === Inventory transaction ===
  const invRef = db.collection('stockInventory').doc(stockInventoryId);
  if (!reason?.trim()) throw new https.HttpsError('invalid-argument', 'A reason is required.');

  const resultingQty = await db.runTransaction(async (tx) => {
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists) throw new https.HttpsError('not-found', 'Inventory record not found.');
    const inv = invSnap.data()!;
    if (inv.stockItemId !== stockItemId) throw new https.HttpsError('failed-precondition', 'Inventory does not match item.');
    if (!VALID_OFFICES.has(inv.office)) throw new https.HttpsError('failed-precondition', 'Inventory has an invalid office.');
    if (!isAdmin && inv.office !== actorOffice) throw new https.HttpsError('permission-denied', 'Office mismatch.');
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
      if (movementType === 'consumed' || movementType === 'damaged') change = -qty;
      else if (movementType === 'manual-adjustment') change = qty;
    }
    if (change === 0) throw new https.HttpsError('invalid-argument', 'Quantity change must be non-zero.');

    const prevQty = inv.currentQuantity;
    const nextQty = prevQty + change;
    if (nextQty < 0 && !isAdmin) {
      throw new https.HttpsError('permission-denied', 'Resulting quantity would be negative. Administrator override required.');
    }
    if (nextQty < 0 && isAdmin && (!overrideRequest || !reason.trim())) {
      throw new https.HttpsError('invalid-argument', 'Administrator override requires a reason.');
    }

    tx.update(invRef, { currentQuantity: nextQty, updatedAt: Timestamp.now(), updatedBy: actorUid });
    const movRef = db.collection('stockMovements').doc();
    tx.set(movRef, {
      stockItemId, stockInventoryId, office: inv.office,
      movementType, quantityChange: change, previousQuantity: prevQty,
      resultingQuantity: nextQty, reason: reason.trim(), notes: notes || null,
      actorUid, actorDisplayName, createdAt: Timestamp.now(),
      overrideApplied: nextQty < 0,
    });
    return nextQty;
  });

  return { success: true, resultingQuantity: resultingQty, movementType };
});
