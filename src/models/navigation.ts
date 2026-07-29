export interface NavItem {
  id: string;
  routeKey: string;
  routePath: string;
  label: string;
  iconKey: string;
  order: number;
  enabled: boolean;
  systemRequired: boolean;
  allowedRoles: ('admin' | 'receptionist')[];
  allowedOffices: ('brisbane' | 'perth' | 'all')[];
  group: 'main' | 'admin';
  archived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}
export interface NavItemCreate {
  routeKey: string;
  routePath: string;
  label: string;
  iconKey: string;
  order: number;
  enabled?: boolean;
  systemRequired?: boolean;
  allowedRoles?: NavItem['allowedRoles'];
  allowedOffices?: NavItem['allowedOffices'];
  group?: NavItem['group'];
}
