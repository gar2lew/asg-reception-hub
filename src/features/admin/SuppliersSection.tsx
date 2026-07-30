import { useState } from "react";
import { Card, CardHeader, CardTitle } from "../../components/Card/Card";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { Select } from "../../components/Select/Select";
import { Modal } from "../../components/Modal/Modal";
import { Badge } from "../../components/Badge/Badge";
import { SupplierRepository } from "../../repositories/localStorage/SupplierRepository";
import { isValidUrl } from "../../utils/urlValidation";
import { nowISO } from "../../utils/date";
import styles from "./AdminPage.module.css";

const repo = new SupplierRepository();

export function SuppliersSection() {
  const [, refresh] = useState(0);
  const [modal, setModal] = useState<{ type: string; id?: string } | null>(null);
  const [f, setF] = useState({ name: "", contactName: "", phone: "", email: "", website: "", orderUrl: "", accountReference: "", notes: "", officeScope: "all" });
  const forceRefresh = () => refresh(n => n + 1);
  const all = repo.getAll();

  const save = () => {
    if (!f.name.trim()) return;
    const d = { name: f.name.trim(), contactName: f.contactName || undefined, phone: f.phone || undefined, email: f.email || undefined, website: f.website || undefined, orderUrl: f.orderUrl || undefined, accountReference: f.accountReference || undefined, notes: f.notes || undefined, officeScope: [f.officeScope] as ('brisbane'|'perth'|'all')[] };
    if (modal?.id) { repo.update(modal.id, d); } else { repo.create(d); }
    setModal(null); forceRefresh();
  };
  const archive = (id: string) => { repo.archive(id); forceRefresh(); };
  const restore = (id: string) => { repo.update(id, { active: true, archivedAt: undefined }); forceRefresh(); };

  return (<Card><CardHeader><CardTitle>Suppliers ({all.length}) <Button variant="ghost" size="sm" onClick={() => { setF({ name: "", contactName: "", phone: "", email: "", website: "", orderUrl: "", accountReference: "", notes: "", officeScope: "all" }); setModal({ type: "sup" }); }}>+ Add</Button></CardTitle></CardHeader>
    <div className={styles.table}><div className={`${styles.tableRow} ${styles.tableHeader}`}><span>Name</span><span>Contact</span><span>Phone</span><span>Status</span><span>Actions</span></div>
      {all.map(s => (<div key={s.id} className={styles.tableRow}>
        <span>{s.name}</span><span>{s.contactName || "—"}</span><span>{s.phone || "—"}</span>
        <span>{s.active ? <Badge variant="success">Active</Badge> : <Badge>Archived</Badge>}</span>
        <span className={styles.actionCell}>
          <Button variant="ghost" size="sm" onClick={() => { setF({ name: s.name, contactName: s.contactName || "", phone: s.phone || "", email: s.email || "", website: s.website || "", orderUrl: s.orderUrl || "", accountReference: s.accountReference || "", notes: s.notes || "", officeScope: s.officeScope[0] || "all" }); setModal({ type: "sup", id: s.id }); }}>Edit</Button>
          {s.active ? <Button variant="ghost" size="sm" onClick={() => archive(s.id)}>Archive</Button> : <Button variant="ghost" size="sm" onClick={() => restore(s.id)}>Restore</Button>}
        </span>
      </div>))}
    </div>
    <Modal open={modal?.type === "sup"} onClose={() => setModal(null)} title={modal?.id ? "Edit Supplier" : "Add Supplier"}>
      <div className={styles.modalForm}><Input label="Name" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required />
        <Input label="Contact" value={f.contactName} onChange={e => setF(p => ({ ...p, contactName: e.target.value }))} />
        <Input label="Phone" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} />
        <Input label="Email" type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} />
        <Input label="Website" value={f.website} onChange={e => setF(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
        <Input label="Order URL" value={f.orderUrl} onChange={e => setF(p => ({ ...p, orderUrl: e.target.value }))} />
        <Input label="Account Reference" value={f.accountReference} onChange={e => setF(p => ({ ...p, accountReference: e.target.value }))} />
        <Select label="Office Scope" value={f.officeScope} onChange={e => setF(p => ({ ...p, officeScope: e.target.value }))} options={[{ value: "all", label: "All" }, { value: "brisbane", label: "Brisbane" }, { value: "perth", label: "Perth" }]} />
        <Input label="Notes" value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
        <div className={styles.modalActions}><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>{modal?.id ? "Save" : "Add"}</Button></div>
      </div>
    </Modal>
  </Card>);
}
