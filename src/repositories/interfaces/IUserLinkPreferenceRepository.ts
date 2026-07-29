import type { UserLinkPreference } from '../../models';
export interface IUserLinkPreferenceRepository {
  getByUser(userId: string): UserLinkPreference[];
  get(linkId: string, userId: string): UserLinkPreference | undefined;
  upsert(pref: UserLinkPreference): void;
  delete(linkId: string, userId: string): void;
}
