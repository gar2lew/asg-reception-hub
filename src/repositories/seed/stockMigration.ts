import type { StockCatalogueItem, StockInventory, StockCategory } from '../../models';
import { StockCatalogueRepository } from '../localStorage/StockCatalogueRepository';
import { StockInventoryRepository } from '../localStorage/StockInventoryRepository';
import { StockCategoryRepository } from '../localStorage/StockCategoryRepository';
import { SupplierRepository } from '../localStorage/SupplierRepository';
import { nowISO } from '../../utils/date';

const LEGACY_ITEMS = [
  { name: "A4 Paper (Ream)", cat: "Paper", qty: 12, min: 5, unit: "reams", supplier: "Officeworks", url: "https://www.officeworks.com.au" },
  { name: "Printer Toner \u2014 Colour", cat: "Toner", qty: 3, min: 2, unit: "cartridges", supplier: "Officeworks", url: "https://www.officeworks.com.au" },
  { name: "Printer Toner \u2014 Black", cat: "Toner", qty: 4, min: 2, unit: "cartridges", supplier: "Officeworks", url: "https://www.officeworks.com.au" },
  { name: "Pens (Box of 12)", cat: "Stationery", qty: 6, min: 3, unit: "boxes", supplier: "Officeworks", url: "https://www.officeworks.com.au" },
  { name: "Notebooks (A5)", cat: "Stationery", qty: 8, min: 5, unit: "each", supplier: "Officeworks", url: "https://www.officeworks.com.au" },
  { name: "A4 Envelopes", cat: "Stationery", qty: 50, min: 20, unit: "each", supplier: "Officeworks", url: "https://www.officeworks.com.au" },
  { name: "Coffee Beans", cat: "Kitchen", qty: 1, min: 2, unit: "bags", supplier: "Local Roaster" },
  { name: "Tea Bags", cat: "Kitchen", qty: 80, min: 50, unit: "each", supplier: "Woolworths" },
  { name: "Dishwashing Liquid", cat: "Cleaning", qty: 2, min: 1, unit: "bottles", supplier: "Woolworths" },
  { name: "Hand Soap Refills", cat: "Cleaning", qty: 4, min: 2, unit: "bottles", supplier: "Woolworths" },
];

export function migrateStockData(): void {
  const catRepo = new StockCategoryRepository();
  const catalogueRepo = new StockCatalogueRepository();
  const invRepo = new StockInventoryRepository();
  const suppRepo = new SupplierRepository();

  // Create categories from legacy data
  const cats = [...new Set(LEGACY_ITEMS.map(i => i.cat))];
  for (const name of cats) {
    const existing = catRepo.getAll().find(c => c.name === name);
    if (!existing) catRepo.create({ name });
  }

  // Create supplier
  const officeworks = suppRepo.getAll().find(s => s.name === 'Officeworks');
  if (!officeworks) {
    suppRepo.create({ name: 'Officeworks', orderUrl: 'https://www.officeworks.com.au', officeScope: ['all'] });
  }
  const localRoaster = suppRepo.getAll().find(s => s.name === 'Local Roaster');
  if (!localRoaster) {
    suppRepo.create({ name: 'Local Roaster', officeScope: ['brisbane'] });
  }

  // Create catalogue items + inventory
  for (const item of LEGACY_ITEMS) {
    const existing = catalogueRepo.getAll().find(c => c.itemName === item.name);
    if (existing) continue;
    const cat = catRepo.getAll().find(c => c.name === item.cat);
    const supp = suppRepo.getAll().find(s => item.supplier && s.name.includes(item.supplier));
    const catId = cat?.id;
    const now = nowISO();
    const catalogue = catalogueRepo.create({
      itemName: item.name,
      unitLabel: item.unit,
      categoryId: catId,
      preferredSupplierId: supp?.id,
      preferredOrderUrl: item.url,
    });
    // Create inventory record
    invRepo.upsert({
      id: crypto.randomUUID(),
      stockItemId: catalogue.id,
      office: 'brisbane',
      currentQuantity: item.qty,
      minimumQuantity: item.min,
      targetQuantity: item.min * 2,
      reorderQuantity: item.min,
      updatedAt: now,
    });
  }
}
