import type { TaskInstance } from '../models';
import { DailyTaskInstanceRepository } from '../repositories/localStorage/DailyTaskInstanceRepository';
import { TaskDefinitionRepository } from '../repositories/localStorage/TaskDefinitionRepository';
import { businessDateKey, nowISO } from '../utils/date';
const taskRepo = new TaskDefinitionRepository();
const instanceRepo = new DailyTaskInstanceRepository();
export function generateDailyTasks(): { generated: number; date: string } {
  const today = businessDateKey();
  const lastGen = instanceRepo.getLastGeneratedDate();
  if (lastGen === today) return { generated: 0, date: today };
  const activeTasks = taskRepo.getActive();
  const todayDow = new Date().getDay();
  const todayDom = new Date().getDate();
  const instances: TaskInstance[] = [];
  for (const task of activeTasks) {
    let shouldGenerate = false;
    if (task.recurrence === 'daily') shouldGenerate = true;
    else if (task.recurrence === 'weekly' && todayDow === 1) shouldGenerate = true;
    else if (task.recurrence === 'monthly' && todayDom === 1) shouldGenerate = true;
    else if (task.recurrence === 'one_off') shouldGenerate = true;
    if (!shouldGenerate) continue;
    for (const staffId of task.assignedStaffIds) {
      const existing = instanceRepo.getByDateAndStaff(today, staffId);
      if (existing.some(e => e.taskDefinitionId === task.id)) continue;
      instances.push({
        id: crypto.randomUUID(),
        taskDefinitionId: task.id,
        assignedStaffId: staffId,
        businessDate: today,
        status: 'pending',
        createdAt: nowISO(),
        updatedAt: nowISO(),
      });
    }
  }
  if (instances.length > 0) instanceRepo.upsertMany(instances);
  instanceRepo.setLastGeneratedDate(today);
  return { generated: instances.length, date: today };
}
export function regenerateDailyTasks(): { generated: number; date: string } {
  instanceRepo.setLastGeneratedDate(''); // Force regeneration
  return generateDailyTasks();
}
export function clearAllTaskData(): void {
  instanceRepo.setLastGeneratedDate('');
  const all = instanceRepo.getAll();
  all.forEach(t => {
    if (t.status !== 'pending') {
      t.status = 'pending';
      t.note = undefined;
      t.completedAt = undefined;
      t.completedBy = undefined;
      instanceRepo.upsert(t);
    }
  });
}
