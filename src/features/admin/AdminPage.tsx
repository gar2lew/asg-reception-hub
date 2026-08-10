import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Plus, Pencil, RefreshCw, Archive, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/Select/Select';
import { Modal } from '../../components/Modal/Modal';
import { Badge } from '../../components/Badge/Badge';
import { getProvider } from '../../firebase/config';
import { FirebaseTaskDefinitionRepository } from '../../repositories/firebase/FirebaseTaskDefinitionRepository';
import { TaskDefinitionRepository } from '../../repositories/localStorage/TaskDefinitionRepository';
import { StaffRepository } from '../../repositories/localStorage/StaffRepository';
import { TrainingRepository } from '../../repositories/localStorage/TrainingRepository';
import { QuickLinkRepository } from '../../repositories/localStorage/QuickLinkRepository';
import { ContactRepository } from '../../repositories/localStorage/ContactRepository';
import { StockRepository } from '../../repositories/localStorage/StockRepository';
import { PrintingRepository } from '../../repositories/localStorage/PrintingRepository';
import { simpleHash } from '../../utils/hash';
import { clearAll } from '../../utils/storage';
import { nowISO } from '../../utils/date';
import type { Staff, StaffRole } from '../../models';
import { AdminOrdersSection } from './AdminOrdersSection';
import styles from './AdminPage.module.css';

const fb = getProvider() === 'firebase';
const taskDefRepo = fb ? new FirebaseTaskDefinitionRepository() as any : new TaskDefinitionRepository();
const staffRepo = new StaffRepository();
const trainingRepo = new TrainingRepository();
const quickLinkRepo = new QuickLinkRepository();
const contactRepo = new ContactRepository();
const stockRepo = new StockRepository();
const printingRepo = new PrintingRepository();

const RECIPIENTS = ['GyEaBMx4vKNZJC70yzxbpa0vcyp1', 'HFSi3JazOPgUQmylgDF9J81ItZT2'];
const RECIPIENT_LABELS: Record<string, string> = { 'GyEaBMx4vKNZJC70yzxbpa0vcyp1': 'Brisbane', 'HFSi3JazOPgUQmylgDF9J81ItZT2': 'Perth' };

function buildScheduleSummary(f: any) {
  const office = f.assignedStaffIds?.map((id: string) => RECIPIENT_LABELS[id] || id).join(', ') || 'none';
  if (f.recurrence === 'daily') return `Every day for ${office}`;
  if (f.recurrence === 'weekly') return `Every Monday for ${office}`;
  if (f.recurrence === 'monthly') return `1st of each month for ${office}`;
  if (f.recurrence === 'one_off') return `Once for ${office}`;
  return 'Schedule not set';
}

type AdminTab = 'tasks' | 'staff' | 'training' | 'templates' | 'categories' | 'suppliers' | 'archived-stock' | 'orders' | 'operations';

const ADMIN_TABS: AdminTab[] = ['tasks', 'staff', 'training', 'templates', 'categories', 'suppliers', 'archived-stock', 'orders', 'operations'];

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [, refresh] = useState(0);
  const requestedTab = searchParams.get('tab');
  const initialTab = requestedTab && ADMIN_TABS.includes(requestedTab as AdminTab) ? requestedTab as AdminTab : 'tasks';
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const forceRefresh = () => refresh(n => n + 1);

  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [taskMessage, setTaskMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', category: 'daily', recurrence: 'daily' as string, priority: 'normal' as string, required: true, assignedStaffIds: [...RECIPIENTS], dueTime: '', instructions: '', externalUrl: '' });

  const loadTasks = () => {
    Promise.resolve(taskDefRepo.getAll())
      .then(setAllTasks)
      .catch(err => console.error('[Admin] Failed to load tasks:', err));
  };
  useEffect(() => { loadTasks(); }, []);

  const saveTask = async () => {
    if (!taskForm.title.trim()) return;
    setSaving(true);
    setTaskMessage(null);
    const data = {
      title: taskForm.title.trim(), description: taskForm.description.trim() || undefined,
      category: taskForm.category, recurrence: taskForm.recurrence,
      priority: taskForm.priority, required: taskForm.required,
      assignedStaffIds: taskForm.assignedStaffIds, dueTime: taskForm.dueTime || undefined,
      instructions: taskForm.instructions.trim() || undefined,
      externalUrl: taskForm.externalUrl.trim() || undefined,
      scope: 'organisation' as const, completionType: 'personal' as const, active: true,
    };
    try {
      if (editingTaskId) {
        await taskDefRepo.update(editingTaskId, data);
      } else {
        await taskDefRepo.create(data);
      }
      setShowTaskModal(false); setEditingTaskId(null);
      setTaskForm({ title: '', description: '', category: 'daily', recurrence: 'daily', priority: 'normal', required: true, assignedStaffIds: [...RECIPIENTS], dueTime: '', instructions: '', externalUrl: '' });
      setTaskMessage({ type: 'success', text: 'Task saved successfully.' });
      loadTasks();
    } catch (err: any) {
      const code = err?.code || err?.message || '';
      if (code.includes('permission-denied') || code.includes('PERMISSION_DENIED')) {
        setTaskMessage({ type: 'error', text: 'You do not have permission to create shared tasks.' });
      } else {
        setTaskMessage({ type: 'error', text: 'The task could not be saved. Please try again.' });
      }
      console.error('[Admin] Task save failed:', code);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await taskDefRepo.update(id, { active, updatedAt: nowISO() });
      loadTasks();
    } catch (err: any) {
      console.error('[Admin] Toggle active failed:', err?.code || err?.message);
    }
  };

  const openNew = () => { setTaskForm({ title: '', description: '', category: 'daily', recurrence: 'daily', priority: 'normal', required: true, assignedStaffIds: [...RECIPIENTS], dueTime: '', instructions: '', externalUrl: '' }); setEditingTaskId(null); setShowTaskModal(true); };
  const openEdit = (t: any) => { setTaskForm({ title: t.title, description: t.description || '', category: t.category, recurrence: t.recurrence, priority: t.priority, required: t.required ?? true, assignedStaffIds: t.assignedStaffIds || [...RECIPIENTS], dueTime: t.dueTime || '', instructions: t.instructions || '', externalUrl: t.externalUrl || '' }); setEditingTaskId(t.id); setShowTaskModal(true); };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'tasks', label: 'Task Management' }, { id: 'staff', label: 'Staff' },
    { id: 'training', label: 'Training' }, { id: 'templates', label: 'Templates' },
    { id: 'categories', label: 'Categories' }, { id: 'suppliers', label: 'Suppliers' },
    { id: 'archived-stock', label: 'Archived Stock' },
    { id: 'orders', label: 'Orders' },
    { id: 'operations', label: 'Operations' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}><Shield size={20} /> Admin</h1><Button variant="danger" size="sm" onClick={() => { clearAll(); window.location.reload(); }}><RefreshCw size={14} /> Reset Data</Button></div>
      <div className={styles.tabs}>{tabs.map(t => <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => { setTab(t.id); setSearchParams(t.id === 'tasks' ? {} : { tab: t.id }); }}>{t.label}</button>)}</div>

      {tab === 'tasks' && <Card><CardHeader><CardTitle>Task Definitions ({allTasks.length})</CardTitle><Button size="sm" onClick={openNew}><Plus size={14} /> New Task</Button>{taskMessage && <span style={{ fontSize: '0.85rem', color: taskMessage.type === 'error' ? 'var(--asg-color-danger, #dc3545)' : 'var(--asg-color-success, #198754)', fontWeight: 500 }}>{taskMessage.text}</span>}</CardHeader>
        <div className={styles.table}><div className={`${styles.tableRow} ${styles.tableHeader}`}><span>Title</span><span>Recurrence</span><span>Priority</span><span>Active</span><span></span></div>
        {allTasks.map((t: any) => <div key={t.id} className={styles.tableRow}><span>{t.title}</span><span><Badge>{t.recurrence}</Badge></span><span><Badge variant={t.priority === 'high' ? 'danger' : 'default'}>{t.priority}</Badge></span><span>{t.active ? <Badge variant="success">Active</Badge> : <Badge variant="default">Archived</Badge>}</span><span className={styles.actionCell}><Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil size={12} /></Button>{t.active ? <Button variant="ghost" size="sm" onClick={() => toggleActive(t.id, false)}><Archive size={12} /></Button> : <Button variant="ghost" size="sm" onClick={() => toggleActive(t.id, true)}><RotateCcw size={12} /></Button>}</span></div>)}
        </div>
      </Card>}
      {tab === 'orders' && <AdminOrdersSection />}

      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)} title={editingTaskId ? 'Edit Task' : 'New Task'} width="640px">
        <div className={styles.modalForm}>
          <Input label="Title" value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} required />
          <Input label="Description" value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
          <div className={styles.formRow}>
            <Select label="Category" value={taskForm.category} onChange={e => setTaskForm(p => ({ ...p, category: e.target.value }))} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'one_off', label: 'One-off' }, { value: 'training', label: 'Training' }, { value: 'stock_check', label: 'Stock Check' }, { value: 'printing_check', label: 'Printing Check' }]} />
            <Select label="Recurrence" value={taskForm.recurrence} onChange={e => setTaskForm(p => ({ ...p, recurrence: e.target.value }))} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly (Monday)' }, { value: 'monthly', label: 'Monthly (1st)' }, { value: 'one_off', label: 'One-off' }]} />
          </div>
          <div className={styles.formRow}>
            <Select label="Priority" value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))} options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }]} />
            <Select label="Required" value={taskForm.required ? 'yes' : 'no'} onChange={e => setTaskForm(p => ({ ...p, required: e.target.value === 'yes' }))} options={[{ value: 'yes', label: 'Required' }, { value: 'no', label: 'Optional' }]} />
          </div>
          <Input label="Due Time" type="time" value={taskForm.dueTime} onChange={e => setTaskForm(p => ({ ...p, dueTime: e.target.value }))} />
          <div className={styles.formGroup}><span className={styles.formLabel}>Assignment</span>
            <div style={{ display: 'flex', gap: 'var(--asg-space-2)' }}>
              {RECIPIENTS.map(id => <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer' }}><input type="checkbox" checked={taskForm.assignedStaffIds.includes(id)} onChange={e => { const ids = e.target.checked ? [...taskForm.assignedStaffIds, id] : taskForm.assignedStaffIds.filter((x: string) => x !== id); setTaskForm(p => ({ ...p, assignedStaffIds: ids })); }} /> {RECIPIENT_LABELS[id]}</label>)}
            </div>
          </div>
          <Input label="Instructions" value={taskForm.instructions} onChange={e => setTaskForm(p => ({ ...p, instructions: e.target.value }))} />
          <Input label="External URL" value={taskForm.externalUrl} onChange={e => setTaskForm(p => ({ ...p, externalUrl: e.target.value }))} placeholder="https://..." />
          <div className={styles.scheduleSummary}>{buildScheduleSummary(taskForm)}</div>
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setShowTaskModal(false)}>Cancel</Button><Button onClick={saveTask} disabled={saving}>{saving ? 'Saving...' : editingTaskId ? 'Save Changes' : 'Create Task'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
