export type { Staff, StaffCreate, StaffRole } from './staff';
export type {
  TaskDefinition, TaskInstance, TaskDefinitionCreate,
  TaskCategory, TaskRecurrence, TaskPriority, TaskInstanceStatus
} from './task';
export type { Training, TrainingAssignment, TrainingCreate, TrainingCategory } from './training';
export type { StockCatalogueItem, StockInventory, StockItem, StockOrder, StockUpdate } from './stock';
export { stockStatus, isLowStock, isOutOfStock } from './stock';
export type { PrintResource, PrintRun } from './printing';
export type { Contact } from './contact';
export type { QuickLink } from './quicklink';
export type { StockCategory } from './stockCategory';
export type { Supplier } from './supplier';
export type { StockMovement, MovementType } from './stockMovement';
export { QUICK_LINK_GROUP_LABELS } from './quicklink';
export type { Announcement } from './announcement';
export type { Session } from './session';
export type { NavItem, NavItemCreate } from './navigation';
export type { AppSetting } from './setting';
export type { AuditEvent, AuditAction } from './audit';
export type { LinkScope, LinkOpenBehaviour } from './quicklink';
export type { QuickLinkGroup } from './quickLinkGroup';
export type { UserLinkPreference } from './userLinkPreference';
export type { UserTask, UserTaskRecurrence } from './userTask';
export type { TaskCompletion } from './taskCompletion';
export type { DashboardPreference, WidgetConfig, DashboardWidgetDefinition } from './dashboard';
export { DASHBOARD_WIDGETS, defaultWidgetConfigs } from './dashboard';




