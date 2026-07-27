export type TrainingCategory = 'onboarding' | 'systems' | 'procedures' | 'compliance' | 'operations';
export interface Training {
  id: string;
  title: string;
  category: TrainingCategory;
  summary: string;
  content: string;
  steps: string[];
  externalUrl?: string;
  documentUrl?: string;
  estimatedMinutes: number;
  assignedStaffIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface TrainingAssignment {
  id: string;
  trainingId: string;
  staffId: string;
  completed: boolean;
  acknowledgedAt?: string;
  supervisorNotes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface TrainingCreate {
  title: string;
  category: TrainingCategory;
  summary: string;
  content: string;
  steps: string[];
  externalUrl?: string;
  documentUrl?: string;
  estimatedMinutes: number;
  assignedStaffIds?: string[];
}
