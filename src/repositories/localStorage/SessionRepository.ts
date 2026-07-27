import type { Session } from '../../models';
import type { ISessionRepository } from '../interfaces/ISessionRepository';
import { getItem, setItem, removeItem } from '../../utils/storage';
const KEY = 'session';
export class SessionRepository implements ISessionRepository {
  get(): Session | null {
    return getItem<Session>(KEY);
  }
  set(session: Session): void {
    setItem(KEY, session);
  }
  clear(): void {
    removeItem(KEY);
  }
}
