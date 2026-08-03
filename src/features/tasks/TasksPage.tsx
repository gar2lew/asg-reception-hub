import { useState, useEffect, useCallback } from 'react';
import { Play, CheckCircle, SkipForward, ExternalLink, BookOpen, AlertTriangle, FileText, Plus, Archive, RotateCcw, Search, Users, Calendar, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/Select/Select';
import { getSession } from '../../services/authService';
import { TaskDefinitionRepository } from '../../repositories/localStorage/TaskDefinitionRepository';
import { DailyTaskInstanceRepository } from '../../repositories/localStorage/DailyTaskInstanceRepository';
import { UserTaskRepository } from '../../repositories/localStorage/UserTaskRepository';
import { FirebaseTaskDefinitionRepository } from '../../repositories/firebase/FirebaseTaskDefinitionRepository';
import { FirebaseDailyTaskInstanceRepository } from '../../repositories/firebase/FirebaseDailyTaskInstanceRepository';
import { getProvider } from '../../firebase/config';
import { generateDailyTasks } from '../../services/taskGenerator';
import { nowISO, todayISO } from '../../utils/date';
import type { TaskInstance, UserTask } from '../../models';
import styles from './TasksPage.module.css';

const isFirebase = getProvider() === 'firebase';
const taskDefRepo = isFirebase ? new FirebaseTaskDefinitionRepository() as any : new TaskDefinitionRepository();
const instanceRepo = isFirebase ? new FirebaseDailyTaskInstanceRepository() as any : new DailyTaskInstanceRepository();
const userTaskRepo = new UserTaskRepository();

type View = 'today' | 'overdue' | 'upcoming' | 'completed' | 'personal' | 'shared' | 'archived';
const VIEWS: { id: View; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'overdue', label: 'Overdue' }, { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' }, { id: 'personal', label: 'Personal' }, { id: 'shared', label: 'Routines' }, { id: 'archived', label: 'Archived' },
];
export function TasksPage() {
  const session = getSession();
  const [, refresh] = useState(0);
  const [view, setView] = useState<View>('today');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [ft, setFt] = useState({ title: '', dueDate: '', dueTime: '', priority: 'normal' as 'low'|'normal'|'high' });
  const forceRefresh = () => refresh(n => n + 1);
  useEffect(() => { generateDailyTasks().then(forceRefresh); }, []);
  
  const staffId = session?.staffId || '';
  const todayKey = todayISO().split('T')[0];
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  useEffect(() => {
    if (!staffId) return;
    Promise.all([
      instanceRepo.getByDateAndStaff(todayKey, staffId),
      taskDefRepo.getAll(),
    ]).then(([insts, defs]) => {
      setInstances(insts);
      setDefinitions(defs);
    });
  }, [staffId, todayKey]);
  const defMap = new Map(definitions.map(d => [d.id, d]));
  const sharedTasks = instances.map(inst => ({ inst, def: defMap.get(inst.taskDefinitionId) })).filter(t => t.def);
  const userTasks = userTaskRepo.getByUser(staffId).filter(t => !t.archived);
  const archivedUt = userTaskRepo.getByUser(staffId).filter(t => t.archived);

  const createTask = () => {
    if (!ft.title.trim() || !staffId) return;
    if (editTaskId) { userTaskRepo.update(editTaskId, { title: ft.title.trim(), dueDate: ft.dueDate || undefined, dueTime: ft.dueTime || undefined, priority: ft.priority }); }
    else { userTaskRepo.create({ title: ft.title.trim(), ownerUid: staffId, priority: ft.priority, dueDate: ft.dueDate || undefined, dueTime: ft.dueTime || undefined }); }
    setShowModal(false); setEditTaskId(null); setFt({ title: '', dueDate: '', dueTime: '', priority: 'normal' }); forceRefresh();
  };
  const editTask = (t: UserTask) => { setFt({ title: t.title, dueDate: t.dueDate || '', dueTime: t.dueTime || '', priority: t.priority }); setEditTaskId(t.id); setShowModal(true); };
  const toggleComplete = (t: UserTask) => { userTaskRepo.update(t.id, { completed: !t.completed }); forceRefresh(); };
  const archiveTask = (id: string) => { userTaskRepo.archive(id); forceRefresh(); };
  const restoreTask = (id: string) => { userTaskRepo.restore(id); forceRefresh(); };
  const setSharedStatus = async (inst: TaskInstance, s: TaskInstance['status']) => {
    inst.status = s; inst.updatedAt = nowISO();
    if (s === 'completed') { inst.completedAt = nowISO(); inst.completedBy = staffId; }
    await instanceRepo.upsert(inst); forceRefresh();
  };
  const matches = (title: string) => !search || title.toLowerCase().includes(search.toLowerCase());

  const Section = ({ items, empty }: { items: { inst: TaskInstance; def: typeof definitions[0] }[]; empty: string }) => (
    items.length === 0 ? <Card><p className={styles.empty}>{empty}</p></Card> : <>{items.filter(t => matches(t.def.title)).map(t => (
      <div key={t.inst.id} className={styles.taskItem}>
        <div className={styles.taskInfo}><span className={styles.taskTitle}>{t.def.title}</span>
          <div className={styles.taskMeta}>{t.def.dueTime && <span className={styles.metaItem}><Clock size={12} /> {t.def.dueTime}</span>}
            {t.def.priority === 'high' && <Badge variant="danger">High</Badge>}{t.def.required ? <Badge variant="info">Req</Badge> : <Badge>Opt</Badge>}
          </div>
        </div>
        <div className={styles.taskActions}>
          {t.inst.status === 'pending' && <button className={styles.iconBtn} onClick={() => setSharedStatus(t.inst, 'in_progress')}><Play size={14} /></button>}
          {t.inst.status !== 'completed' && <button className={styles.iconBtn} onClick={() => setSharedStatus(t.inst, 'completed')}><CheckCircle size={14} /></button>}
          {t.inst.status === 'pending' && !t.def.required && <button className={styles.iconBtn} onClick={() => setSharedStatus(t.inst, 'skipped')}><SkipForward size={14} /></button>}
        </div>
      </div>
    ))}</>
  );

  const UTask = ({ t }: { t: UserTask }) => (
    <div className={styles.taskItem}>
      <button className={styles.checkBtn} onClick={() => toggleComplete(t)} aria-label={t.completed ? 'Reopen' : 'Complete'}>
        {t.completed ? <CheckCircle size={16} className={styles.checkDone} /> : <div className={styles.checkEmpty} />}
      </button>
      <div className={styles.taskInfo}><span className={`${styles.taskTitle} ${t.completed ? styles.done : ''}`}>{t.title}</span>
        <div className={styles.taskMeta}>{t.dueDate && <span className={styles.metaItem}><Calendar size={11} /> {t.dueDate}</span>}
          {t.dueTime && <span className={styles.metaItem}><Clock size={11} /> {t.dueTime}</span>}
          {t.priority === 'high' && <Badge variant="danger">High</Badge>}
        </div>
      </div>
      <div className={styles.taskActions}>
        <button className={styles.iconBtn} onClick={() => editTask(t)}><FileText size={14} /></button>
        <button className={styles.iconBtn} onClick={() => archiveTask(t.id)}><Archive size={14} /></button>
      </div>
    </div>
  );
  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>Daily Tasks</h1><Button size="sm" onClick={() => { setEditTaskId(null); setFt({ title: '', dueDate: '', dueTime: '', priority: 'normal' }); setShowModal(true); }}><Plus size={14} /> Add</Button></div>
      <div className={styles.tabs}>{VIEWS.map(v => (<button key={v.id} className={`${styles.tab} ${view === v.id ? styles.tabActive : ''}`} onClick={() => setView(v.id)}>{v.label}</button>))}</div>
      <div className={styles.searchBar}><Search size={14} /><input className={styles.searchInput} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>

      {view === 'today' && (<Card><CardHeader><CardTitle>Today&apos;s Tasks</CardTitle></CardHeader><Section items={sharedTasks.filter(t => t.inst.status !== 'completed' && t.def) as any} empty="No tasks for today" /></Card>)}
      {view === 'today' && userTasks.filter(t => !t.completed).filter(t => matches(t.title)).map(t => <UTask key={t.id} t={t} />)}

      {view === 'overdue' && (<>{sharedTasks.filter(t => t.inst.status === 'pending' && t.def?.dueTime && t.def.dueTime < new Date().toTimeString().slice(0, 5)).filter(t => t.def && matches(t.def.title)).map(t => <Section key={t.inst.id} items={[t] as any} empty='No overdue tasks' />)}
        {userTasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayKey).filter(t => matches(t.title)).map(t => <UTask key={t.id} t={t} />)}</>)}

      {view === 'upcoming' && (<Card><CardHeader><CardTitle>All Pending Tasks</CardTitle></CardHeader><Section items={sharedTasks.filter(t => t.inst.status === 'pending' && t.def) as any} empty="No pending tasks" /></Card>)}

      {view === 'completed' && (<Card><CardHeader><CardTitle>Completed Today</CardTitle></CardHeader><Section items={sharedTasks.filter(t => t.inst.status === 'completed' && t.def) as any} empty="No completed tasks" /></Card>)}
      {view === 'completed' && userTasks.filter(t => t.completed).filter(t => matches(t.title)).map(t => <UTask key={t.id} t={t} />)}

      {view === 'personal' && (<><p className={styles.sectionLabel}>Personal Tasks ({userTasks.filter(t => !t.completed).length})</p>
        {userTasks.filter(t => !t.completed).filter(t => matches(t.title)).map(t => <UTask key={t.id} t={t} />)}
        {userTasks.filter(t => !t.completed).length === 0 && <Card><p className={styles.empty}>No personal tasks</p></Card>}</>)}

      {view === 'shared' && (<Card><CardHeader><CardTitle>Shared Routines</CardTitle></CardHeader><Section items={sharedTasks.filter(t => t.def) as any} empty="No shared routines" /></Card>)}

      {view === 'archived' && (<>{archivedUt.filter(t => matches(t.title)).map(t => <div key={t.id} className={styles.taskItem}>
        <div className={styles.taskInfo}><span className={styles.taskTitle}>{t.title}</span></div>
        <div className={styles.taskActions}><button className={styles.iconBtn} onClick={() => restoreTask(t.id)}><RotateCcw size={14} /></button></div>
      </div>)}
      {archivedUt.length === 0 && <Card><p className={styles.empty}>No archived tasks</p></Card>}</>)}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTaskId ? 'Edit Task' : 'New Personal Task'}>
        <div className={styles.noteForm}>
          <Input label="Title" value={ft.title} onChange={e => setFt(p => ({ ...p, title: e.target.value }))} required />
          <Input label="Due Date" type="date" value={ft.dueDate} onChange={e => setFt(p => ({ ...p, dueDate: e.target.value }))} />
          <Input label="Due Time" type="time" value={ft.dueTime} onChange={e => setFt(p => ({ ...p, dueTime: e.target.value }))} />
          <Select label="Priority" value={ft.priority} onChange={e => setFt(p => ({ ...p, priority: e.target.value as any }))} options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }]} />
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={createTask}>{editTaskId ? 'Save' : 'Add'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}





