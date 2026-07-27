import { Phone, Mail, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { ContactRepository } from '../../repositories/localStorage/ContactRepository';
import styles from './ContactsPage.module.css';
const repo = new ContactRepository();
const categories = ['management', 'accounts', 'technical', 'escalation', 'general'] as const;
const catLabels: Record<string, string> = { management: 'Management', accounts: 'Accounts', technical: 'Technical Support', escalation: 'Emergency / Escalation', general: 'General' };
export function ContactsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Contacts</h1>
      <div className={styles.grid}>
        {categories.map(cat => {
          const items = repo.getByCategory(cat);
          if (items.length === 0) return null;
          return (
            <Card key={cat}>
              <CardHeader><CardTitle><Users size={16} /> {catLabels[cat] || cat}</CardTitle></CardHeader>
              <div className={styles.list}>
                {items.map(c => (
                  <div key={c.id} className={styles.item}>
                    <div className={styles.name}>{c.name}</div>
                    <div className={styles.role}>{c.role}</div>
                    {c.phone && <div className={styles.contact}><Phone size={12} /> {c.phone}</div>}
                    {c.email && <div className={styles.contact}><Mail size={12} /> {c.email}</div>}
                    {c.notes && <div className={styles.notes}>{c.notes}</div>}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
