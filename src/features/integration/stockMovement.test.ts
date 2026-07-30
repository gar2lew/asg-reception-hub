import { describe, it, expect, beforeEach } from "vitest";
import { applyMovement, stocktakeAdjustment } from "../../services/stockMovementService";
import { StockInventoryRepository } from "../../repositories/localStorage/StockInventoryRepository";
import { StockMovementRepository } from "../../repositories/localStorage/StockMovementRepository";
import { nowISO } from "../../utils/date";

const invRepo = new StockInventoryRepository();
const movRepo = new StockMovementRepository();
const actor = { uid: "test", name: "Test User", role: "admin" };
const actRec = { uid: "rec", name: "Reception", role: "receptionist" };

beforeEach(() => { localStorage.clear(); });

describe("applyMovement", () => {
  it("should return error for missing inventory", () => {
    const r = applyMovement("nonexistent", "consumed", -5, "test", actor);
    expect(r.success).toBe(false); expect(r.error).toContain("not found");
  });
  it("should return error for zero change", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 10, minimumQuantity: 5, updatedAt: nowISO() });
    const r = applyMovement("i1", "consumed", 0, "test", actor);
    expect(r.success).toBe(false); expect(r.error).toContain("non-zero");
  });
  it("should return error for NaN", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 10, minimumQuantity: 5, updatedAt: nowISO() });
    const r = applyMovement("i1", "consumed", NaN, "test", actor);
    expect(r.success).toBe(false); expect(r.error).toContain("valid finite");
  });
  it("should apply valid movement", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 10, minimumQuantity: 5, updatedAt: nowISO() });
    const r = applyMovement("i1", "consumed", -3, "Used for printing", actor);
    expect(r.success).toBe(true); expect(r.resultingQuantity).toBe(7);
    expect(invRepo.getByItem("s1")[0].currentQuantity).toBe(7);
    expect(movRepo.getByInventory("i1").length).toBe(1);
  });
  it("should block negative stock for reception", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 2, minimumQuantity: 5, updatedAt: nowISO() });
    const r = applyMovement("i1", "consumed", -5, "Test", actRec);
    expect(r.success).toBe(false); expect(r.error).toContain("negative");
  });
  it("should allow negative stock for admin with reason", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 2, minimumQuantity: 5, updatedAt: nowISO() });
    const r = applyMovement("i1", "manual-adjustment", -5, "Admin override needed", actor);
    expect(r.success).toBe(true); expect(r.resultingQuantity).toBe(-3);
  });
});

describe("stocktakeAdjustment", () => {
  it("should return success for zero variance (no movement)", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 10, minimumQuantity: 5, updatedAt: nowISO() });
    const r = stocktakeAdjustment("i1", 10, "Counted", actor);
    expect(r.success).toBe(true); expect(r.movement).toBeUndefined(); expect(r.resultingQuantity).toBe(10);
  });
  it("should apply stocktake correction", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 12, minimumQuantity: 5, updatedAt: nowISO() });
    const r = stocktakeAdjustment("i1", 9, "Found 9 on shelf", actor);
    expect(r.success).toBe(true); expect(r.resultingQuantity).toBe(9);
    expect(movRepo.getByInventory("i1").length).toBe(1);
    expect(movRepo.getByInventory("i1")[0].movementType).toBe("stocktake-adjustment");
  });
});
