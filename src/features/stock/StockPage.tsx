import { useState } from 'react';
import { Search, Package, Archive, RotateCcw, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Modal } from '../../components/Modal/Modal';
import { Select } from '../../components/Select/Select';
import { getSession } from '../../services/authService';
import { StockCatalogueRepository } from '../../repositories/localStorage/StockCatalogueRepository';
import { StockInventoryRepository } from '../../repositories/localStorage/StockInventoryRepository';
import { StockCategoryRepository } from '../../repositories/localStorage/StockCategoryRepository';
import { SupplierRepository } from '../../repositories/localStorage/SupplierRepository';
import { stockStatus } from '../../models';
import { nowISO } from '../../utils/date';
import { isValidUrl } from '../../utils/urlValidation';
import type { StockCatalogueItem, StockInventory } from '../../models';
import styles from './StockPage.module.css';

const catRepo = new StockCatalogueRepository();
const invRepo = new StockInventoryRepository();
const catCatRepo = new StockCategoryRepository();
const suppRepo = new SupplierRepository();

export function StockPage() {
  const session = getSession();
  const [, refresh] = useState(0);
  const [search, setSearch] = useState('');
  const [officeFilter, setOfficeFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [form, setForm] = useState({ itemName: '', unitLabel: 'each', categoryId: '', preferredSupplierId: '', preferredOrderUrl: '', notes: '' });
  const [invForm, setInvForm] = useState({ currentQty: 0, minQty: 0, targetQty: 0, reorderQty: 0, office: 'brisbane' });
  const [showInv, setShowInv] = useState<string | null>(null);
  const forceRefresh = () => refresh(n => n + 1);

  const isAdmin = session?.role === 'admin';
  const catalogue = isAdmin ? catRepo.getAll() : catRepo.getActive();
  const invs = invRepo.getAll();
  const categories = catCatRepo.getAll();
  const suppliers = suppRepo.getActive();
  const offices = ['brisbane', 'perth', 'all'];

  const getInv = (stockItemId: string): StockInventory | undefined => {
    if (officeFilter) return invs.find(i => i.stockItemId === stockItemId && i.office === officeFilter);
    return invs.find(i => i.stockItemId === stockItemId && i.office === 'brisbane') || invs.find(i => i.stockItemId === stockItemId);
  };

  const filtered = catalogue.filter(c => {
    if (search && !c.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && c.categoryId !== catFilter) return false;
    const inv = getInv(c.id);
    if (!inv && !officeFilter) return true;
    if (!inv) return false;
    return true;
  });

  const saveItem = () => {
    if (!form.itemName.trim()) return;
    if (editCatId) { catRepo.update(editCatId, { itemName: form.itemName.trim(), unitLabel: form.unitLabel, categoryId: form.categoryId || undefined, preferredSupplierId: form.preferredSupplierId || undefined, preferredOrderUrl: form.preferredOrderUrl || undefined }); }
    else { const c = catRepo.create({ itemName: form.itemName.trim(), unitLabel: form.unitLabel, categoryId: form.categoryId || undefined, preferredSupplierId: form.preferredSupplierId || undefined, preferredOrderUrl: form.preferredOrderUrl || undefined }); }
    setShowAdd(false); setEditCatId(null); forceRefresh();
  };
  const saveInv = () => {
    if (!showInv) return;
    const existing = invs.find(i => i.stockItemId === showInv && i.office === invForm.office);
    const inv: StockInventory = {
      id: existing?.id || crypto.randomUUID(), stockItemId: showInv, office: invForm.office as any,
      currentQuantity: invForm.currentQty, minimumQuantity: invForm.minQty,
      targetQuantity: invForm.targetQty || undefined, reorderQuantity: invForm.reorderQty || undefined,
      updatedAt: nowISO(), updatedBy: session?.name,
    };
    invRepo.upsert(inv);
    setShowInv(null); forceRefresh();
  };
  const editItem = (c: StockCatalogueItem) => {
    setForm({ itemName: c.itemName, unitLabel: c.unitLabel, categoryId: c.categoryId || '', preferredSupplierId: c.preferredSupplierId || '', preferredOrderUrl: c.preferredOrderUrl || '', notes: c.notes || '' });
    setEditCatId(c.id); setShowAdd(true);
  };
  const archiveItem = (id: string) => { catRepo.archive(id, session?.name || ''); forceRefresh(); };
  const openInv = (stockItemId: string) => {
    const existing = invs.find(i => i.stockItemId === stockItemId && (officeFilter ? i.office === officeFilter : i.office === 'brisbane'));
    setInvForm({ currentQty: existing?.currentQuantity ?? 0, minQty: existing?.minimumQuantity ?? 0, targetQty: existing?.targetQuantity ?? 0, reorderQty: existing?.reorderQuantity ?? 0, office: existing?.office || officeFilter || 'brisbane' });
    setShowInv(stockItemId);
  };
  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>Stock Register</h1>
        {isAdmin && <Button size="sm" onClick={() => { setEditCatId(null); setForm({ itemName: '', unitLabel: 'each', categoryId: '', preferredSupplierId: '', preferredOrderUrl: '', notes: '' }); setShowAdd(true); }}><Plus size={14} /> Add Item</Button>}
      </div>
      <div className={styles.filters}>
        <Input placeholder="Search stock..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} aria-label="Search" />
        <select className={styles.catSelect} value={officeFilter} onChange={e => setOfficeFilter(e.target.value)} aria-label="Office">
          <option value="">All Offices</option>{offices.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={styles.catSelect} value={catFilter} onChange={e => setCatFilter(e.target.value)} aria-label="Category">
          <option value="">All Categories</option>{categories.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Card>
        <div className={styles.table}><div className={`${styles.tableRow} ${styles.tableHeader}`}>
          <span>Item</span><span>Unit</span><span>Qty</span><span>Min</span><span>Status</span><span>Actions</span>
        </div>
        {filtered.map(c => {
          const inv = getInv(c.id);
          const status = inv ? stockStatus(inv) : 'healthy';
          const statusLabel: Record<string, string> = { out: 'Out', low: 'Low', healthy: 'OK', over: 'Over' };
          const statusVar: Record<string, any> = { out: 'danger', low: 'warning', healthy: 'success', over: 'info' };
          return <div key={c.id} className={styles.tableRow}>
            <span className={styles.colName}><Package size={14} className={styles.rowIcon} />{c.itemName}</span>
            <span>{c.unitLabel}</span>
            <span>{inv ? inv.currentQuantity : '—'}</span>
            <span>{inv ? inv.minimumQuantity : '—'}</span>
            <span>{inv ? <Badge variant={statusVar[status]}>{statusLabel[status]}</Badge> : <Badge>—</Badge>}</span>
            <span className={styles.actionCell}>
              <Button variant="ghost" size="sm" onClick={() => openInv(c.id)}>{isAdmin ? 'Inventory' : 'View'}</Button>
              {isAdmin && <Button variant="ghost" size="sm" onClick={() => editItem(c)}>Edit</Button>}
              {isAdmin && <Button variant="ghost" size="sm" onClick={() => archiveItem(c.id)}><Archive size={14} /></Button>}
            </span>
          </div>;
        })}
        {filtered.length === 0 && <p className={styles.empty}>No stock items match your filters.</p>}
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editCatId ? 'Edit Catalogue Item' : 'Add Catalogue Item'}>
        <div className={styles.modalForm}>
          <Input label="Name" value={form.itemName} onChange={e => setForm(p => ({ ...p, itemName: e.target.value }))} required />
          <Input label="Unit" value={form.unitLabel} onChange={e => setForm(p => ({ ...p, unitLabel: e.target.value }))} />
          <Select label="Category" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} options={[{ value: '', label: 'None' }, ...categories.filter(c => !c.archived).map(c => ({ value: c.id, label: c.name }))]} />
          <Select label="Supplier" value={form.preferredSupplierId} onChange={e => setForm(p => ({ ...p, preferredSupplierId: e.target.value }))} options={[{ value: '', label: 'None' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
          <Input label="Order URL" value={form.preferredOrderUrl} onChange={e => setForm(p => ({ ...p, preferredOrderUrl: e.target.value }))} placeholder="https://..." />
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={saveItem}>{editCatId ? 'Save' : 'Add'}</Button></div>
        </div>
      </Modal>

      <Modal open={!!showInv} onClose={() => setShowInv(null)} title="Inventory">
        <div className={styles.modalForm}>
          <Input label="Current Quantity" type="number" value={String(invForm.currentQty)} onChange={e => setInvForm(p => ({ ...p, currentQty: parseInt(e.target.value) || 0 }))} />
          <Input label="Minimum Quantity" type="number" value={String(invForm.minQty)} onChange={e => setInvForm(p => ({ ...p, minQty: parseInt(e.target.value) || 0 }))} />
          <Input label="Target Quantity" type="number" value={String(invForm.targetQty)} onChange={e => setInvForm(p => ({ ...p, targetQty: parseInt(e.target.value) || 0 }))} />
          <Input label="Reorder Quantity" type="number" value={String(invForm.reorderQty)} onChange={e => setInvForm(p => ({ ...p, reorderQty: parseInt(e.target.value) || 0 }))} />
          <Select label="Office" value={invForm.office} onChange={e => setInvForm(p => ({ ...p, office: e.target.value }))} options={offices.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))} />
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setShowInv(null)}>Cancel</Button><Button onClick={saveInv}>Save</Button></div>
        </div>
      </Modal>
    </div>
  );
}
