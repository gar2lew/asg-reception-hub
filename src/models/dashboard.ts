export interface WidgetConfig {
  widgetKey: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'wide';
  compact: boolean;
}
export interface DashboardPreference {
  userId: string;
  density: 'compact' | 'comfortable';
  defaultLanding: string;
  widgets: WidgetConfig[];
  updatedAt: string;
}
export interface DashboardWidgetDefinition {
  key: string;
  label: string;
  required: boolean;
  defaultSize: WidgetConfig['size'];
  allowedSizes: WidgetConfig['size'][];
  roles: ('admin' | 'receptionist')[];
  offices: ('brisbane' | 'perth' | 'all')[];
  configurable: boolean;
}
export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  { key: 'progress', label: "Today's Progress", required: true, defaultSize: 'medium', allowedSizes: ['medium','wide'], roles: ['admin','receptionist'], offices: ['all'], configurable: false },
  { key: 'priority', label: 'Priority Tasks', required: false, defaultSize: 'medium', allowedSizes: ['small','medium','wide'], roles: ['admin','receptionist'], offices: ['all'], configurable: false },
  { key: 'opening', label: 'Opening Routine', required: false, defaultSize: 'medium', allowedSizes: ['small','medium','wide'], roles: ['receptionist'], offices: ['brisbane','perth','all'], configurable: false },
  { key: 'upcoming', label: 'Upcoming Tasks', required: false, defaultSize: 'medium', allowedSizes: ['small','medium','wide'], roles: ['admin','receptionist'], offices: ['all'], configurable: false },
  { key: 'stock', label: 'Low Stock Alerts', required: false, defaultSize: 'small', allowedSizes: ['small','medium'], roles: ['admin','receptionist'], offices: ['all'], configurable: false },
  { key: 'printing', label: 'Printing Reminders', required: false, defaultSize: 'small', allowedSizes: ['small','medium'], roles: ['admin','receptionist'], offices: ['all'], configurable: false },
  { key: 'quicklinks', label: 'Quick Links', required: false, defaultSize: 'small', allowedSizes: ['small','medium'], roles: ['admin','receptionist'], offices: ['all'], configurable: true },
  { key: 'contacts', label: 'Important Contacts', required: false, defaultSize: 'small', allowedSizes: ['small','medium'], roles: ['admin','receptionist'], offices: ['all'], configurable: false },
  { key: 'announcements', label: 'Announcements', required: true, defaultSize: 'medium', allowedSizes: ['medium','wide'], roles: ['admin','receptionist'], offices: ['all'], configurable: false },
];
export function defaultWidgetConfigs(): WidgetConfig[] {
  return DASHBOARD_WIDGETS.map((w, i) => ({ widgetKey: w.key, enabled: w.required, order: i, size: w.defaultSize, compact: false }));
}
