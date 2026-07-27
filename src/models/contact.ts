export interface Contact {
  id: string;
  name: string;
  role: string;
  category: 'management' | 'accounts' | 'technical' | 'escalation' | 'general';
  email?: string;
  phone?: string;
  notes?: string;
  order: number;
  updatedAt: string;
}
