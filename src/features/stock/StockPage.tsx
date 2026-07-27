import { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { Card } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { StockRepository } from '../../repositories/localStorage/StockRepository';
import { getSession } from '../../services/authService';
import styles from './StockPage.module.css';
const repo = new StockRepository();
export function StockPage() {
  const session = getSession();
  const [, refresh] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updateQty, setUpdateQty] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const forceRefresh = () => refresh(n => n + 1);
  const allItems = repo.getAll();
  const filtered = search ? allItems.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())) : allItems;
  const selected = selectedId ? repo.getById(selectedId) : null;
  const categories = [...new Set(allItems.map(s => s.category))];
  const [catFilter, setCatFilter] = useState('');
  const displayed = catFilter ? filtered.filter(s => s.category === catFilter) : filtered;
  const updateQuantity = () => {
    if (selectedId && updateQty) {
      repo.update(selectedId, { currentQuantity: parseInt(updateQty), updatedBy: session?.name });
      setSelectedId(null); setUpdateQty(''); forceRefresh();
    }
  };
  const recordOrder = () => {
    if (selectedId && orderQty) {
      repo.recordOrder(selectedId, parseInt(orderQty), session?.name || 'Unknown');
      setSelectedId(null); setOrderQty(''); forceRefresh();
    }
  };
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Stock Register</h1>
        <div className={styles.filters}>
          <Input placeholder="Search stock..." value={search} onChange={e => setSearch(e.target.value)}
            className={styles.searchInput} aria-label="Search stock" />
          <select className={styles.catSelect} value={catFilter} onChange={e => setCatFilter(e.target.value)} aria-label="Filter by category">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <Card>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span className={styles.colName}>Item</span>
            <span className={styles.colQty}>Qty</span>
            <span className={styles.colMin}>Min</span>
            <span className={styles.colSupplier}>Supplier</span>
            <span className={styles.colLast}>Last Ordered</span>
            <span className={styles.colActions}>Actions</span>
          </div>
          {displayed.map(item => (
            <div key={item.id} className={styles.tableRow}>
              <span className={styles.colName}>
                <Package size={14} className={styles.rowIcon} />
                <span>{item.name}</span>
                {item.currentQuantity <= item.minimumQuantity && <Badge variant="warning">Low</Badge>}
              </span>
              <span className={styles.colQty}>{item.currentQuantity} {item.unit}</span>
              <span className={styles.colMin}>{item.minimumQuantity}</span>
              <span className={styles.colSupplier}>{item.supplier || '—'}</span>
              <span className={styles.colLast}>{item.lastOrderedDate || 'Never'}</span>
              <span className={styles.colActions}>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedId(item.id); setUpdateQty(String(item.currentQuantity)); }}>Update</Button>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedId(item.id); setOrderQty(''); }}>Order</Button>
                {item.orderUrl && <a href={item.orderUrl} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm">Buy</Button></a>}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Modal open={!!selectedId && !!updateQty && !orderQty} onClose={() => { setSelectedId(null); setUpdateQty(''); setOrderQty(''); }} title={`Update ${selected?.name || ''}`}>
        <div className={styles.modalForm}>
          <Input label="Current Quantity" type="number" value={updateQty} onChange={e => setUpdateQty(e.target.value)} />
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => { setSelectedId(null); setUpdateQty(''); }}>Cancel</Button><Button onClick={updateQuantity}>Save</Button></div>
        </div>
      </Modal>
      <Modal open={!!selectedId && !updateQty && !!orderQty !== false} onClose={() => { setSelectedId(null); setUpdateQty(''); setOrderQty(''); }} title={`Record Order — ${selected?.name || ''}`} width="400px">
        {(!!selectedId && orderQty === '') && (
          <div className={styles.modalForm}>
            <Input label="Quantity Ordered" type="number" value={orderQty} onChange={e => setOrderQty(e.target.value)} />
            <div className={styles.modalActions}><Button variant="secondary" onClick={() => { setSelectedId(null); setOrderQty(''); }}>Cancel</Button><Button onClick={recordOrder}><ShoppingCart size={14} /> Record Order</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
