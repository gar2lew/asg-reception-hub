import type { QuickLinkGroup } from '../../models';
export interface IQuickLinkGroupRepository {
  getAll(): QuickLinkGroup[];
  getByScope(scope: QuickLinkGroup['scope']): QuickLinkGroup[];
  getById(id: string): QuickLinkGroup | undefined;
  create(data: Partial<QuickLinkGroup> & { name: string }): QuickLinkGroup;
  update(id: string, data: Partial<QuickLinkGroup>): QuickLinkGroup | undefined;
  delete(id: string): void;
}
