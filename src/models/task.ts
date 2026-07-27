export type TaskCategory = 'daily' | 'weekly' | 'monthly' | 'one_off' | 'training' | 'stock_check' | 'printing_check';
export type TaskRecurrence = 'daily' | 'weekly' | 'monthly' | 'one_off';
export type TaskPriority = 'low' | 'normal' | 'high';
export type TaskInstanceStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
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
  dueTime?: string;
  instructions?: string;
  relatedTrainingId?: string;
  externalUrl?: string;
  active?: boolean;
}
