import { ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { QuickLinkRepository } from '../../repositories/localStorage/QuickLinkRepository';
import { QUICK_LINK_GROUP_LABELS } from '../../models';
import styles from './QuickLinksPage.module.css';
const repo = new QuickLinkRepository();
const groups = ['daily_systems', 'communication', 'documents', 'ordering', 'staff_resources'] as const;
export function QuickLinksPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Quick Links</h1>
      <div className={styles.grid}>
        {groups.map(g => {
          const links = repo.getByGroup(g);
          if (links.length === 0) return null;
          return (
            <Card key={g}>
              <CardHeader><CardTitle>{QUICK_LINK_GROUP_LABELS[g]}</CardTitle></CardHeader>
              <div className={styles.list}>
                {links.map(l => (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    <span className={styles.linkTitle}>{l.title}</span>
                    <ExternalLink size={14} className={styles.linkIcon} />
                  </a>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
