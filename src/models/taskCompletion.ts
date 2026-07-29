export interface TaskCompletion {
  id: string;
  taskDefinitionId: string;
  userId: string;
  completedAt: string;
  completedBy: string;
  completionNote?: string;
  reopenedAt?: string;
  reopenedBy?: string;
}
