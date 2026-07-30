export type MovementType = 'manual-adjustment' | 'stocktake-adjustment' | 'consumed' | 'damaged' | 'transferred-in' | 'transferred-out' | 'received-order' | 'printing-consumption' | 'correction';
export interface StockMovement {
  id: string;
  stockItemId: string;
  stockInventoryId: string;
  office: string;
  movementType: MovementType;
  quantityChange: number;
  previousQuantity: number;
  resultingQuantity: number;
  reason: string;
  notes?: string;
  relatedOrderId?: string;
  relatedReceiptId?: string;
  relatedChecklistId?: string;
  relatedPrintJobId?: string;
  actorUid: string;
  actorDisplayName: string;
  createdAt: string;
  overrideApplied?: boolean;
  overrideReason?: string;
}
