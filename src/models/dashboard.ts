export interface WidgetConfig {
  widgetKey: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
  compact: boolean;
}
export interface DashboardPreference {
  userId: string;
  density: 'compact' | 'comfortable';
  defaultLanding: string;
  widgets: WidgetConfig[];
  showStockAlerts: boolean;
  showPrintingAlerts: boolean;
  updatedAt: string;
}
export const DASHBOARD_WIDGETS: { key: string; label: string; required: boolean; defaultSize: WidgetConfig['size'] }[] = [
  { key: 'progress', label: "Today's Progress", required: true, defaultSize: 'medium' },
  { key: 'priority', label: 'Priority Tasks', required: false, defaultSize: 'medium' },
  { key: 'opening', label: 'Opening Routine', required: false, defaultSize: 'medium' },
  { key: 'upcoming', label: 'Upcoming Tasks', required: false, defaultSize: 'medium' },
  { key: 'stock', label: 'Low Stock Alerts', required: false, defaultSize: 'small' },
  { key: 'printing', label: 'Printing Reminders', required: false, defaultSize: 'small' },
  { key: 'quicklinks', label: 'Quick Links', required: false, defaultSize: 'small' },
  { key: 'contacts', label: 'Important Contacts', required: false, defaultSize: 'small' },
  { key: 'announcements', label: 'Announcements', required: true, defaultSize: 'medium' },
];
