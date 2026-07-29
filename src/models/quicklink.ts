export type LinkScope = 'personal' | 'office' | 'organisation';
export type LinkOpenBehaviour = 'same-tab' | 'new-tab';
export interface QuickLink {
  id: string;
  title: string;
  description?: string;
  url: string;
  category?: string;
  group: string;
  iconKey?: string;
  scope: LinkScope;
  office?: string;
  ownerUid: string;
  openBehaviour: LinkOpenBehaviour;
  pinned: boolean;
  order: number;
  enabled: boolean;
  archived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export const QUICK_LINK_GROUP_LABELS: Record<string, string> = {
  daily_systems: 'Daily Systems',
  communication: 'Communication',
  documents: 'Documents',
  ordering: 'Ordering',
  staff_resources: 'Staff Resources',
};
