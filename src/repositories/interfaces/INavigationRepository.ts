import type { NavItem, NavItemCreate } from '../../models';
export interface INavigationRepository {
  getAll(): NavItem[];
  getVisible(role: string, office: string): NavItem[];
  getByGroup(group: NavItem['group']): NavItem[];
  getById(id: string): NavItem | undefined;
  create(data: NavItemCreate): NavItem;
  update(id: string, data: Partial<NavItem>): NavItem | undefined;
  delete(id: string): void;
  archive(id: string, archivedBy: string): NavItem | undefined;
  restore(id: string): NavItem | undefined;
  seed(data: NavItem[]): void;
}
