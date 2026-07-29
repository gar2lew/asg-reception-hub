export type TaskCategory = 'daily' | 'weekly' | 'monthly' | 'one_off' | 'training' | 'stock_check' | 'printing_check';
export type TaskRecurrence = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'one_off';
export type TaskPriority = 'low' | 'normal' | 'high';
export type TaskScope = 'personal' | 'office' | 'organisation';
export type TaskInstanceStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type TaskCompletionType = 'personal' | 'team';
export interface TaskDefinition {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  recurrence: TaskRecurrence;
  assignedStaffIds: string[];
  required: boolean;
  priority: TaskPriority;
  dueTime?: string;
  instructions?: string;
  relatedTrainingId?: string;
  externalUrl?: string;
  scope: TaskScope;
  ownerUid?: string;
  office?: string;
  completionType: TaskCompletionType;
  archived?: boolean;
  archivedAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface TaskInstance {
  id: string;
  taskDefinitionId: string;
  assignedStaffId: string;
  businessDate: string;
  status: TaskInstanceStatus;
  note?: string;
  completedAt?: string;
  completedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  completionNote?: string;
  createdAt: string;
  updatedAt: string;
}
export interface TaskDefinitionCreate {
  title: string;
  description?: string;
  category: TaskCategory;
  recurrence: TaskRecurrence;
  assignedStaffIds: string[];
  required?: boolean;
  priority?: TaskPriority;
  scope?: TaskScope;
  ownerUid?: string;
  office?: string;
  completionType?: TaskCompletionType;
  dueTime?: string;
  instructions?: string;
  relatedTrainingId?: string;
  externalUrl?: string;
  active?: boolean;
}
