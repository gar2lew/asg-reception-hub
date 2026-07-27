import type { Session } from '../../models';
export interface ISessionRepository {
  get(): Session | null;
  set(session: Session): void;
  clear(): void;
}
