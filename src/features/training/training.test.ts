import { describe, it, expect, beforeEach } from 'vitest';
import { TrainingRepository } from '../../repositories/localStorage/TrainingRepository';
import { TrainingAssignmentRepository } from '../../repositories/localStorage/TrainingAssignmentRepository';
beforeEach(() => { localStorage.clear(); });
describe('Training', () => {
  it('should create training', () => {
    const repo = new TrainingRepository();
    const t = repo.create({ title: 'Test Training', category: 'onboarding', summary: 'Summary', content: 'Content', steps: ['Step 1'], estimatedMinutes: 10 });
    expect(t.id).toBeTruthy();
    expect(t.active).toBe(true);
  });
  it('should complete training', () => {
    const repo = new TrainingRepository();
    const t = repo.create({ title: 'Training', category: 'procedures', summary: 'S', content: 'C', steps: [], estimatedMinutes: 5, assignedStaffIds: ['s1'] });
    const assignRepo = new TrainingAssignmentRepository();
    assignRepo.upsert({ id: 'assign-1', trainingId: t.id, staffId: 's1', completed: true, acknowledgedAt: '2025-01-01T00:00:00Z', createdAt: '', updatedAt: '2025-01-01T00:00:00Z' });
    const assignments = assignRepo.getByStaff('s1');
    expect(assignments[0].completed).toBe(true);
  });
});
