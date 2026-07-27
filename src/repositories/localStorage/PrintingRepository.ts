import type { PrintResource } from '../../models';
import type { IPrintingRepository } from '../interfaces/IPrintingRepository';
import { getItem, setItem } from '../../utils/storage';
import { nowISO } from '../../utils/date';
const KEY = 'printing';
export class PrintingRepository implements IPrintingRepository {
  getAll(): PrintResource[] {
    return getItem<PrintResource[]>(KEY) ?? [];
  }
  getById(id: string): PrintResource | undefined {
    return this.getAll().find(p => p.id === id);
  }
  recordPrintRun(id: string, quantity: number, printedBy: string): PrintResource | undefined {
    const all = this.getAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    all[idx] = {
      ...all[idx],
      lastPrintedDate: nowISO().split('T')[0],
      quantityLastPrinted: quantity,
      printedBy,
      estimatedQuantity: quantity,
      updatedAt: nowISO(),
    };
    setItem(KEY, all);
    return all[idx];
  }
  update(id: string, data: Partial<PrintResource>): PrintResource | undefined {
    const all = this.getAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...data, updatedAt: nowISO() };
    setItem(KEY, all);
    return all[idx];
  }
  seed(data: PrintResource[]): void {
    const existing = getItem<PrintResource[]>(KEY);
    if (existing && existing.length > 0) return;
    setItem(KEY, data);
  }
}
