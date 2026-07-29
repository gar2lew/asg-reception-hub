export interface UserLinkPreference {
  linkId: string;
  userId: string;
  pinned: boolean;
  personalLabel?: string;
  personalOrder?: number;
  updatedAt: string;
}
