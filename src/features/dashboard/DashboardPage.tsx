import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ArrowRight, ExternalLink, BookOpen, Play, Phone, Mail, AlertTriangle, Eye, EyeOff, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';
import { Button } from '../../components/Button/Button';
import { WidgetErrorBoundary } from '../../components/WidgetErrorBoundary';
import { getSession } from '../../services/authService';
import { DashboardPreferenceRepository } from '../../repositories/localStorage/DashboardPreferenceRepository';
import { DASHBOARD_WIDGETS, defaultWidgetConfigs } from '../../models/dashboard';
import type { WidgetConfig } from '../../models/dashboard';
import type { TaskInstance } from '../../models';
import { TaskDefinitionRepository } from '../../repositories/localStorage/TaskDefinitionRepository';
import { DailyTaskInstanceRepository } from '../../repositories/localStorage/DailyTaskInstanceRepository';
import { ContactRepository } from '../../repositories/localStorage/ContactRepository';
import { TrainingRepository } from '../../repositories/localStorage/TrainingRepository';
import { TrainingAssignmentRepository } from '../../repositories/localStorage/TrainingAssignmentRepository';
import { StockCatalogueRepository } from '../../repositories/localStorage/StockCatalogueRepository';
import { StockInventoryRepository } from '../../repositories/localStorage/StockInventoryRepository';
import { stockStatus } from '../../models';
import { PrintingRepository } from '../../repositories/localStorage/PrintingRepository';
import { QuickLinkRepository } from '../../repositories/localStorage/QuickLinkRepository';
import { generateDailyTasks } from '../../services/taskGenerator';
import { nowISO } from '../../utils/date';
import styles from './DashboardPage.module.css';

const taskDefRepo = new TaskDefinitionRepository();
const instanceRepo = new DailyTaskInstanceRepository();
const contactRepo = new ContactRepository();
const trainingRepo = new TrainingRepository();
const trainingAssignmentRepo = new TrainingAssignmentRepository();
const stockCatRepo = new StockCatalogueRepository();
const stockInvRepo = new StockInventoryRepository();
const printingRepo = new PrintingRepository();
const quickLinkRepo = new QuickLinkRepository();
const prefRepo = new DashboardPreferenceRepository();
export function DashboardPage() {
  const session = getSession(); const navigate = useNavigate();
  const [, refresh] = useState(0); const forceRefresh = () => refresh(n => n + 1);
  const [editing, setEditing] = useState(false);
  const [editWidgets, setEditWidgets] = useState<WidgetConfig[] | null>(null);
  useMemo(() => { generateDailyTasks(); }, []);

  const staffId = session?.staffId || ''; const role = session?.role || '';
  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const pref = prefRepo.get(staffId);
  const widgets = editWidgets ?? pref.widgets;

  // Shared data
  const instances = instanceRepo.getByDateAndStaff(todayKey, staffId);
  const defs = new Map(taskDefRepo.getAll().map(d => [d.id, d]));
  const sharedTasks = instances.map(i => ({ inst: i, def: defs.get(i.taskDefinitionId) })).filter(t => t.def);
  const doneCount = sharedTasks.filter(t => t.inst.status === 'completed').length;
  const priorityTasks = sharedTasks.filter(t => t.def!.priority === 'high' && t.inst.status !== 'completed');
  const contacts = contactRepo.getAll().filter(c => c.category !== 'escalation');
  const allItems = stockCatRepo.getActive();
  const allInv = stockInvRepo.getAll();
  const lowStock = allInv.filter(inv => inv.currentQuantity > 0 && inv.currentQuantity <= inv.minimumQuantity);
  const printingAlerts = printingRepo.getAll().filter(p => { if (!p.lastPrintedDate) return true; const d = Date.now() - new Date(p.lastPrintedDate).getTime(); return d / 86400000 > p.checkFrequencyDays || p.estimatedQuantity <= p.preferredMinimum; });
  const incompleteTraining = trainingRepo.getActive().filter(t => t.assignedStaffIds.includes(staffId)).filter(t => !trainingAssignmentRepo.getByStaff(staffId).some(a => a.trainingId === t.id && a.completed));
  const qLinks = quickLinkRepo.getAll().filter(l => !l.archived && l.enabled).slice(0, 8);

  // Save/cancel/edit
  const startEdit = useCallback(() => { setEditWidgets([...pref.widgets]); setEditing(true); }, [pref]);
  const saveEdit = useCallback(() => { if (editWidgets) { prefRepo.save({ ...pref, widgets: editWidgets }); setEditing(false); forceRefresh(); } }, [editWidgets, pref]);
  const cancelEdit = useCallback(() => { setEditWidgets(null); setEditing(false); }, []);
  const resetDefaults = useCallback(() => { const d = defaultWidgetConfigs(); setEditWidgets(d); }, []);
  const toggleWidget = useCallback((key: string) => { setEditWidgets(prev => prev?.map(w => w.widgetKey === key ? { ...w, enabled: !w.enabled } : w) ?? null); }, []);
  const moveWidget = useCallback((i: number, dir: number) => { setEditWidgets(prev => { if (!prev) return prev; const a = [...prev]; const t = a[i]; a[i] = a[i + dir]; a[i + dir] = t; return a.map((w, idx) => ({ ...w, order: idx })); }); }, []);

  const visibleWidgets = widgets.filter(w => w.enabled).sort((a: any, b: any) => a.order - b.order);

  function renderWidget(w: WidgetConfig) {
    const def = DASHBOARD_WIDGETS.find(d => d.key === w.widgetKey);
    if (!def || (!def.roles.includes(role as any))) return null;
    return <WidgetErrorBoundary key={w.widgetKey} widgetKey={w.widgetKey} widgetLabel={def.label}>
      <div className={`${styles.widget} ${styles[w.size]}`}>
        {w.widgetKey === 'progress' && <><CardHeader><CardTitle>Today&apos;s Progress</CardTitle></CardHeader><ProgressBar value={doneCount} max={sharedTasks.length} label="Progress" /></>}
        {w.widgetKey === 'priority' && <><CardHeader><CardTitle>Priority Tasks <Badge variant="danger">{priorityTasks.length}</Badge></CardTitle><Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}><ArrowRight size={14} /></Button></CardHeader>
          {priorityTasks.length === 0 ? <p className={styles.empty}>All clear!</p> : priorityTasks.slice(0, 5).map(t => <div key={t.inst.id} className={styles.taskItem}><span>{t.def!.title}</span><Badge variant="danger">High</Badge></div>)}</>}
        {w.widgetKey === 'opening' && <><CardHeader><CardTitle>Opening Routine</CardTitle></CardHeader>
          {sharedTasks.filter(t => t.def!.id.includes('open') && t.inst.status !== 'completed').slice(0, 5).map(t => <div key={t.inst.id} className={styles.taskItem}><span>{t.def!.title}</span></div>)}
          {sharedTasks.filter(t => t.def!.id.includes('open') && t.inst.status !== 'completed').length === 0 && <p className={styles.empty}>Complete!</p>}</>}
        {w.widgetKey === 'upcoming' && <><CardHeader><CardTitle>Upcoming {sharedTasks.filter(t => t.inst.status === 'pending').length}</CardTitle></CardHeader>
          {sharedTasks.filter(t => t.inst.status === 'pending').slice(0, 6).map(t => <div key={t.inst.id} className={styles.taskItem}><span>{t.def!.title}</span></div>)}</>}
        {w.widgetKey === 'stock' && <><CardHeader><CardTitle>Low Stock <Badge variant="warning">{lowStock.length}</Badge></CardTitle><Button variant="ghost" size="sm" onClick={() => navigate('/stock')}><ArrowRight size={14} /></Button></CardHeader>
          {lowStock.map(inv => { const item = allItems.find(i => i.id === inv.stockItemId); return <div key={inv.id} className={styles.taskItem}><span>{item?.itemName || inv.stockItemId}: {inv.currentQuantity} left ({inv.office})</span><Badge variant="warning">Low</Badge></div>; })}</>}
        {w.widgetKey === 'printing' && <><CardHeader><CardTitle>Printing <Badge variant="info">{printingAlerts.length}</Badge></CardTitle><Button variant="ghost" size="sm" onClick={() => navigate('/printing')}><ArrowRight size={14} /></Button></CardHeader>
          {printingAlerts.map(p => <div key={p.id} className={styles.taskItem}><span>{p.name}</span><Badge variant="info">Due</Badge></div>)}</>}
        {w.widgetKey === 'quicklinks' && <><CardHeader><CardTitle>Quick Links</CardTitle><Button variant="ghost" size="sm" onClick={() => navigate('/quick-links')}><ArrowRight size={14} /></Button></CardHeader>
          {qLinks.map(l => <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className={styles.taskItem}>{l.title}<ExternalLink size={12} /></a>)}</>}
        {w.widgetKey === 'contacts' && <><CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
          {contacts.slice(0, 5).map(c => <div key={c.id} className={styles.taskItem}><span>{c.name}</span><span className={styles.meta}>{c.phone}</span></div>)}</>}
        {w.widgetKey === 'announcements' && <><CardHeader><CardTitle>Announcements</CardTitle></CardHeader><p className={styles.empty}>No announcements</p></>}
      </div>
    </WidgetErrorBoundary>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        {!editing ? <Button size="sm" variant="secondary" onClick={startEdit}><Settings size={14} /> Edit Layout</Button>
          : <div className={styles.editActions}><Button size="sm" variant="secondary" onClick={cancelEdit}><X size={14} /> Cancel</Button><Button size="sm" variant="secondary" onClick={resetDefaults}>Reset</Button><Button size="sm" onClick={saveEdit}><Check size={14} /> Save</Button></div>}
      </div>
      <div className={styles.grid}>
        {visibleWidgets.map(w => renderWidget(w))}
      </div>
      {editing && <Card><CardHeader><CardTitle>Widget Catalogue</CardTitle><p className={styles.meta}>Click to toggle, arrows to reorder</p></CardHeader>
        <div className={styles.widgetList}>{widgets.map((w: any, i: number) => {
          const def = DASHBOARD_WIDGETS.find(d => d.key === w.widgetKey);
          if (!def) return null;
          return <div key={w.widgetKey} className={styles.widgetEditItem}>
            <div className={styles.widgetEditInfo}><strong>{def.label}</strong>{def.required ? <Badge variant="info">Required</Badge> : w.enabled ? <Badge variant="success">On</Badge> : <Badge>Off</Badge>}</div>
            <div className={styles.widgetEditControls}>
              <button onClick={() => toggleWidget(w.widgetKey)} disabled={def.required} aria-label={w.enabled ? "Hide widget" : "Show widget"}>{w.enabled ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button onClick={() => moveWidget(i, -1)} disabled={i === 0} aria-label="Move up"><ChevronUp size={14} /></button>
              <button onClick={() => moveWidget(i, 1)} disabled={i === widgets.length - 1} aria-label="Move down"><ChevronDown size={14} /></button>
            </div>
          </div>;
        })}</div>
      </Card>}
    </div>
  );
}


