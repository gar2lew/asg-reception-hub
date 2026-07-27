import { describe, it, expect, beforeEach } from 'vitest';
import { StockRepository } from '../../repositories/localStorage/StockRepository';
import { PrintingRepository } from '../../repositories/localStorage/PrintingRepository';
beforeEach(() => { localStorage.clear(); });
describe('Stock', () => {
  it('should create stock item via seed', () => {
    const repo = new StockRepository();
    repo.seed([{ id: 's1', name: 'Paper', category: 'Paper', currentQuantity: 10, minimumQuantity: 5, unit: 'reams', updatedAt: '' }]);
    const items = repo.getAll();
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('Paper');
  });
  it('should calculate low stock', () => {
    const repo = new StockRepository();
    repo.seed([{ id: 's1', name: 'Toner', category: 'Toner', currentQuantity: 1, minimumQuantity: 2, unit: 'cartridges', updatedAt: '' }]);
    const low = repo.getAll().filter(s => s.currentQuantity <= s.minimumQuantity);
    expect(low.length).toBe(1);
  });
  it('should update stock', () => {
    const repo = new StockRepository();
    repo.seed([{ id: 's1', name: 'Pens', category: 'Stationery', currentQuantity: 5, minimumQuantity: 3, unit: 'boxes', updatedAt: '' }]);
    repo.update('s1', { currentQuantity: 10 });
    expect(repo.getById('s1')?.currentQuantity).toBe(10);
  });
  it('should record order', () => {
    const repo = new StockRepository();
    repo.seed([{ id: 's1', name: 'Paper', category: 'Paper', currentQuantity: 5, minimumQuantity: 3, unit: 'reams', updatedAt: '' }]);
    repo.recordOrder('s1', 20, 'Admin');
    expect(repo.getById('s1')?.lastOrderedQuantity).toBe(20);
  });
});
describe('Printing', () => {
  it('should calculate print reminder', () => {
    const repo = new PrintingRepository();
    repo.seed([{ id: 'p1', name: 'Booklet', estimatedQuantity: 10, preferredMinimum: 20, checkFrequencyDays: 14, updatedAt: '' }]);
    const items = repo.getAll();
    expect(items[0].estimatedQuantity).toBeLessThanOrEqual(items[0].preferredMinimum);
  });
});
