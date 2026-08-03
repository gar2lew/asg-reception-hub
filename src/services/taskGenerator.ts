import type { TaskInstance } from '../models';
import { DailyTaskInstanceRepository } from '../repositories/localStorage/DailyTaskInstanceRepository';
import { TaskDefinitionRepository } from '../repositories/localStorage/TaskDefinitionRepository';
import { FirebaseDailyTaskInstanceRepository } from '../repositories/firebase/FirebaseDailyTaskInstanceRepository';
import { FirebaseTaskDefinitionRepository } from '../repositories/firebase/FirebaseTaskDefinitionRepository';
import { getProvider } from '../firebase/config';
import { businessDateKey, nowISO } from '../utils/date';

function getTaskRepos() {
  if (getProvider() === 'firebase') {
    return {
      taskRepo: new FirebaseTaskDefinitionRepository(),
      instanceRepo: new FirebaseDailyTaskInstanceRepository(),
    };
  }
  return {
    taskRepo: new TaskDefinitionRepository(),
    instanceRepo: new DailyTaskInstanceRepository(),
  };
}

export async function generateDailyTasks(): Promise<{ generated: number; date: string }> {
  const { taskRepo, instanceRepo } = getTaskRepos();
  const today = businessDateKey();
  const lastGen = await instanceRepo.getLastGeneratedDate();
  if (lastGen === today) return { generated: 0, date: today };
  const activeTasks = await taskRepo.getActive();
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
      const existing = await instanceRepo.getByDateAndStaff(today, staffId);
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
  if (instances.length > 0) await instanceRepo.upsertMany(instances);
  await instanceRepo.setLastGeneratedDate(today);
  return { generated: instances.length, date: today };
}
export async function regenerateDailyTasks(): Promise<{ generated: number; date: string }> {
  const { instanceRepo } = getTaskRepos();
  await instanceRepo.setLastGeneratedDate('');
  return generateDailyTasks();
}
export async function clearAllTaskData(): Promise<void> {
  const { instanceRepo } = getTaskRepos();
  await instanceRepo.setLastGeneratedDate('');
  const all = await instanceRepo.getAll();
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
