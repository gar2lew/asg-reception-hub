export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  orderUrl?: string;
  accountReference?: string;
  notes?: string;
  officeScope: ('brisbane' | 'perth' | 'all')[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}
