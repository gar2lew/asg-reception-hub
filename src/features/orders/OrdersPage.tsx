import { useCallback, useEffect, useState } from 'react';
import { Eye, Plus, Send, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Card } from '../../components/Card/Card';
import { Input } from '../../components/Input/Input';
import { Modal } from '../../components/Modal/Modal';
import { Select } from '../../components/Select/Select';
import type { OrderLineItem, StockCatalogueItem, StockOrder, Supplier } from '../../models';
import { getSession } from '../../services/authService';
import { cancelOrder, createOrderDraft, submitOrder, type DraftLine } from '../../services/stockOrderActions';
import { loadOrderLines, loadOrderReferenceData, loadOrders } from '../../services/stockOrderReads';
import styles from '../admin/AdminPage.module.css';

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', requested: 'Requested', approved: 'Approved', rejected: 'Rejected', ordered: 'Ordered', 'partially-received': 'Partial', received: 'Received', cancelled: 'Cancelled' };
const STATUS_VAR: Record<string, 'default' | 'info' | 'success' | 'danger' | 'warning'> = { draft: 'default', requested: 'info', approved: 'success', rejected: 'danger', ordered: 'warning', 'partially-received': 'info', received: 'success', cancelled: 'default' };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'The order request could not be completed.';
}

export function OrdersPage() {
  const session = getSession();
  const uid = session?.staffId ?? '';
  const office = session?.location ?? '';
  const role = session?.role ?? '';
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [orderLines, setOrderLines] = useState<Record<string, OrderLineItem[]>>({});
  const [items, setItems] = useState<StockCatalogueItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(0);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError('');
    try {
      const [loadedOrders, referenceData] = await Promise.all([
        loadOrders({ role, location: office }),
        loadOrderReferenceData(),
      ]);
      const entries = await Promise.all(loadedOrders.map(async order => [order.id, await loadOrderLines(order.id)] as const));
      setOrders(loadedOrders);
      setOrderLines(Object.fromEntries(entries));
      setItems(referenceData.items);
      setSuppliers(referenceData.suppliers);
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  }, [office, role, uid]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addLine = () => {
    const item = items.find(candidate => candidate.id === selectedItem);
    if (!item || selectedQuantity <= 0 || lines.some(line => line.stockItemId === item.id)) return;
    setLines(previous => [...previous, {
      stockItemId: item.id,
      itemName: item.itemName,
      unitLabel: item.unitLabel,
      quantityRequested: selectedQuantity,
    }]);
    setSelectedItem('');
    setSelectedQuantity(0);
  };

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await refresh();
    } catch (actionError) {
      setError(errorText(actionError));
    } finally {
      setBusy(false);
    }
  };

  const createAndSubmit = async () => {
    if (!office || !uid || lines.length === 0) return;
    setBusy(true);
    setError('');
    let draftId: string | null = null;
    let failureMessage = '';
    try {
      const draft = await createOrderDraft({ office, requestedBy: uid, supplierId: supplierId || undefined, notes: notes || undefined, lines });
      draftId = draft.id;
      await submitOrder({ orderId: draft.id, supplierId: supplierId || undefined, notes: notes || undefined, requestedBy: uid, lines });
      setShowCreate(false);
      setLines([]);
      setSupplierId('');
      setNotes('');
    } catch (submitError) {
      let cleanupFailed = false;
      if (draftId) {
        try {
          await cancelOrder({ orderId: draftId, reason: 'Automatic cleanup after submit failure' });
        } catch {
          cleanupFailed = true;
          failureMessage = `${errorText(submitError)} Draft ${draftId.slice(0, 8)} remains available to cancel from the order list.`;
        }
      }
      if (!cleanupFailed) failureMessage = errorText(submitError);
    } finally {
      await refresh();
      if (failureMessage) setError(failureMessage);
      setBusy(false);
    }
  };

  const submitSavedDraft = (order: StockOrder) => runAction(() => submitOrder({
    orderId: order.id,
    supplierId: order.supplierId,
    notes: order.notes,
    requestedBy: uid,
    lines: (orderLines[order.id] ?? []).map(line => ({
      stockItemId: line.stockItemId,
      itemName: line.itemName,
      unitLabel: line.unitLabel,
      quantityRequested: line.quantityRequested,
    })),
  }));

  const selectedOrder = orders.find(order => order.id === showDetail);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Stock Orders</h1>
        <Button size="sm" onClick={() => { setLines([]); setSupplierId(''); setNotes(''); setShowCreate(true); }}><Plus size={14} /> New Order</Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p>Loading orders...</p> : <Card><div className={styles.table}>
        <div className={`${styles.tableRow} ${styles.tableHeader}`}><span>ID</span><span>Status</span><span>Office</span><span>Items</span><span>Created</span><span>Actions</span></div>
        {orders.map(order => <div key={order.id} className={styles.tableRow}>
          <span style={{ fontSize: 12 }}>{order.id.slice(0, 8)}</span>
          <span><Badge variant={STATUS_VAR[order.status] ?? 'default'}>{STATUS_LABEL[order.status] ?? order.status}</Badge></span>
          <span>{order.office}</span><span>{orderLines[order.id]?.length ?? 0} lines</span>
          <span style={{ fontSize: 12 }}>{new Date(order.createdAt).toLocaleDateString()}</span>
          <span className={styles.actionCell}>
            <Button aria-label={`View order ${order.id}`} variant="ghost" size="sm" onClick={() => setShowDetail(order.id)}><Eye size={14} /></Button>
            {order.status === 'draft' && order.requestedBy === uid && (orderLines[order.id]?.length ?? 0) > 0 && <Button aria-label={`Submit order ${order.id}`} variant="ghost" size="sm" disabled={busy} onClick={() => void submitSavedDraft(order)}><Send size={14} /></Button>}
            {order.status === 'draft' && order.requestedBy === uid && <Button aria-label={`Cancel order ${order.id}`} variant="ghost" size="sm" disabled={busy} onClick={() => void runAction(() => cancelOrder({ orderId: order.id }))}><X size={14} /></Button>}
          </span>
        </div>)}
      </div></Card>}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Stock Order" width="600px">
        <div className={styles.modalForm}>
          <Select label="Supplier" value={supplierId} onChange={event => setSupplierId(event.target.value)} options={[{ value: '', label: 'None' }, ...suppliers.map(supplier => ({ value: supplier.id, label: supplier.name }))]} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <Select label="Add Item" value={selectedItem} onChange={event => setSelectedItem(event.target.value)} options={[{ value: '', label: 'Select...' }, ...items.map(item => ({ value: item.id, label: item.itemName }))]} style={{ flex: 1 }} />
            <Input label="Qty" type="number" value={String(selectedQuantity)} onChange={event => setSelectedQuantity(Number.parseInt(event.target.value, 10) || 0)} style={{ width: 80 }} />
            <Button size="sm" onClick={addLine}>Add</Button>
          </div>
          {lines.map(line => <div key={line.stockItemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid #ede5d8' }}>
            <span>{line.itemName} × {line.quantityRequested}</span>
            <button aria-label={`Remove ${line.itemName}`} onClick={() => setLines(previous => previous.filter(candidate => candidate.stockItemId !== line.stockItemId))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b33c2f' }}><Trash2 size={14} /></button>
          </div>)}
          <Input label="Notes" value={notes} onChange={event => setNotes(event.target.value)} />
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => void createAndSubmit()} disabled={busy || lines.length === 0}>{busy ? 'Submitting...' : 'Submit Order'}</Button></div>
        </div>
      </Modal>

      <Modal open={Boolean(selectedOrder)} onClose={() => setShowDetail(null)} title="Order Detail" width="600px">
        {selectedOrder && <div className={styles.modalForm}>
          <div><strong>Status:</strong> <Badge variant={STATUS_VAR[selectedOrder.status] ?? 'default'}>{STATUS_LABEL[selectedOrder.status] ?? selectedOrder.status}</Badge></div>
          <div><strong>Office:</strong> {selectedOrder.office}</div>
          {(orderLines[selectedOrder.id] ?? []).map(line => <div key={line.id}><strong>{line.itemName}</strong> — Requested: {line.quantityRequested} {line.unitLabel}</div>)}
        </div>}
      </Modal>
    </div>
  );
}
