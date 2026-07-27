export type StaffRole = 'admin' | 'receptionist';
export interface Staff {
  id: string;
  name: string;
  pinHash: string;
  role: StaffRole;
  location?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export interface StaffCreate {
  name: string;
  pin: string;
  role: StaffRole;
  location?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  notes?: string;
}
