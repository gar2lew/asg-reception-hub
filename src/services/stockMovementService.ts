import type { StockInventory, StockMovement, MovementType, StockCatalogueItem } from '../models';
import { StockInventoryRepository } from '../repositories/localStorage/StockInventoryRepository';
import { StockCatalogueRepository } from '../repositories/localStorage/StockCatalogueRepository';
import { StockMovementRepository } from '../repositories/localStorage/StockMovementRepository';
import { nowISO } from '../utils/date';

const invRepo = new StockInventoryRepository();
const catRepo = new StockCatalogueRepository();
const movRepo = new StockMovementRepository();

export interface MovementResult { success: boolean; error?: string; movement?: StockMovement; resultingQuantity?: number; }

function validate(inv: StockInventory, change: number, type: MovementType, reason: string, isAdmin: boolean): string | null {
  if (!inv) return "Inventory record not found.";
  if (typeof change !== "number" || isNaN(change) || !isFinite(change)) return "Quantity must be a valid finite number.";
  if (change === 0) return "Quantity change must be non-zero.";
  if (inv.currentQuantity === undefined || isNaN(inv.currentQuantity) || !isFinite(inv.currentQuantity)) return "Current inventory quantity is invalid. Please set initial quantity first.";
  if (!reason?.trim()) return "A reason is required.";
  const resultingQty = inv.currentQuantity + change;
  if (resultingQty < 0 && !isAdmin) return "Resulting quantity would be negative. Administrator override required.";
  if (resultingQty < 0 && isAdmin && !reason.trim()) return "A reason is required for negative stock override.";
  return null;
}

export function applyMovement(invId: string, type: MovementType, change: number, reason: string, actor: { uid: string; name: string; role: string }, notes?: string, override?: string): MovementResult {
  const inv = invRepo.getAll().find(i => i.id === invId);
  if (!inv) return { success: false, error: "Inventory record not found." };
  const isAdmin = actor.role === "admin";
  const err = validate(inv, change, type, reason, isAdmin);
  if (err) return { success: false, error: err };
  const resultingQty = inv.currentQuantity + change;
  inv.currentQuantity = resultingQty;
  inv.updatedAt = nowISO();
  invRepo.upsert(inv);
  const movement: StockMovement = {
    id: crypto.randomUUID(), stockItemId: inv.stockItemId, stockInventoryId: inv.id,
    office: inv.office, movementType: type, quantityChange: change,
    previousQuantity: inv.currentQuantity - change, resultingQuantity: resultingQty,
    reason: reason.trim(), notes: notes || undefined,
    actorUid: actor.uid, actorDisplayName: actor.name, createdAt: nowISO(),
    overrideApplied: !!override, overrideReason: override || undefined,
  };
  movRepo.add(movement);
  return { success: true, movement, resultingQuantity: resultingQty };
}

export function stocktakeAdjustment(invId: string, observedQty: number, reason: string, actor: { uid: string; name: string; role: string }): MovementResult {
  const inv = invRepo.getAll().find(i => i.id === invId);
  if (!inv) return { success: false, error: "Inventory record not found." };
  const variance = observedQty - inv.currentQuantity;
  if (variance === 0) return { success: true, movement: undefined, resultingQuantity: inv.currentQuantity };
  return applyMovement(invId, "stocktake-adjustment", variance, reason, actor);
}
