import type { Contact } from '../../models';
export interface IContactRepository {
  getAll(): Contact[];
  getByCategory(category: Contact['category']): Contact[];
  update(id: string, data: Partial<Contact>): Contact | undefined;
  create(data: Contact): Contact;
  delete(id: string): void;
  seed(data: Contact[]): void;
}
