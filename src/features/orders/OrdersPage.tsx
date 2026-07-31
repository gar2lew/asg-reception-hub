import { useState } from 'react';
import { Plus, Trash2, Send, X, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/Select/Select';
import { Modal } from '../../components/Modal/Modal';
import { getSession } from '../../services/authService';
import { StockOrderRepository } from '../../repositories/localStorage/StockOrderRepository';
import { OrderLineItemRepository } from '../../repositories/localStorage/OrderLineItemRepository';
import { StockCatalogueRepository } from '../../repositories/localStorage/StockCatalogueRepository';
import { StockInventoryRepository } from '../../repositories/localStorage/StockInventoryRepository';
import { SupplierRepository } from '../../repositories/localStorage/SupplierRepository';
import { localCreateDraft, localSubmitOrder } from '../../services/orderService';
import styles from '../admin/AdminPage.module.css';

const orderRepo = new StockOrderRepository();
const lineRepo = new OrderLineItemRepository();
const catRepo = new StockCatalogueRepository();
const invRepo = new StockInventoryRepository();
const suppRepo = new SupplierRepository();

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', requested: 'Requested', approved: 'Approved', rejected: 'Rejected', ordered: 'Ordered', 'partially-received': 'Partial', received: 'Received', cancelled: 'Cancelled' };
const STATUS_VAR: Record<string, any> = { draft: 'default', requested: 'info', approved: 'success', rejected: 'danger', ordered: 'warning', cancelled: 'default' };

export function OrdersPage() {
  const session = getSession(); const [, refresh] = useState(0);
  const [showCreate, setShowCreate] = useState(false); const [showDetail, setShowDetail] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState(''); const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ stockItemId: string; qty: number }[]>([]);
  const [selItem, setSelItem] = useState(''); const [selQty, setSelQty] = useState(0);
  const uid = session?.staffId || ''; const office = session?.location || 'brisbane'; const isAdmin = session?.role === 'admin';
  const force = () => refresh(n => n + 1);
  const orders = orderRepo.getAll().filter(o => isAdmin || o.office === office || o.requestedBy === uid);
  const items = catRepo.getActive(); const suppliers = suppRepo.getActive();

  const addLine = () => {
    if (!selItem || selQty <= 0) return;
    if (lines.find(l => l.stockItemId === selItem)) return;
    setLines([...lines, { stockItemId: selItem, qty: selQty }]); setSelItem(''); setSelQty(0);
  };
  const createDraft = () => {
    const draft = localCreateDraft(office, uid);
    // Copy lines to order line items
    for (const l of lines) {
      const item = catRepo.getById(l.stockItemId);
      if (item) lineRepo.create({ orderId: draft.id, stockItemId: l.stockItemId, itemName: item.itemName, unitLabel: item.unitLabel, quantityRequested: l.qty });
    }
    setShowCreate(false); setLines([]); force();
  };
  const submitDraft = (orderId: string) => {
    const order = orderRepo.getById(orderId);
    if (!order) return;
    const orderLines = lineRepo.getByOrder(orderId);
    localSubmitOrder(orderId, order.supplierId, orderLines.map(l => ({ stockItemId: l.stockItemId, itemName: l.itemName, unitLabel: l.unitLabel, quantityRequested: l.quantityRequested })), uid);
    force();
  };
  const cancelDraft = (orderId: string) => {
    const order = orderRepo.getById(orderId);
    if (order?.requestedBy !== uid && !isAdmin) return;
    orderRepo.update(orderId, { status: 'cancelled' }); force();
  };
  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>Stock Orders</h1><Button size="sm" onClick={() => { setLines([]); setSupplierId(""); setNotes(""); setShowCreate(true); }}><Plus size={14} /> New Order</Button></div>
      <Card><div className={styles.table}><div className={`${styles.tableRow} ${styles.tableHeader}`}><span>ID</span><span>Status</span><span>Office</span><span>Items</span><span>Created</span><span>Actions</span></div>
        {orders.map(o => {
          const orderLines = lineRepo.getByOrder(o.id);
          return <div key={o.id} className={styles.tableRow}>
            <span style={{ fontSize: 12 }}>{o.id.slice(0, 8)}</span>
            <span><Badge variant={STATUS_VAR[o.status] || "default"}>{STATUS_LABEL[o.status] || o.status}</Badge></span>
            <span>{o.office}</span><span>{orderLines.length} lines</span>
            <span style={{ fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString()}</span>
            <span className={styles.actionCell}>
              <Button variant="ghost" size="sm" onClick={() => setShowDetail(o.id)}><Eye size={14} /></Button>
              {o.status === "draft" && o.requestedBy === uid && <Button variant="ghost" size="sm" onClick={() => submitDraft(o.id)}><Send size={14} /></Button>}
              {o.status === "draft" && (o.requestedBy === uid || isAdmin) && <Button variant="ghost" size="sm" onClick={() => cancelDraft(o.id)}><X size={14} /></Button>}
            </span>
          </div>;
        })}
      </div></Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Order Draft" width="600px">
        <div className={styles.modalForm}>
          <Select label="Supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)} options={[{ value: "", label: "None" }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]} />
          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <Select label="Add Item" value={selItem} onChange={e => setSelItem(e.target.value)} options={[{ value: "", label: "Select..." }, ...items.map(i => ({ value: i.id, label: i.itemName }))]} style={{ flex: 1 }} />
            <Input label="Qty" type="number" value={String(selQty)} onChange={e => setSelQty(parseInt(e.target.value) || 0)} style={{ width: 80 }} />
            <Button size="sm" onClick={addLine}>Add</Button>
          </div>
          {lines.map((l, i) => {
            const item = catRepo.getById(l.stockItemId);
            return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid #ede5d8" }}>
              <span>{item?.itemName || l.stockItemId} x {l.qty}</span>
              <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} style={{ border: "none", background: "none", cursor: "pointer", color: "#b33c2f" }}><Trash2 size={14} /></button>
            </div>;
          })}
          <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={createDraft} disabled={lines.length === 0}>Create Draft</Button></div>
        </div>
      </Modal>

      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Order Detail" width="600px">
        {showDetail && (() => {
          const order = orderRepo.getById(showDetail);
          if (!order) return null;
          const orderLines = lineRepo.getByOrder(showDetail);
          return <div className={styles.modalForm}>
            <div style={{ fontSize: 13 }}><strong>Status:</strong> <Badge variant={STATUS_VAR[order.status]}>{STATUS_LABEL[order.status]}</Badge></div>
            <div style={{ fontSize: 13 }}><strong>Office:</strong> {order.office}</div>
            <div style={{ fontSize: 13 }}><strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}</div>
            {orderLines.map(l => <div key={l.id} style={{ borderBottom: "1px solid #ede5d8", padding: "6px 0", fontSize: 13 }}>
              <strong>{l.itemName}</strong> — Requested: {l.quantityRequested} {l.unitLabel}{l.quantityApproved != null ? ` | Approved: ${l.quantityApproved}` : ""}
            </div>)}
            {order.status === "draft" && order.requestedBy === uid && <Button onClick={() => { submitDraft(showDetail); setShowDetail(null); }}>Submit Request</Button>}
          </div>;
        })()}
      </Modal>
    </div>
  );
}
