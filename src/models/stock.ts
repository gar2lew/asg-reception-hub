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
export interface StockOrder {
  quantity: number;
  date: string;
  orderedBy: string;
}
export interface StockUpdate {
  currentQuantity: number;
  notes?: string;
  updatedBy?: string;
}
