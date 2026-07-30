import { useState } from "react";
import { Card, CardHeader, CardTitle } from "../../components/Card/Card";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { Modal } from "../../components/Modal/Modal";
import { Badge } from "../../components/Badge/Badge";
import { StockCategoryRepository } from "../../repositories/localStorage/StockCategoryRepository";
import { StockCatalogueRepository } from "../../repositories/localStorage/StockCatalogueRepository";
import { nowISO } from "../../utils/date";
import type { StockCategory } from "../../models";
import styles from "./AdminPage.module.css";

const catRepo = new StockCategoryRepository();
const catalogueRepo = new StockCatalogueRepository();

export function CategoriesSection() {
  const [, refresh] = useState(0);
  const [modal, setModal] = useState<{ type: string; id?: string } | null>(null);
  const [name, setName] = useState("");
  const forceRefresh = () => refresh(n => n + 1);
  const all = catRepo.getAll();

  const save = () => {
    if (!name.trim()) return;
    if (modal?.id) { catRepo.update(modal.id, { name: name.trim() }); }
    else { catRepo.create({ name: name.trim() }); }
    setModal(null); setName(""); forceRefresh();
  };
  const archive = (id: string) => {
    const items = catalogueRepo.getAll().filter(c => c.categoryId === id && c.active);
    if (items.length > 0 && !confirm(`This category has ${items.length} active items. Archive anyway?`)) return;
    catRepo.archive(id); forceRefresh();
  };
  const restore = (id: string) => { catRepo.update(id, { archived: false }); forceRefresh(); };

  return (<Card><CardHeader><CardTitle>Stock Categories ({all.length}) <Button variant="ghost" size="sm" onClick={() => { setName(""); setModal({ type: "cat" }); }}>+ Add</Button></CardTitle></CardHeader>
    <div className={styles.table}><div className={`${styles.tableRow} ${styles.tableHeader}`}><span>Name</span><span>Order</span><span>Items</span><span>Status</span><span>Actions</span></div>
      {all.sort((a, b) => a.order - b.order).map(c => (<div key={c.id} className={styles.tableRow}>
        <span>{c.name}</span><span>{c.order}</span><span>{catalogueRepo.getAll().filter(i => i.categoryId === c.id).length}</span>
        <span>{c.archived ? <Badge>Archived</Badge> : <Badge variant="success">Active</Badge>}</span>
        <span className={styles.actionCell}>
          <Button variant="ghost" size="sm" onClick={() => { setName(c.name); setModal({ type: "cat", id: c.id }); }}>Edit</Button>
          {!c.archived ? <Button variant="ghost" size="sm" onClick={() => archive(c.id)}>Archive</Button>
            : <Button variant="ghost" size="sm" onClick={() => restore(c.id)}>Restore</Button>}
        </span>
      </div>))}
    </div>
    <Modal open={modal?.type === "cat"} onClose={() => setModal(null)} title={modal?.id ? "Edit Category" : "Add Category"}>
      <div className={styles.modalForm}><Input label="Name" value={name} onChange={e => setName(e.target.value)} required /><div className={styles.modalActions}><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button onClick={save}>{modal?.id ? "Save" : "Add"}</Button></div></div>
    </Modal>
  </Card>);
}
