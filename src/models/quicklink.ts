export interface QuickLink {
  id: string;
  title: string;
  url: string;
  group: 'daily_systems' | 'communication' | 'documents' | 'ordering' | 'staff_resources';
  order: number;
  updatedAt: string;
}
export const QUICK_LINK_GROUP_LABELS: Record<QuickLink['group'], string> = {
  daily_systems: 'Daily Systems',
  communication: 'Communication',
  documents: 'Documents',
  ordering: 'Ordering',
  staff_resources: 'Staff Resources',
};
