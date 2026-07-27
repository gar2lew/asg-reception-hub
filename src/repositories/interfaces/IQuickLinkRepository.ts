import type { QuickLink } from '../../models';
export interface IQuickLinkRepository {
  getAll(): QuickLink[];
  getByGroup(group: QuickLink['group']): QuickLink[];
  update(id: string, data: Partial<QuickLink>): QuickLink | undefined;
  create(data: QuickLink): QuickLink;
  delete(id: string): void;
  seed(data: QuickLink[]): void;
}
