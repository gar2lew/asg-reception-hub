import { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle, Eye, Send, Truck, XCircle } from 'lucide-react';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Input } from '../../components/Input/Input';
import { Modal } from '../../components/Modal/Modal';
import type { OrderLineItem, StockInventory, StockOrder } from '../../models';
import { getSession } from '../../services/authService';
import { approveOrder, cancelOrder, markOrderOrdered, receiveOrder, rejectOrder } from '../../services/stockOrderActions';
import { loadInventory, loadOrderLines, loadOrders } from '../../services/stockOrderReads';
import styles from './AdminPage.module.css';

type OrderAction = '' | 'approve' | 'reject' | 'order' | 'receive' | 'cancel';
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', requested: 'Requested', approved: 'Approved', rejected: 'Rejected', ordered: 'Ordered', 'partially-received': 'Partial', received: 'Received', cancelled: 'Cancelled' };
const STATUS_VAR: Record<string, 'default' | 'info' | 'success' | 'danger' | 'warning'> = { draft: 'default', requested: 'info', approved: 'success', rejected: 'danger', ordered: 'warning', 'partially-received': 'info', received: 'success', cancelled: 'default' };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'The order action could not be completed.';
}

export function AdminOrdersSection() {
  const session = getSession();
  const actor = { uid: session?.staffId ?? '', name: session?.name ?? 'Administrator', role: session?.role ?? 'admin' };
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [linesByOrder, setLinesByOrder] = useState<Record<string, OrderLineItem[]>>({});
  const [inventory, setInventory] = useState<StockInventory[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [action, setAction] = useState<OrderAction>('');
  const [reason, setReason] = useState('');
  const [approvedLines, setApprovedLines] = useState<Record<string, number>>({});
  const [receiveLines, setReceiveLines] = useState<Record<string, number>>({});
  const [deliveryReference, setDeliveryReference] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedOrders, loadedInventory] = await Promise.all([
        loadOrders({ role: 'admin', location: session?.location }),
        loadInventory({ role: 'admin', location: session?.location }),
      ]);
      const lineEntries = await Promise.all(loadedOrders.map(async order => [order.id, await loadOrderLines(order.id)] as const));
      setOrders(loadedOrders);
      setInventory(loadedInventory);
      setLinesByOrder(Object.fromEntries(lineEntries));
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
    }
  }, [session?.location]);

  useEffect(() => { void refresh(); }, [refresh]);

  const closeAction = () => {
    setSelected(null);
    setAction('');
    setReason('');
    setApprovedLines({});
    setReceiveLines({});
    setDeliveryReference('');
    setExpectedDeliveryDate('');
  };

  const runAction = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await operation();
      closeAction();
      await refresh();
    } catch (actionError) {
      setError(errorText(actionError));
    } finally {
      setBusy(false);
    }
  };

  const selectedLines = selected ? linesByOrder[selected] ?? [] : [];
  const selectedOrder = orders.find(order => order.id === selected);

  const renderLines = (order: StockOrder) => (linesByOrder[order.id] ?? []).map(line => {
    const current = inventory.find(candidate => candidate.stockItemId === line.stockItemId && candidate.office === order.office);
    const ordered = line.quantityOrdered ?? line.quantityApproved ?? line.quantityRequested;
    const remaining = Math.max(0, ordered - line.quantityReceived);
    return <div key={line.id} style={{ borderBottom: '1px solid #ede5d8', padding: '8px 0', fontSize: 13 }}>
      <strong>{line.itemName}</strong> ({line.unitLabel})
      <div style={{ color: '#746f67', fontSize: 12 }}>Current: {current?.currentQuantity ?? '—'} | Requested: {line.quantityRequested} | Approved: {line.quantityApproved ?? '—'} | Ordered: {line.quantityOrdered ?? '—'} | Received: {line.quantityReceived} | Remaining: {remaining}</div>
      {action === 'approve' && <Input label={`Approved qty for ${line.itemName}`} type="number" value={String(approvedLines[line.id] ?? line.quantityRequested)} onChange={event => setApprovedLines(previous => ({ ...previous, [line.id]: Number.parseInt(event.target.value, 10) || 0 }))} />}
      {action === 'receive' && <Input label={`Receive qty for ${line.itemName}`} type="number" value={String(receiveLines[line.id] ?? '')} onChange={event => setReceiveLines(previous => ({ ...previous, [line.id]: Number.parseInt(event.target.value, 10) || 0 }))} />}
    </div>;
  });

  return <Card>
    <CardHeader><CardTitle>Stock Orders ({orders.length})</CardTitle></CardHeader>
    {error && <p role="alert">{error}</p>}
    {loading ? <p>Loading orders...</p> : <div className={styles.table}>
      <div className={`${styles.tableRow} ${styles.tableHeader}`}><span>ID</span><span>Status</span><span>Office</span><span>Items</span><span>Created</span><span>Actions</span></div>
      {orders.map(order => <div key={order.id} className={styles.tableRow}>
        <span style={{ fontSize: 12 }}>{order.id.slice(0, 8)}</span>
        <span><Badge variant={STATUS_VAR[order.status] ?? 'default'}>{STATUS_LABEL[order.status] ?? order.status}</Badge></span>
        <span>{order.office}</span><span>{linesByOrder[order.id]?.length ?? 0}</span>
        <span style={{ fontSize: 12 }}>{new Date(order.createdAt).toLocaleDateString()}</span>
        <span className={styles.actionCell}>
          <Button aria-label={`View order ${order.id}`} variant="ghost" size="sm" onClick={() => { setSelected(order.id); setAction(''); }}><Eye size={14} /></Button>
          {order.status === 'requested' && <Button aria-label={`Approve order ${order.id}`} variant="ghost" size="sm" onClick={() => { setSelected(order.id); setAction('approve'); }}><CheckCircle size={14} /></Button>}
          {order.status === 'requested' && <Button aria-label={`Reject order ${order.id}`} variant="ghost" size="sm" onClick={() => { setSelected(order.id); setAction('reject'); }}><XCircle size={14} /></Button>}
          {order.status === 'approved' && <Button aria-label={`Mark order ${order.id} ordered`} variant="ghost" size="sm" onClick={() => { setSelected(order.id); setAction('order'); }}><Truck size={14} /></Button>}
          {(order.status === 'ordered' || order.status === 'partially-received') && <Button aria-label={`Receive order ${order.id}`} variant="ghost" size="sm" onClick={() => { setSelected(order.id); setAction('receive'); }}><Send size={14} /></Button>}
          {['draft', 'requested', 'approved', 'ordered'].includes(order.status) && <Button aria-label={`Cancel order ${order.id}`} variant="ghost" size="sm" onClick={() => { setSelected(order.id); setAction('cancel'); }}><Ban size={14} /></Button>}
        </span>
      </div>)}
    </div>}

    <Modal open={Boolean(selectedOrder) && action === ''} onClose={closeAction} title="Order Detail" width="600px">
      {selectedOrder && <div className={styles.modalForm}><div><strong>Status:</strong> {STATUS_LABEL[selectedOrder.status]}</div>{renderLines(selectedOrder)}</div>}
    </Modal>
    <Modal open={action === 'approve'} onClose={closeAction} title="Approve Order" width="600px">
      {selectedOrder && <div className={styles.modalForm}>{renderLines(selectedOrder)}<Input label="Approval reason" value={reason} onChange={event => setReason(event.target.value)} /><div className={styles.modalActions}><Button variant="secondary" onClick={closeAction}>Cancel</Button><Button disabled={busy || !reason.trim()} onClick={() => void runAction(() => approveOrder({ orderId: selectedOrder.id, reason, lineApprovals: selectedLines.map(line => ({ stockItemId: line.stockItemId, quantityApproved: approvedLines[line.id] ?? line.quantityRequested })), localActor: actor }))}>{busy ? 'Working...' : 'Approve'}</Button></div></div>}
    </Modal>
    <Modal open={action === 'reject'} onClose={closeAction} title="Reject Order">
      {selectedOrder && <div className={styles.modalForm}><Input label="Rejection reason" value={reason} onChange={event => setReason(event.target.value)} /><div className={styles.modalActions}><Button variant="secondary" onClick={closeAction}>Cancel</Button><Button variant="danger" disabled={busy || !reason.trim()} onClick={() => void runAction(() => rejectOrder({ orderId: selectedOrder.id, reason }))}>{busy ? 'Working...' : 'Reject'}</Button></div></div>}
    </Modal>
    <Modal open={action === 'order'} onClose={closeAction} title="Mark as Ordered">
      {selectedOrder && <div className={styles.modalForm}><Input label="Supplier reference" value={reason} onChange={event => setReason(event.target.value)} /><Input label="Expected delivery date" type="date" value={expectedDeliveryDate} onChange={event => setExpectedDeliveryDate(event.target.value)} /><div className={styles.modalActions}><Button variant="secondary" onClick={closeAction}>Cancel</Button><Button disabled={busy || !expectedDeliveryDate} onClick={() => void runAction(() => markOrderOrdered({ orderId: selectedOrder.id, supplierReference: reason || undefined, expectedDeliveryDate, localActor: actor }))}>{busy ? 'Working...' : 'Mark Ordered'}</Button></div></div>}
    </Modal>
    <Modal open={action === 'receive'} onClose={closeAction} title="Receive Stock" width="600px">
      {selectedOrder && <div className={styles.modalForm}>{renderLines(selectedOrder)}<Input label="Delivery reference" value={deliveryReference} onChange={event => setDeliveryReference(event.target.value)} /><Input label="Receiving notes" value={reason} onChange={event => setReason(event.target.value)} /><div className={styles.modalActions}><Button variant="secondary" onClick={closeAction}>Cancel</Button><Button disabled={busy || !selectedLines.some(line => (receiveLines[line.id] ?? 0) > 0)} onClick={() => void runAction(() => receiveOrder({ orderId: selectedOrder.id, receipts: selectedLines.filter(line => (receiveLines[line.id] ?? 0) > 0).map(line => ({ stockItemId: line.stockItemId, quantity: receiveLines[line.id] })), deliveryReference: deliveryReference || undefined, notes: reason || undefined, localActor: actor }))}>{busy ? 'Working...' : 'Receive'}</Button></div></div>}
    </Modal>
    <Modal open={action === 'cancel'} onClose={closeAction} title="Cancel Order">
      {selectedOrder && <div className={styles.modalForm}><Input label="Cancellation reason" value={reason} onChange={event => setReason(event.target.value)} /><div className={styles.modalActions}><Button variant="secondary" onClick={closeAction}>Back</Button><Button variant="danger" disabled={busy || (selectedOrder.status !== 'draft' && !reason.trim())} onClick={() => void runAction(() => cancelOrder({ orderId: selectedOrder.id, reason: reason || undefined }))}>{busy ? 'Working...' : 'Cancel Order'}</Button></div></div>}
    </Modal>
  </Card>;
}
