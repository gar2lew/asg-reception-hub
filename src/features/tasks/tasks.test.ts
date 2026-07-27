import { describe, it, expect, beforeEach } from 'vitest';
import { TaskDefinitionRepository } from '../../repositories/localStorage/TaskDefinitionRepository';
import { DailyTaskInstanceRepository } from '../../repositories/localStorage/DailyTaskInstanceRepository';
beforeEach(() => {
  localStorage.clear();
});
describe('Task System', () => {
  it('should create a task definition', () => {
    const repo = new TaskDefinitionRepository();
    const task = repo.create({
      title: 'Test Task', category: 'daily', recurrence: 'daily',
      assignedStaffIds: ['staff-1'], required: true,
    });
    expect(task.id).toBeTruthy();
    expect(task.title).toBe('Test Task');
    expect(task.active).toBe(true);
  });
  it('should assign a task to staff', () => {
    const repo = new TaskDefinitionRepository();
    const task = repo.create({
      title: 'Assigned Task', category: 'daily', recurrence: 'daily',
      assignedStaffIds: ['staff-1', 'staff-2'], required: true,
    });
    expect(task.assignedStaffIds).toContain('staff-1');
    expect(task.assignedStaffIds).toContain('staff-2');
  });
  it('should not duplicate daily tasks after generation', () => {
    const defRepo = new TaskDefinitionRepository();
    defRepo.create({ title: 'Daily1', category: 'daily', recurrence: 'daily', assignedStaffIds: ['staff-1'], required: true });
    const instanceRepo = new DailyTaskInstanceRepository();
    const date = '2025-01-01';
    const instances = defRepo.getActive().flatMap(t => t.assignedStaffIds.map(staffId => ({
      id: crypto.randomUUID(), taskDefinitionId: t.id, assignedStaffId: staffId,
      businessDate: date, status: 'pending' as const, createdAt: '', updatedAt: '',
    })));
    instanceRepo.upsertMany(instances);
    const loaded = instanceRepo.getByDateAndStaff(date, 'staff-1');
    expect(loaded.length).toBe(1);
  });
  it('should persist task completion', () => {
    const instanceRepo = new DailyTaskInstanceRepository();
    const inst = { id: 'test-1', taskDefinitionId: 't1', assignedStaffId: 's1', businessDate: '2025-01-01', status: 'completed' as const, completedAt: '2025-01-01T12:00:00Z', completedBy: 's1', createdAt: '', updatedAt: '2025-01-01T12:00:00Z' };
    instanceRepo.upsert(inst);
    const loaded = instanceRepo.getById('test-1');
    expect(loaded?.status).toBe('completed');
    expect(loaded?.completedBy).toBe('s1');
  });
  it('should support weekly recurrence', () => {
    const defRepo = new TaskDefinitionRepository();
    const task = defRepo.create({ title: 'Weekly', category: 'weekly', recurrence: 'weekly', assignedStaffIds: ['s1'], required: false });
    expect(task.recurrence).toBe('weekly');
  });
  it('should support monthly recurrence', () => {
    const defRepo = new TaskDefinitionRepository();
    const task = defRepo.create({ title: 'Monthly', category: 'monthly', recurrence: 'monthly', assignedStaffIds: ['s1'], required: false });
    expect(task.recurrence).toBe('monthly');
  });
});
describe('Seed Data', () => {
  it('should not overwrite edited data', () => {
    const repo = new TaskDefinitionRepository();
    repo.seed([{ id: 'existing', title: 'Original', category: 'daily', recurrence: 'daily', assignedStaffIds: [], required: true, priority: 'normal', active: true, createdAt: '', updatedAt: '' }]);
    repo.seed([{ id: 'new', title: 'Should Not Appear', category: 'daily', recurrence: 'daily', assignedStaffIds: [], required: true, priority: 'normal', active: true, createdAt: '', updatedAt: '' }]);
    expect(repo.getById('new')).toBeUndefined();
    expect(repo.getById('existing')?.title).toBe('Original');
  });
});
