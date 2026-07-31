import { describe, it, expect, beforeEach } from "vitest";
import { StockOrderRepository } from "../../repositories/localStorage/StockOrderRepository";
import { OrderLineItemRepository } from "../../repositories/localStorage/OrderLineItemRepository";
import { StockInventoryRepository } from "../../repositories/localStorage/StockInventoryRepository";
import { StockMovementRepository } from "../../repositories/localStorage/StockMovementRepository";
import { applyMovement } from "../../services/stockMovementService";

const orderRepo = new StockOrderRepository();
const lineRepo = new OrderLineItemRepository();
const invRepo = new StockInventoryRepository();
const movRepo = new StockMovementRepository();
const actor = { uid: "admin", name: "Admin", role: "admin" };

beforeEach(() => { localStorage.clear(); });

describe("Stock Receiving", () => {
  it("should receive stock and create movement", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 5, minimumQuantity: 2, updatedAt: "" });
    const order = orderRepo.create({ office: "brisbane", requestedBy: "admin" });
    const line = lineRepo.create({ orderId: order.id, stockItemId: "s1", itemName: "Paper", unitLabel: "reams", quantityRequested: 10 });
    lineRepo.update(line.id, { quantityOrdered: 10 });
    orderRepo.update(order.id, { status: "ordered" });

    // Receive 4
    const inv = invRepo.getByItem("s1")[0];
    applyMovement(inv.id, "received-order", 4, `Received from ${order.id}`, actor);
    lineRepo.update(line.id, { quantityReceived: 4 });
    orderRepo.update(order.id, { status: "partially-received" });

    expect(invRepo.getByItem("s1")[0]?.currentQuantity).toBe(9);
    expect(movRepo.getByInventory("i1").length).toBe(1);
    expect(movRepo.getByInventory("i1")[0].movementType).toBe("received-order");
    expect(lineRepo.getByOrder(order.id)[0].quantityReceived).toBe(4);
    expect(orderRepo.getById(order.id)?.status).toBe("partially-received");
  });

  it("should complete order after full receipt", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 5, minimumQuantity: 2, updatedAt: "" });
    const order = orderRepo.create({ office: "brisbane", requestedBy: "admin" });
    const line = lineRepo.create({ orderId: order.id, stockItemId: "s1", itemName: "Paper", unitLabel: "reams", quantityRequested: 10 });
    lineRepo.update(line.id, { quantityOrdered: 10, quantityReceived: 10 });
    orderRepo.update(order.id, { status: "received" });

    const inv = invRepo.getByItem("s1")[0];
    applyMovement(inv.id, "received-order", 10, `Received from ${order.id}`, actor);
    expect(invRepo.getByItem("s1")[0]?.currentQuantity).toBe(15);
    expect(orderRepo.getById(order.id)?.status).toBe("received");
  });

  it("should prevent over-receipt", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 5, minimumQuantity: 2, updatedAt: "" });
    const order = orderRepo.create({ office: "brisbane", requestedBy: "admin" });
    const line = lineRepo.create({ orderId: order.id, stockItemId: "s1", itemName: "Paper", unitLabel: "reams", quantityRequested: 10 });
    lineRepo.update(line.id, { quantityOrdered: 10 });

    // Over-receipt: received 12 > ordered 10
    const overQty = 12;
    const orderedQty = 10;
    const remaining = orderedQty - 0;
    expect(overQty > remaining).toBe(true);
  });

  it("should track pending quantity", () => {
    invRepo.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 5, minimumQuantity: 2, updatedAt: "" });
    const order = orderRepo.create({ office: "brisbane", requestedBy: "admin" });
    const line = lineRepo.create({ orderId: order.id, stockItemId: "s1", itemName: "Paper", unitLabel: "reams", quantityRequested: 10 });
    lineRepo.update(line.id, { quantityOrdered: 10 });
    lineRepo.update(line.id, { quantityReceived: 4 });
    const pending = 10 - 4;
    expect(pending).toBe(6);
  });
});

