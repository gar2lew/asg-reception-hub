export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  office?: string;
  summary: string;
  timestamp: string;
}
export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'restore';
