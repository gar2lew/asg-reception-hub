export interface QuickLinkGroup {
  id: string;
  name: string;
  scope: 'personal' | 'organisation';
  office?: string;
  ownerUid?: string;
  order: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
