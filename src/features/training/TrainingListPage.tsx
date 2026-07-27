import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { getSession } from '../../services/authService';
import { TrainingRepository } from '../../repositories/localStorage/TrainingRepository';
import { TrainingAssignmentRepository } from '../../repositories/localStorage/TrainingAssignmentRepository';
import styles from './TrainingListPage.module.css';
const trainingRepo = new TrainingRepository();
const assignmentRepo = new TrainingAssignmentRepository();
const categoryLabels: Record<string, string> = { onboarding: 'Onboarding', systems: 'Systems', procedures: 'Procedures', compliance: 'Compliance', operations: 'Operations' };
export function TrainingListPage() {
  const session = getSession();
  const navigate = useNavigate();
  const allTraining = trainingRepo.getActive();
  const staffId = session?.staffId || '';
  const assignments = assignmentRepo.getByStaff(staffId);
  const completedIds = new Set(assignments.filter(a => a.completed).map(a => a.trainingId));
  const groups: Record<string, typeof allTraining> = {};
  for (const t of allTraining) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Training Centre</h1>
      {Object.entries(groups).map(([cat, items]) => (
        <Card key={cat} className={styles.section}>
          <CardHeader><CardTitle>{categoryLabels[cat] || cat}</CardTitle></CardHeader>
          <div className={styles.list}>
            {items.map(t => {
              const done = completedIds.has(t.id);
              return (
                <button key={t.id} className={styles.item} onClick={() => navigate(`/training/${t.id}`)}>
                  <BookOpen size={18} className={styles.itemIcon} />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{t.title}</span>
                    <span className={styles.itemSummary}>{t.summary}</span>
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.duration}><Clock size={12} /> {t.estimatedMinutes} min</span>
                    {done ? <Badge variant="success">Complete</Badge> : <Badge variant="warning">Pending</Badge>}
                  </div>
                  <ArrowRight size={16} className={styles.arrow} />
                </button>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
