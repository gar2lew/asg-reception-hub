import type { Contact } from '../../models';
export const SEED_CONTACTS: Contact[] = [
  { id: 'contact-001', name: 'Sarah Chen', role: 'Office Manager', category: 'management', email: 'sarah.chen@asg.com.au', phone: '0400 111 222', notes: 'First point of contact for reception questions', order: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: 'contact-002', name: 'Michael Tran', role: 'Operations Director', category: 'management', email: 'michael.tran@asg.com.au', phone: '0400 333 444', notes: 'Escalation for operational issues', order: 2, updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: 'contact-003', name: 'Accounts Team', role: 'Accounts Payable', category: 'accounts', email: 'accounts@asg.com.au', phone: '0400 555 666', notes: 'For invoicing and accounts queries', order: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: 'contact-004', name: 'IT Helpdesk', role: 'Technical Support', category: 'technical', email: 'it-support@asg.com.au', phone: '0400 777 888', notes: 'For system access, printer issues, and IT problems', order: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: 'contact-005', name: 'James Wilson', role: 'IT Manager', category: 'technical', email: 'james.wilson@asg.com.au', phone: '0400 888 999', notes: 'Escalation for unresolved IT issues', order: 2, updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: 'contact-006', name: 'Emergency — Building Security', role: 'Security Desk', category: 'escalation', phone: '07 3000 0001', notes: 'For building emergencies, after-hours access, security incidents', order: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: 'contact-007', name: 'Emergency — Police / Fire / Ambulance', role: 'Emergency Services', category: 'escalation', phone: '000', notes: 'For life-threatening emergencies only', order: 2, updatedAt: '2025-01-01T00:00:00.000Z' },
];
