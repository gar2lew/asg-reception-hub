import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink, BookOpen, Play, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';
import { Button } from '../../components/Button/Button';
import { getSession } from '../../services/authService';
import { TrainingAssignmentRepository } from '../../repositories/localStorage/TrainingAssignmentRepository';
import { TaskDefinitionRepository } from '../../repositories/localStorage/TaskDefinitionRepository';
import { DailyTaskInstanceRepository } from '../../repositories/localStorage/DailyTaskInstanceRepository';
import { ContactRepository } from '../../repositories/localStorage/ContactRepository';
import { TrainingRepository } from '../../repositories/localStorage/TrainingRepository';
import { StockRepository } from '../../repositories/localStorage/StockRepository';
import { PrintingRepository } from '../../repositories/localStorage/PrintingRepository';
import { generateDailyTasks } from '../../services/taskGenerator';
import { nowISO } from '../../utils/date';
import type { TaskInstance } from '../../models';
import styles from './DashboardPage.module.css';
const taskDefRepo = new TaskDefinitionRepository();
const instanceRepo = new DailyTaskInstanceRepository();
const contactRepo = new ContactRepository();
const trainingRepo = new TrainingRepository();
const stockRepo = new StockRepository();
const printingRepo = new PrintingRepository();
const trainingAssignmentRepo = new TrainingAssignmentRepository();
export function DashboardPage() {
  const session = getSession();
  const navigate = useNavigate();
  const [, refresh] = useState(0);
  const forceRefresh = () => refresh(n => n + 1);
  useMemo(() => { generateDailyTasks(); }, []);
  const staffId = session?.staffId || '';
  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const instances = instanceRepo.getByDateAndStaff(todayKey, staffId);
  const definitions = taskDefRepo.getAll();
  const defMap = new Map(definitions.map(d => [d.id, d]));
  const tasksWithDefs = instances.map(inst => ({ inst, def: defMap.get(inst.taskDefinitionId) })).filter(t => t.def);
  const completed = tasksWithDefs.filter(t => t.inst.status === 'completed');
  const total = tasksWithDefs.length;
  const doneCount = completed.length;
  const priorityTasks = tasksWithDefs.filter(t => t.def!.priority === 'high' && t.inst.status !== 'completed').slice(0, 5);
  const overdueTasks = tasksWithDefs.filter(t => t.inst.status === 'pending' && t.def?.dueTime && t.def.dueTime < new Date().toTimeString().slice(0, 5)).slice(0, 3);
  const lowStock = stockRepo.getAll().filter(s => s.currentQuantity <= s.minimumQuantity);
  const printingNeeds = printingRepo.getAll().filter(p => {
    if (!p.lastPrintedDate) return true;
    const last = new Date(p.lastPrintedDate);
    const diff = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diff > p.checkFrequencyDays || p.estimatedQuantity <= p.preferredMinimum;
  });
  const contactsList = contactRepo.getAll().filter(c => c.category !== 'escalation');
  const escalationContacts = contactRepo.getByCategory('escalation');
  const assignedTraining = trainingRepo.getActive().filter(t => t.assignedStaffIds.includes(staffId));
  const incompleteTraining = assignedTraining.filter(t => {
    const assignments = trainingAssignmentRepo.getByStaff(staffId);
    return !assignments.some(a => a.trainingId === t.id && a.completed);
  });
  const updateTaskStatus = (instance: TaskInstance, status: TaskInstance['status']) => {
    instance.status = status;
    instance.updatedAt = nowISO();
    if (status === 'completed') { instance.completedAt = nowISO(); instance.completedBy = staffId; }
    instanceRepo.upsert(instance);
    forceRefresh();
  };
  return (
    <div className={styles.page}>
      <div className={styles.overview}>
        <ProgressBar value={doneCount} max={total} label="Today's Progress" />
      </div>
      <div className={styles.grid}>
        <div className={styles.colMain}>
          <Card>
            <CardHeader>
              <CardTitle>Priority Tasks</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>View All <ArrowRight size={14} /></Button>
            </CardHeader>
            <div className={styles.taskList}>
              {priorityTasks.length === 0 && <p className={styles.empty}>All priority tasks complete!</p>}
              {priorityTasks.map(t => (
                <div key={t.inst.id} className={styles.taskItem}>
                  <div className={styles.taskInfo}>
                    <span className={styles.taskTitle}>{t.def!.title}</span>
                    {t.def!.dueTime && <span className={styles.dueTime}>Due {t.def!.dueTime}</span>}
                  </div>
                  <div className={styles.taskActions}>
                    <button className={styles.actionBtn} onClick={() => updateTaskStatus(t.inst, 'in_progress')} aria-label="Start task"><Play size={14} /></button>
                    <button className={styles.actionBtn} onClick={() => updateTaskStatus(t.inst, 'completed')} aria-label="Complete task"><Badge variant="success">Done</Badge></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Opening Routine</CardTitle>
            </CardHeader>
            <div className={styles.taskList}>
              {tasksWithDefs.filter(t => t.def!.id.includes('open') && t.inst.status !== 'completed').slice(0, 5).map(t => (
                <div key={t.inst.id} className={styles.taskItem}>
                  <div className={styles.taskInfo}>
                    <span className={styles.taskTitle}>{t.def!.title}</span>
                    {t.def!.dueTime && <span className={styles.dueTime}>{t.def!.dueTime}</span>}
                  </div>
                  <button className={styles.actionBtn} onClick={() => updateTaskStatus(t.inst, 'completed')} aria-label="Complete">✓</button>
                </div>
              ))}
              {tasksWithDefs.filter(t => t.def!.id.includes('open') && t.inst.status !== 'completed').length === 0 && <p className={styles.empty}>Opening routine complete!</p>}
            </div>
          </Card>
          {overdueTasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Overdue Tasks <Badge variant="danger">{overdueTasks.length}</Badge></CardTitle></CardHeader>
              <div className={styles.taskList}>
                {overdueTasks.map(t => (
                  <div key={t.inst.id} className={styles.taskItem}>
                    <div className={styles.taskInfo}>
                      <AlertTriangle size={14} className={styles.warnIcon} />
                      <span className={styles.taskTitle}>{t.def!.title}</span>
                    </div>
                    <button className={styles.actionBtn} onClick={() => updateTaskStatus(t.inst, 'completed')} aria-label="Complete">✓</button>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {incompleteTraining.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Training Due</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/training')}>View All <ArrowRight size={14} /></Button>
              </CardHeader>
              <div className={styles.taskList}>
                {incompleteTraining.slice(0, 4).map(t => (
                  <div key={t.id} className={styles.taskItem}>
                    <BookOpen size={16} className={styles.taskIcon} />
                    <div className={styles.taskInfo}><span className={styles.taskTitle}>{t.title}</span></div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/training/${t.id}`)}>Open <ExternalLink size={12} /></Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {lowStock.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/stock')}>View Stock <ArrowRight size={14} /></Button>
              </CardHeader>
              <div className={styles.taskList}>
                {lowStock.map(s => (
                  <div key={s.id} className={styles.taskItem}>
                    <span className={styles.taskTitle}>{s.name} — {s.currentQuantity} {s.unit} left</span>
                    <Badge variant="warning">Low</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {printingNeeds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Printing Reminders</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/printing')}>View All <ArrowRight size={14} /></Button>
              </CardHeader>
              <div className={styles.taskList}>
                {printingNeeds.map(p => (
                  <div key={p.id} className={styles.taskItem}>
                    <span className={styles.taskTitle}>{p.name}</span>
                    <Badge variant="info">Check Due</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        <div className={styles.colSide}>
          <Card>
            <CardHeader><CardTitle>Need Help?</CardTitle></CardHeader>
            <div className={styles.helpList}>
              {contactsList.map(c => (
                <div key={c.id} className={styles.helpItem}>
                  <div className={styles.helpName}>{c.name}</div>
                  <div className={styles.helpRole}>{c.role}</div>
                  {c.phone && <div className={styles.helpContact}><Phone size={12} /> {c.phone}</div>}
                  {c.email && <div className={styles.helpContact}><Mail size={12} /> {c.email}</div>}
                </div>
              ))}
            </div>
          </Card>
          {escalationContacts.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Emergency / Escalation</CardTitle></CardHeader>
              <div className={styles.helpList}>
                {escalationContacts.map(c => (
                  <div key={c.id} className={styles.helpItem}>
                    <div className={styles.helpName}>{c.name}</div>
                    <div className={styles.helpRole}>{c.role}</div>
                    {c.phone && <div className={cn(styles.helpContact, styles.emergency)}><Phone size={12} /> {c.phone}</div>}
                    {c.notes && <div className={styles.helpNote}>{c.notes}</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>When Unsure</CardTitle></CardHeader>
            <div className={styles.guidance}>
              <AlertTriangle size={16} />
              <p><strong>Stop and ask before proceeding.</strong> It is always better to check than to guess. Your supervisor and team are here to support you.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
function cn(...classes: (string | false | null | undefined)[]): string { return classes.filter(Boolean).join(' '); }
