export interface AppSetting {
  id: string;
  key: string;
  value: string;
  scope: 'global' | 'office' | 'user';
  office?: string;
  userId?: string;
  description?: string;
  updatedAt: string;
  updatedBy?: string;
}
