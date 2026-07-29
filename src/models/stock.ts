export interface StockCatalogueItem {
  id: string;
  itemName: string;
  description?: string;
  categoryId?: string;
  unitLabel: string;
  preferredSupplierId?: string;
  preferredOrderUrl?: string;
  storageLocation?: string;
  notes?: string;
  iconKey?: string;
  active: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  archivedAt?: string;
  archivedBy?: string;
}
export interface StockInventory {
  id: string;
  stockItemId: string;
  office: 'brisbane' | 'perth' | 'all';
  currentQuantity: number;
  minimumQuantity: number;
  targetQuantity?: number;
  reorderQuantity?: number;
  lastCountedAt?: string;
  updatedAt: string;
  updatedBy?: string;
}
export function isLowStock(inv: StockInventory): boolean {
  return inv.currentQuantity <= inv.minimumQuantity;
}
export function isOutOfStock(inv: StockInventory): boolean {
  return inv.currentQuantity <= 0;
}
export interface StockItem {
  id: string;
  name: string;
  category: string;
  currentQuantity: number;
  minimumQuantity: number;
  unit: string;
  supplier?: string;
  orderUrl?: string;
  lastOrderedDate?: string;
  lastOrderedQuantity?: number;
  notes?: string;
  updatedBy?: string;
  updatedAt: string;
}
export interface StockOrder { quantity: number; date: string; orderedBy: string; }
export interface StockUpdate { currentQuantity: number; notes?: string; updatedBy?: string; }
export function stockStatus(inv: StockInventory): 'out' | 'low' | 'healthy' | 'over' {
  if (inv.currentQuantity <= 0) return 'out';
  if (inv.currentQuantity <= inv.minimumQuantity) return 'low';
  if (inv.targetQuantity && inv.currentQuantity > inv.targetQuantity) return 'over';
  return 'healthy';
}

