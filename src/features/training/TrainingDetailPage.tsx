import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ExternalLink, BookOpen, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { TrainingRepository } from '../../repositories/localStorage/TrainingRepository';
import { TrainingAssignmentRepository } from '../../repositories/localStorage/TrainingAssignmentRepository';
import { getSession } from '../../services/authService';
import { nowISO } from '../../utils/date';
import { formatAustralian } from '../../utils/date';
import { useState } from 'react';
import styles from './TrainingDetailPage.module.css';
const trainingRepo = new TrainingRepository();
const assignmentRepo = new TrainingAssignmentRepository();
export function TrainingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const [, refresh] = useState(0);
  const training = trainingRepo.getById(id || '');
  if (!training) return (
    <div className={styles.page}>
      <Button variant="ghost" onClick={() => navigate('/training')}><ArrowLeft size={16} /> Back to Training Centre</Button>
      <p className={styles.notFound}>Training not found.</p>
    </div>
  );
  const staffId = session?.staffId || '';
  const allAssignments = assignmentRepo.getByTraining(training.id);
  const myAssignment = allAssignments.find(a => a.staffId === staffId);
  const complete = () => {
    if (myAssignment) {
      myAssignment.completed = true;
      myAssignment.acknowledgedAt = nowISO();
      myAssignment.updatedAt = nowISO();
      assignmentRepo.upsert(myAssignment);
    } else {
      assignmentRepo.upsert({ id: crypto.randomUUID(), trainingId: training.id, staffId, completed: true, acknowledgedAt: nowISO(), createdAt: nowISO(), updatedAt: nowISO() });
    }
    refresh(n => n + 1);
  };
  return (
    <div className={styles.page}>
      <Button variant="ghost" onClick={() => navigate('/training')} className={styles.back}>
        <ArrowLeft size={16} /> Back to Training Centre
      </Button>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{training.title}</h1>
          <div className={styles.meta}>
            <Badge>{training.category}</Badge>
            <span className={styles.duration}><Clock size={14} /> {training.estimatedMinutes} minutes</span>
            {myAssignment?.completed && <Badge variant="success">Completed</Badge>}
          </div>
        </div>
      </div>
      <Card>
        <p className={styles.summary}>{training.summary}</p>
      </Card>
      <Card>
        <CardHeader><CardTitle>Content</CardTitle></CardHeader>
        <div className={styles.content}>{training.content}</div>
      </Card>
      {training.steps.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Steps</CardTitle></CardHeader>
          <ol className={styles.steps}>
            {training.steps.map((step, i) => <li key={i} className={styles.step}><span className={styles.stepNum}>{i + 1}</span> {step}</li>)}
          </ol>
        </Card>
      )}
      <div className={styles.actions}>
        {training.externalUrl && (
          <a href={training.externalUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary"><ExternalLink size={16} /> Open Resource</Button>
          </a>
        )}
        {training.documentUrl && (
          <a href={training.documentUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary"><BookOpen size={16} /> View Document</Button>
          </a>
        )}
        {!myAssignment?.completed && (
          <Button onClick={complete}><CheckCircle size={16} /> Acknowledge & Complete</Button>
        )}
      </div>
      <p className={styles.updated}>Last updated: {formatAustralian(training.updatedAt)}</p>
    </div>
  );
}
