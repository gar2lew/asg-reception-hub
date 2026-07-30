import { useState } from 'react';
import { Shield, Plus, Pencil, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/Select/Select';
import { Modal } from '../../components/Modal/Modal';
import { Badge } from '../../components/Badge/Badge';
import { StaffRepository } from '../../repositories/localStorage/StaffRepository';
import { TaskDefinitionRepository } from '../../repositories/localStorage/TaskDefinitionRepository';
import { TrainingRepository } from '../../repositories/localStorage/TrainingRepository';
import { QuickLinkRepository } from '../../repositories/localStorage/QuickLinkRepository';
import { ContactRepository } from '../../repositories/localStorage/ContactRepository';
import { StockRepository } from '../../repositories/localStorage/StockRepository';
import { PrintingRepository } from '../../repositories/localStorage/PrintingRepository';
import { simpleHash } from '../../utils/hash';
import { clearAll } from '../../utils/storage';
import type { Staff, StaffRole } from '../../models';
import styles from './AdminPage.module.css';
import { CategoriesSection } from './CategoriesSection';
import { SuppliersSection } from './SuppliersSection';
import { ArchivedStockSection } from './ArchivedStockSection';
const staffRepo = new StaffRepository();
const taskDefRepo = new TaskDefinitionRepository();
const trainingRepo = new TrainingRepository();
const quickLinkRepo = new QuickLinkRepository();
const contactRepo = new ContactRepository();
const stockRepo = new StockRepository();
const printingRepo = new PrintingRepository();
type AdminTab = 'staff' | 'tasks' | 'training' | 'templates' | 'categories' | 'suppliers' | 'archived-stock' | 'operations';
export function AdminPage() {
  const [, refresh] = useState(0);
  const [tab, setTab] = useState<AdminTab>('staff');
  const forceRefresh = () => refresh(n => n + 1);
  const [staffForm, setStaffForm] = useState({ name: '', pin: '', role: 'receptionist' as StaffRole, email: '', phone: '', jobTitle: '' });
  const [staffLocation, setStaffLocation] = useState('');
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'staff', label: 'Staff Management' },
    { id: 'tasks', label: 'Task Management' },
    { id: 'training', label: 'Training Management' },
    { id: 'templates', label: 'Task Templates' },
    { id: 'categories', label: 'Stock Categories' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'archived-stock', label: 'Archived Stock' },
    { id: 'operations', label: 'Operations' },
  ];
  const resetData = () => {
    clearAll();
    window.location.reload();
  };
  const saveStaff = () => {
    if (editingStaff) {
      const data: Partial<Staff> = { name: staffForm.name, location: staffLocation || undefined, email: staffForm.email || undefined, phone: staffForm.phone || undefined, jobTitle: staffForm.jobTitle || undefined };
      if (staffForm.pin) data.pinHash = simpleHash(staffForm.pin);
      staffRepo.update(editingStaff, data);
    } else {
      staffRepo.create({ name: staffForm.name, pin: staffForm.pin, role: staffForm.role, location: staffLocation || undefined, email: staffForm.email || undefined, phone: staffForm.phone || undefined, jobTitle: staffForm.jobTitle || undefined });
    }
    setShowStaffModal(false); setEditingStaff(null); setStaffForm({ name: '', pin: '', role: 'receptionist', email: '', phone: '', jobTitle: '' }); setStaffLocation(''); forceRefresh();
  };
  const editStaff = (s: Staff) => {
    setStaffForm({ name: s.name, pin: '', role: s.role, email: s.email || '', phone: s.phone || '', jobTitle: s.jobTitle || '' });
    setStaffLocation(s.location || '');
    setEditingStaff(s.id); setShowStaffModal(true);
  };
  const allStaff = staffRepo.getAll().filter(s => s.active);
  const allTasks = taskDefRepo.getAll();
  const allTraining = trainingRepo.getAll();
  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}><Shield size={20} /> Admin Area</h1>
        <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}><RefreshCw size={14} /> Reset Demo Data</Button>
      </div>
      <div className={styles.tabs}>{tabs.map(t => (<button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>))}</div>
      {tab === 'staff' && (
        <Card><CardHeader><CardTitle>Staff Accounts <Button variant="ghost" size="sm" onClick={() => { setStaffForm({ name: '', pin: '', role: 'receptionist', email: '', phone: '', jobTitle: '' }); setStaffLocation(''); setEditingStaff(null); setShowStaffModal(true); }}><Plus size={14} /> Add Staff</Button></CardTitle></CardHeader>
          <div className={styles.table}><div className={styles.tableRow + ' ' + styles.tableHeader}><span>Name</span><span>Role</span><span>Location</span><span>Email</span><span>Phone</span><span>Actions</span></div>
          {allStaff.map(s => (<div key={s.id} className={styles.tableRow}><span>{s.name}</span><span><Badge>{s.role === 'admin' ? 'Admin' : 'Receptionist'}</Badge></span><span>{s.location || '—'}</span><span>{s.email || '—'}</span><span>{s.phone || '—'}</span><span className={styles.actionCell}><Button variant="ghost" size="sm" onClick={() => editStaff(s)}><Pencil size={12} /> Edit</Button></span></div>))}</div>
        </Card>
      )}
      {tab === 'tasks' && (
        <Card><CardHeader><CardTitle>Task Definitions ({allTasks.length})</CardTitle></CardHeader>
          <div className={styles.table}><div className={styles.tableRow + ' ' + styles.tableHeader}><span>Title</span><span>Recurrence</span><span>Priority</span><span>Active</span></div>
          {allTasks.map(t => (<div key={t.id} className={styles.tableRow}><span>{t.title}</span><span><Badge>{t.recurrence}</Badge></span><span><Badge variant={t.priority === 'high' ? 'danger' : t.priority === 'normal' ? 'default' : 'info'}>{t.priority}</Badge></span><span>{t.active ? <Badge variant="success">Active</Badge> : <Badge variant="default">Inactive</Badge>}</span></div>))}</div>
        </Card>
      )}
      {tab === 'training' && (
        <Card><CardHeader><CardTitle>Training Items ({allTraining.length})</CardTitle></CardHeader>
          <div className={styles.table}><div className={styles.tableRow + ' ' + styles.tableHeader}><span>Title</span><span>Category</span><span>Duration</span><span>Active</span></div>
          {allTraining.map(t => (<div key={t.id} className={styles.tableRow}><span>{t.title}</span><span><Badge>{t.category}</Badge></span><span>{t.estimatedMinutes} min</span><span>{t.active ? <Badge variant="success">Active</Badge> : <Badge variant="default">Inactive</Badge>}</span></div>))}</div>
        </Card>
      )}
      {tab === 'templates' && (
        <Card><CardHeader><CardTitle>Task Templates ({allTasks.length})</CardTitle></CardHeader>
          <div className={styles.table}><div className={styles.tableRow + ' ' + styles.tableHeader}><span>Title</span><span>Recurrence</span><span>Scope</span><span>Priority</span><span>Active</span></div>
          {allTasks.filter(t => t.scope !== 'personal').map(t => (<div key={t.id} className={styles.tableRow}><span>{t.title}</span><span><Badge>{t.recurrence}</Badge></span><span><Badge>{t.scope}</Badge></span><span><Badge variant={t.priority === 'high' ? 'danger' : 'default'}>{t.priority}</Badge></span><span>{t.active ? <Badge variant="success">Active</Badge> : <Badge>Inactive</Badge>}</span></div>))}</div>
        </Card>
      )}
      {tab === 'categories' && (<CategoriesSection />)}
      {tab === 'suppliers' && (<SuppliersSection />)}
      {tab === 'archived-stock' && (<ArchivedStockSection />)}
      {tab === 'operations' && (
        <div className={styles.opsGrid}>
          <Card><CardHeader><CardTitle>Quick Links ({quickLinkRepo.getAll().length})</CardTitle></CardHeader><p className={styles.opsNote}>Editable via seed data. Future: in-app editing.</p></Card>
          <Card><CardHeader><CardTitle>Contacts ({contactRepo.getAll().length})</CardTitle></CardHeader><p className={styles.opsNote}>Editable via seed data. Future: in-app editing.</p></Card>
          <Card><CardHeader><CardTitle>Stock Items ({stockRepo.getAll().length})</CardTitle></CardHeader><p className={styles.opsNote}>Staff can update quantities. Admin can edit items in future.</p></Card>
          <Card><CardHeader><CardTitle>Print Resources ({printingRepo.getAll().length})</CardTitle></CardHeader><p className={styles.opsNote}>Staff can record print runs. Admin can edit items in future.</p></Card>
        </div>
      )}
      <Modal open={showStaffModal} onClose={() => setShowStaffModal(false)} title={editingStaff ? 'Edit Staff' : 'Add Staff'}>
        <div className={styles.modalForm}>
          <Input label="Name" value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))} required />
          <Input label="Location" value={staffLocation} onChange={e => setStaffLocation(e.target.value)} placeholder="e.g. Brisbane, Perth, All" />
          <Input label={editingStaff ? 'New PIN (leave blank to keep current)' : 'PIN'} type="password" value={staffForm.pin} onChange={e => setStaffForm(p => ({ ...p, pin: e.target.value }))} maxLength={6} />
          <Select label="Role" value={staffForm.role} onChange={e => setStaffForm(p => ({ ...p, role: e.target.value as StaffRole }))} options={[{ value: 'receptionist', label: 'Receptionist' }, { value: 'admin', label: 'Administrator' }]} />
          <Input label="Email" value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} type="email" />
          <Input label="Phone" value={staffForm.phone} onChange={e => setStaffForm(p => ({ ...p, phone: e.target.value }))} />
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setShowStaffModal(false)}>Cancel</Button><Button onClick={saveStaff}>{editingStaff ? 'Save Changes' : 'Add Staff'}</Button></div>
        </div>
      </Modal>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset All Demo Data" width="400px">
        <div className={styles.modalForm}>
          <p className={styles.warning}>This will erase all data including tasks, stock updates, and staff changes. This cannot be undone.</p>
          <p className={styles.warning}>You will be logged out and the app will reload.</p>
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={resetData}><RefreshCw size={14} /> Reset Everything</Button></div>
        </div>
      </Modal>
    </div>
  );
}

