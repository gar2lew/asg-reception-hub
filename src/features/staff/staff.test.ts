import { describe, it, expect, beforeEach } from 'vitest';
import { StaffRepository } from '../../repositories/localStorage/StaffRepository';
beforeEach(() => { localStorage.clear(); });
describe('Staff', () => {
  it('should create a staff member', () => {
    const repo = new StaffRepository();
    const staff = repo.create({ name: 'New Staff', pin: '9999', role: 'receptionist' });
    expect(staff.id).toBeTruthy();
    expect(staff.name).toBe('New Staff');
    expect(staff.role).toBe('receptionist');
    expect(staff.active).toBe(true);
  });
  it('should find staff by name', () => {
    const repo = new StaffRepository();
    repo.seed([{ id: 's1', name: 'Alice', pinHash: 'abc', role: 'receptionist', active: true, createdAt: '', updatedAt: '' }]);
    const found = repo.getByName('alice');
    expect(found?.name).toBe('Alice');
  });
});
