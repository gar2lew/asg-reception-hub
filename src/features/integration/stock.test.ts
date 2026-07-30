import { describe, it, expect, beforeEach } from "vitest";
import { StockCatalogueRepository } from "../../repositories/localStorage/StockCatalogueRepository";
import { StockInventoryRepository } from "../../repositories/localStorage/StockInventoryRepository";
import { StockCategoryRepository } from "../../repositories/localStorage/StockCategoryRepository";
import { SupplierRepository } from "../../repositories/localStorage/SupplierRepository";

beforeEach(() => { localStorage.clear(); });

describe("Stock Catalogue", () => {
  it("should create an item", () => {
    const r = new StockCatalogueRepository(); const c = r.create({ itemName: "Paper", unitLabel: "reams" });
    expect(c.id).toBeTruthy(); expect(c.itemName).toBe("Paper"); expect(c.active).toBe(true);
  });
  it("should update", () => {
    const r = new StockCatalogueRepository(); const c = r.create({ itemName: "P", unitLabel: "u" });
    r.update(c.id, { itemName: "Paper" }); expect(r.getById(c.id)?.itemName).toBe("Paper");
  });
  it("should archive", () => {
    const r = new StockCatalogueRepository(); const c = r.create({ itemName: "T", unitLabel: "u" });
    r.archive(c.id, "admin"); expect(r.getById(c.id)?.active).toBe(false);
  });
  it("should seed without duplicates", () => {
    const r = new StockCatalogueRepository();
    r.seed([{ id: "s1", itemName: "A", unitLabel: "u", active: true, createdAt: "", updatedAt: "" }]);
    r.seed([{ id: "s2", itemName: "B", unitLabel: "u", active: true, createdAt: "", updatedAt: "" }]);
    expect(r.getAll().length).toBe(1);
  });
});

describe("Stock Inventory", () => {
  it("should upsert", () => {
    const r = new StockInventoryRepository();
    r.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 10, minimumQuantity: 5, updatedAt: "" });
    expect(r.getByItem("s1").length).toBe(1);
  });
  it("should scope by office", () => {
    const r = new StockInventoryRepository();
    r.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 10, minimumQuantity: 5, updatedAt: "" });
    r.upsert({ id: "i2", stockItemId: "s2", office: "perth", currentQuantity: 5, minimumQuantity: 3, updatedAt: "" });
    expect(r.getByOffice("brisbane").length).toBe(1);
    expect(r.getByOffice("perth").length).toBe(1);
  });
  it("should replace on duplicate upsert", () => {
    const r = new StockInventoryRepository();
    r.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 5, minimumQuantity: 2, updatedAt: "" });
    r.upsert({ id: "i1", stockItemId: "s1", office: "brisbane", currentQuantity: 8, minimumQuantity: 2, updatedAt: "" });
    expect(r.getAll().length).toBe(1); expect(r.getByItem("s1")[0].currentQuantity).toBe(8);
  });
});

describe("Categories", () => {
  it("should create and archive", () => {
    const r = new StockCategoryRepository(); const c = r.create({ name: "Paper" });
    expect(c.name).toBe("Paper"); r.archive(c.id);
    expect(r.getAll().find(x => x.id === c.id)?.archived).toBe(true);
  });
});

describe("Suppliers", () => {
  it("should create and archive", () => {
    const r = new SupplierRepository(); const s = r.create({ name: "Test" });
    expect(s.name).toBe("Test"); expect(s.active).toBe(true);
    r.archive(s.id); expect(r.getById(s.id)?.active).toBe(false);
  });
});

describe("Stock Status", () => {
  const st = (i: any) => { if (i.currentQuantity <= 0) return "out"; if (i.currentQuantity <= i.minimumQuantity) return "low"; if (i.targetQuantity && i.currentQuantity > i.targetQuantity) return "over"; return "healthy"; };
  it("healthy", () => expect(st({ currentQuantity: 10, minimumQuantity: 5 })).toBe("healthy"));
  it("low", () => expect(st({ currentQuantity: 5, minimumQuantity: 5 })).toBe("low"));
  it("out zero", () => expect(st({ currentQuantity: 0, minimumQuantity: 5 })).toBe("out"));
  it("out negative", () => expect(st({ currentQuantity: -1, minimumQuantity: 5 })).toBe("out"));
  it("over target", () => expect(st({ currentQuantity: 20, minimumQuantity: 5, targetQuantity: 15 })).toBe("over"));
});
