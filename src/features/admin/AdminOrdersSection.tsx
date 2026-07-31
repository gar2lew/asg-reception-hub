import { useState } from "react";
import { Eye, CheckCircle, XCircle, Send, Truck } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../../components/Card/Card";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { Modal } from "../../components/Modal/Modal";
import { StockOrderRepository } from "../../repositories/localStorage/StockOrderRepository";
import { OrderLineItemRepository } from "../../repositories/localStorage/OrderLineItemRepository";
import { SupplierRepository } from "../../repositories/localStorage/SupplierRepository";
import { StockCatalogueRepository } from "../../repositories/localStorage/StockCatalogueRepository";
import { StockInventoryRepository } from "../../repositories/localStorage/StockInventoryRepository";
import { applyMovement } from "../../services/stockMovementService";
import { nowISO } from "../../utils/date";
import styles from "./AdminPage.module.css";

const orderRepo = new StockOrderRepository();
const lineRepo = new OrderLineItemRepository();
const suppRepo = new SupplierRepository();
const catRepo = new StockCatalogueRepository();
const invRepo = new StockInventoryRepository();

const STATUS_LABEL: Record<string, string> = { draft: "Draft", requested: "Requested", approved: "Approved", rejected: "Rejected", ordered: "Ordered", "partially-received": "Partial", received: "Received", cancelled: "Cancelled" };
const STATUS_VAR: Record<string, any> = { draft: "default", requested: "info", approved: "success", rejected: "danger", ordered: "warning", "partially-received": "info", received: "success", cancelled: "default" };

export function AdminOrdersSection() {
  const [, refresh] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [approvedLines, setApprovedLines] = useState<Record<string, number>>({});
  const [receiveLines, setReceiveLines] = useState<Record<string, number>>({});
  const [deliveryRef, setDeliveryRef] = useState("");
  const force = () => refresh(n => n + 1);
  const orders = orderRepo.getAll();
  const actor = { uid: "admin-local", name: "Administrator", role: "admin" };

  const doApprove = () => {
    if (!selected || !reason.trim()) return;
    const order = orderRepo.getById(selected);
    if (!order) return;
    orderRepo.update(selected, { status: "approved", approvedBy: actor.uid, approvedAt: nowISO(), notes: reason.trim() });
    for (const line of lineRepo.getByOrder(selected)) {
      const q = approvedLines[line.id];
      if (q != null && q >= 0) lineRepo.update(line.id, { quantityApproved: q });
    }
    setAction(""); setReason(""); setSelected(null); force();
  };
  const doReject = () => {
    if (!selected || !reason.trim()) return;
    orderRepo.update(selected, { status: "rejected", notes: reason.trim() }); setAction(""); setReason(""); setSelected(null); force();
  };
  const doOrder = () => {
    if (!selected) return;
    const order = orderRepo.getById(selected);
    if (!order) return;
    orderRepo.update(selected, { status: "ordered", orderedBy: actor.uid, orderedAt: nowISO(), supplierReference: reason || undefined });
    for (const line of lineRepo.getByOrder(selected)) {
      lineRepo.update(line.id, { quantityOrdered: line.quantityApproved ?? line.quantityRequested });
    }
    setAction(""); setReason(""); setSelected(null); force();
  };
  const doReceive = () => {
    if (!selected) return;
    const order = orderRepo.getById(selected);
    if (!order) return;
    for (const line of lineRepo.getByOrder(selected)) {
      const qty = receiveLines[line.id];
      if (qty == null || qty <= 0) continue;
      const inv = invRepo.getByItem(line.stockItemId).find(i => i.office === order.office);
      if (!inv) continue;
      const orderedQty = line.quantityOrdered ?? line.quantityApproved ?? line.quantityRequested;
      const remaining = orderedQty - line.quantityReceived;
      if (qty > remaining) continue; // over-receipt guard
      applyMovement(inv.id, "received-order", qty, `Received from order ${order.id}`, actor, deliveryRef || undefined);
      lineRepo.update(line.id, { quantityReceived: line.quantityReceived + qty });
    }
    const allLines = lineRepo.getByOrder(selected);
    const allDone = allLines.every(l => (l.quantityOrdered ?? l.quantityApproved ?? l.quantityRequested) <= l.quantityReceived);
    const anyDone = allLines.some(l => l.quantityReceived > 0);
    orderRepo.update(selected, { status: allDone ? "received" : anyDone ? "partially-received" : order.status });
    setAction(""); setDeliveryRef(""); setReceiveLines({}); setSelected(null); force();
  };
  const doCancel = () => {
    if (!selected) return;
    orderRepo.update(selected, { status: "cancelled", notes: reason.trim() || undefined }); setAction(""); setReason(""); setSelected(null); force();
  };

  const renderLines = (orderId: string) => lineRepo.getByOrder(orderId).map(l => {
    const item = catRepo.getById(l.stockItemId);
    const inv = item ? invRepo.getByItem(item.id).find(i => i.office === (orderRepo.getById(orderId)?.office || "")) : undefined;
    const orderedQty = l.quantityOrdered ?? l.quantityApproved ?? l.quantityRequested;
    const remaining = Math.max(0, orderedQty - l.quantityReceived);
    return <div key={l.id} style={{ borderBottom: "1px solid #ede5d8", padding: "8px 0", fontSize: 13 }}>
      <strong>{l.itemName}</strong> ({l.unitLabel})
      <div style={{ color: "#746f67", fontSize: 12 }}>Current: {inv?.currentQuantity ?? "—"} | Min: {inv?.minimumQuantity ?? "—"} | Requested: {l.quantityRequested} | Approved: {l.quantityApproved ?? "—"} | Ordered: {l.quantityOrdered ?? "—"} | Received: {l.quantityReceived} | Remaining: {remaining}</div>
      {action === "approve" && <Input label="Approved qty" type="number" value={String(approvedLines[l.id] ?? "")} onChange={e => setApprovedLines(p => ({ ...p, [l.id]: parseInt(e.target.value) || 0 }))} />}
      {action === "receive" && <Input label="Receive qty" type="number" value={String(receiveLines[l.id] ?? "")} onChange={e => setReceiveLines(p => ({ ...p, [l.id]: parseInt(e.target.value) || 0 }))} />}
    </div>;
  });

  return (<Card><CardHeader><CardTitle>Stock Orders ({orders.length})</CardTitle></CardHeader>
    <div className={styles.table}><div className={`${styles.tableRow} ${styles.tableHeader}`}><span>ID</span><span>Status</span><span>Office</span><span>Items</span><span>Created</span><span>Actions</span></div>
      {orders.map(o => <div key={o.id} className={styles.tableRow}>
        <span style={{ fontSize: 12 }}>{o.id.slice(0, 8)}</span>
        <span><Badge variant={STATUS_VAR[o.status]}>{STATUS_LABEL[o.status]}</Badge></span>
        <span>{o.office}</span><span>{lineRepo.getByOrder(o.id).length}</span>
        <span style={{ fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString()}</span>
        <span className={styles.actionCell}>
          <Button variant="ghost" size="sm" onClick={() => { setSelected(o.id); setApprovedLines({}); setReceiveLines({}); setDeliveryRef(""); }}><Eye size={14} /></Button>
          {o.status === "requested" && <Button variant="ghost" size="sm" onClick={() => { setSelected(o.id); setAction("approve"); }}><CheckCircle size={14} /></Button>}
          {o.status === "requested" && <Button variant="ghost" size="sm" onClick={() => { setSelected(o.id); setAction("reject"); }}><XCircle size={14} /></Button>}
          {o.status === "approved" && <Button variant="ghost" size="sm" onClick={() => { setSelected(o.id); setAction("order"); }}><Truck size={14} /></Button>}
          {["ordered", "partially-received"].includes(o.status) && <Button variant="ghost" size="sm" onClick={() => { setSelected(o.id); setAction("receive"); }}><Send size={14} /></Button>}
        </span>
      </div>)}
    </div>

    <Modal open={!!selected && action === ""} onClose={() => setSelected(null)} title="Order Detail" width="600px">
      {selected && (() => { const o = orderRepo.getById(selected); return o && <div className={styles.modalForm}>
        <div style={{ fontSize: 13 }}><strong>Status:</strong> <Badge variant={STATUS_VAR[o.status]}>{STATUS_LABEL[o.status]}</Badge> | <strong>Office:</strong> {o.office}</div>
        {o.supplierId && <div style={{ fontSize: 13 }}><strong>Supplier:</strong> {suppRepo.getById(o.supplierId)?.name || "—"}</div>}
        {renderLines(selected)}
      </div>; })()}
    </Modal>

    <Modal open={action === "approve"} onClose={() => { setAction(""); setReason(""); }} title="Approve Order" width="600px">
      {selected && <div className={styles.modalForm}>{renderLines(selected)}
        <Input label="Approval reason" value={reason} onChange={e => setReason(e.target.value)} />
        <div className={styles.modalActions}><Button variant="secondary" onClick={() => setAction("")}>Cancel</Button><Button onClick={doApprove}>Approve</Button></div>
      </div>}
    </Modal>
    <Modal open={action === "reject"} onClose={() => { setAction(""); setReason(""); }} title="Reject Order">
      <div className={styles.modalForm}><Input label="Rejection reason (required)" value={reason} onChange={e => setReason(e.target.value)} />
        <div className={styles.modalActions}><Button variant="secondary" onClick={() => setAction("")}>Cancel</Button><Button variant="danger" onClick={doReject}>Reject</Button></div>
      </div>
    </Modal>
    <Modal open={action === "order"} onClose={() => { setAction(""); setReason(""); }} title="Mark as Ordered">
      <div className={styles.modalForm}><Input label="Supplier reference" value={reason} onChange={e => setReason(e.target.value)} />
        <div className={styles.modalActions}><Button variant="secondary" onClick={() => setAction("")}>Cancel</Button><Button onClick={doOrder}>Mark Ordered</Button></div>
      </div>
    </Modal>
    <Modal open={action === "receive"} onClose={() => { setAction(""); setReceiveLines({}); setDeliveryRef(""); }} title="Receive Stock" width="600px">
      {selected && <div className={styles.modalForm}>{renderLines(selected)}
        <Input label="Delivery reference" value={deliveryRef} onChange={e => setDeliveryRef(e.target.value)} />
        <div className={styles.modalActions}><Button variant="secondary" onClick={() => setAction("")}>Cancel</Button><Button onClick={doReceive}>Receive</Button></div>
      </div>}
    </Modal>
    <Modal open={action === "cancel"} onClose={() => { setAction(""); setReason(""); }} title="Cancel Order">
      <div className={styles.modalForm}><Input label="Reason" value={reason} onChange={e => setReason(e.target.value)} />
        <div className={styles.modalActions}><Button variant="secondary" onClick={() => setAction("")}>Cancel</Button><Button variant="danger" onClick={doCancel}>Cancel Order</Button></div>
      </div>
    </Modal>
  </Card>);
}
