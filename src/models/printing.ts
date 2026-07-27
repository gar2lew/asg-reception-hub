export interface PrintResource {
  id: string;
  name: string;
  estimatedQuantity: number;
  preferredMinimum: number;
  lastPrintedDate?: string;
  quantityLastPrinted?: number;
  printedBy?: string;
  checkFrequencyDays: number;
  notes?: string;
  updatedAt: string;
}
export interface PrintRun {
  quantity: number;
  date: string;
  printedBy: string;
}
