import type { Staff } from '../../models';
import { simpleHash } from '../../utils/hash';
export const SEED_STAFF: Staff[] = [
  {
    id: 'admin-001',
    name: 'Administrator',
    pinHash: simpleHash('8711'),
    role: 'admin',
    location: 'All',
    email: 'admin@asg.com.au',
    phone: '0400 111 222',
    jobTitle: 'System Administrator',
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'brisbane-001',
    name: 'Brisbane Reception',
    pinHash: simpleHash('1001'),
    role: 'receptionist',
    location: 'Brisbane',
    email: 'brisbane@asg.com.au',
    phone: '0400 222 333',
    jobTitle: 'Brisbane Reception',
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'perth-001',
    name: 'Perth Reception',
    pinHash: simpleHash('1001'),
    role: 'receptionist',
    location: 'Perth',
    email: 'perth@asg.com.au',
    phone: '0400 333 444',
    jobTitle: 'Perth Reception',
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];
/* Credentials:
   Administrator / PIN: 8711
   Brisbane Reception / PIN: 1001
   Perth Reception / PIN: 1001
*/
