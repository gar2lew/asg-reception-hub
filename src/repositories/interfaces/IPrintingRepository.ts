import type { PrintResource } from '../../models';
export interface IPrintingRepository {
  getAll(): PrintResource[];
  getById(id: string): PrintResource | undefined;
  recordPrintRun(id: string, quantity: number, printedBy: string): PrintResource | undefined;
  update(id: string, data: Partial<PrintResource>): PrintResource | undefined;
  seed(data: PrintResource[]): void;
}
