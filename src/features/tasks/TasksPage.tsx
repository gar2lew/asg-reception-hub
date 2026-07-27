import { useState, useMemo } from 'react';
import { Play, CheckCircle, SkipForward, ExternalLink, BookOpen, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { getSession } from '../../services/authService';
import { TaskDefinitionRepository } from '../../repositories/localStorage/TaskDefinitionRepository';
import { DailyTaskInstanceRepository } from '../../repositories/localStorage/DailyTaskInstanceRepository';
import { generateDailyTasks } from '../../services/taskGenerator';
import { nowISO } from '../../utils/date';
import type { TaskInstance } from '../../models';
import styles from './TasksPage.module.css';
const taskDefRepo = new TaskDefinitionRepository();
const instanceRepo = new DailyTaskInstanceRepository();
export function TasksPage() {
  const session = getSession();
  const [, refresh] = useState(0);
  const forceRefresh = () => refresh(n => n + 1);
  const [selectedInst, setSelectedInst] = useState<TaskInstance | null>(null);
  const [noteText, setNoteText] = useState('');
  useMemo(() => { generateDailyTasks(); }, []);
  const staffId = session?.staffId || '';
  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const instances = instanceRepo.getByDateAndStaff(todayKey, staffId);
  const definitions = taskDefRepo.getAll();
  const defMap = new Map(definitions.map(d => [d.id, d]));
  const tasksWithDefs = instances.map(inst => ({ inst, def: defMap.get(inst.taskDefinitionId) })).filter(t => t.def);
  const updateStatus = (inst: TaskInstance, status: TaskInstance['status']) => {
    inst.status = status;
    inst.updatedAt = nowISO();
    if (status === 'completed') { inst.completedAt = nowISO(); inst.completedBy = staffId; }
    instanceRepo.upsert(inst);
    forceRefresh();
  };
  const openNote = (inst: TaskInstance) => { setSelectedInst(inst); setNoteText(inst.note || ''); };
  const saveNote = () => {
    if (selectedInst) { selectedInst.note = noteText; selectedInst.updatedAt = nowISO(); instanceRepo.upsert(selectedInst); }
    setSelectedInst(null);
    forceRefresh();
  };
  const sections = [
    { label: 'In Progress', status: 'in_progress' as const, icon: Play },
    { label: 'Pending', status: 'pending' as const, icon: FileText },
    { label: 'Completed', status: 'completed' as const, icon: CheckCircle },
  ];
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Daily Tasks</h1>
      {sections.map(section => {
        const items = tasksWithDefs.filter(t => t.inst.status === section.status);
        if (items.length === 0) return null;
        const Icon = section.icon;
        return (
          <Card key={section.status} className={styles.section}>
            <CardHeader>
              <CardTitle><Icon size={16} /> {section.label} ({items.length})</CardTitle>
            </CardHeader>
            <div className={styles.taskList}>
              {items.map(t => (
                <div key={t.inst.id} className={styles.taskItem}>
                  <div className={styles.taskMain}>
                    <div className={styles.taskInfo}>
                      <span className={styles.taskTitle}>{t.def!.title}</span>
                      <div className={styles.taskMeta}>
                        {t.def!.dueTime && <span className={styles.metaItem}>Due: {t.def!.dueTime}</span>}
                        {t.def!.priority === 'high' && <Badge variant="danger">High</Badge>}
                        {t.def!.required && <Badge variant="info">Required</Badge>}
                        {!t.def!.required && <Badge variant="default">Optional</Badge>}
                      </div>
                      {t.def!.description && <p className={styles.taskDesc}>{t.def!.description}</p>}
                    </div>
                    <div className={styles.taskActions}>
                      {t.inst.status === 'pending' && (
                        <button className={styles.iconBtn} onClick={() => updateStatus(t.inst, 'in_progress')} aria-label="Start"><Play size={16} /></button>
                      )}
                      {t.inst.status !== 'completed' && (
                        <button className={styles.iconBtn} onClick={() => updateStatus(t.inst, 'completed')} aria-label="Complete"><CheckCircle size={16} /></button>
                      )}
                      {t.inst.status !== 'completed' && !t.def!.required && (
                        <button className={styles.iconBtn} onClick={() => updateStatus(t.inst, 'skipped')} aria-label="Skip"><SkipForward size={16} /></button>
                      )}
                      <button className={styles.iconBtn} onClick={() => openNote(t.inst)} aria-label="Add note"><FileText size={16} /></button>
                    </div>
                  </div>
                  {(t.def!.instructions || t.def!.relatedTrainingId || t.def!.externalUrl) && (
                    <div className={styles.taskLinks}>
                      {t.def!.instructions && <span className={styles.linkItem}><AlertTriangle size={12} /> {t.def!.instructions}</span>}
                      {t.def!.relatedTrainingId && (
                        <a href={`/training/${t.def!.relatedTrainingId}`} className={styles.linkItem}
                          onClick={e => { e.preventDefault(); window.location.href = `/training/${t.def!.relatedTrainingId}`; }}>
                          <BookOpen size={12} /> View related training
                        </a>
                      )}
                      {t.def!.externalUrl && (
                        <a href={t.def!.externalUrl} target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                          <ExternalLink size={12} /> Open link
                        </a>
                      )}
                    </div>
                  )}
                  {t.inst.note && <div className={styles.notePreview}><FileText size={12} /> {t.inst.note}</div>}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      {tasksWithDefs.length === 0 && (
        <Card><p className={styles.empty}>No tasks for today yet.</p></Card>
      )}
      <Modal open={!!selectedInst} onClose={() => setSelectedInst(null)} title="Add Note">
        <div className={styles.noteForm}>
          <label className={styles.noteLabel}>Note for task</label>
          <textarea className={styles.noteInput} value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Enter your note..." />
          <div className={styles.noteActions}>
            <Button variant="secondary" onClick={() => setSelectedInst(null)}>Cancel</Button>
            <Button onClick={saveNote}>Save Note</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
