import type { Announcement } from '../../models';
export interface IAnnouncementRepository {
  getAll(): Announcement[];
  getActive(): Announcement[];
  create(data: Announcement): Announcement;
  update(id: string, data: Partial<Announcement>): Announcement | undefined;
  delete(id: string): void;
}
