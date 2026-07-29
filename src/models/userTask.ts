export type UserTaskRecurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export interface UserTask {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  priority: 'low' | 'normal' | 'high';
  dueDate?: string;
  dueTime?: string;
  order: number;
  recurrence: UserTaskRecurrence;
  scope: 'personal';
  ownerUid: string;
  completed: boolean;
  completedAt?: string;
  archived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
