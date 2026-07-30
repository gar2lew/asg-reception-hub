import { useState } from "react";
import { Search, Package } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../../components/Card/Card";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { Select } from "../../components/Select/Select";
import { Modal } from "../../components/Modal/Modal";
import { getSession } from "../../services/authService";
import { StockCatalogueRepository } from "../../repositories/localStorage/StockCatalogueRepository";
import { StockInventoryRepository } from "../../repositories/localStorage/StockInventoryRepository";
import { StockCategoryRepository } from "../../repositories/localStorage/StockCategoryRepository";
import { SupplierRepository } from "../../repositories/localStorage/SupplierRepository";
import { StockMovementRepository } from "../../repositories/localStorage/StockMovementRepository";
import { applyMovement, stocktakeAdjustment } from "../../services/stockMovementService";
import { stockStatus } from "../../models";
import { nowISO } from "../../utils/date";
import type { StockInventory } from "../../models";
import styles from "./StockPage.module.css";

const catRepo = new StockCatalogueRepository();
const invRepo = new StockInventoryRepository();
const catRepo2 = new StockCategoryRepository();
const suppRepo = new SupplierRepository();
const movRepo = new StockMovementRepository();

export function StockPage() {
  const session = getSession(); const [, refresh] = useState(0);
  const [search, setSearch] = useState(""); const [officeFilter, setOfficeFilter] = useState(""); const [catFilter, setCatFilter] = useState("");
  const [showInv, setShowInv] = useState<string | null>(null); const [showMov, setShowMov] = useState<string | null>(null);
  const [movType, setMovType] = useState(""); const [movInvId, setMovInvId] = useState(""); const [movQty, setMovQty] = useState(0);
  const [movObserved, setMovObserved] = useState(0); const [movReason, setMovReason] = useState(""); const [movIncrease, setMovIncrease] = useState(true);
  const [movError, setMovError] = useState("");
  const [invForm, setInvForm] = useState({ currentQty: 0, minQty: 0, targetQty: 0, reorderQty: 0, office: "brisbane" });
  const force = () => refresh(n => n + 1); const isAdmin = session?.role === "admin";

  const catalogue = isAdmin ? catRepo.getAll() : catRepo.getActive();
  const allInv = invRepo.getAll();
  const categories = catRepo2.getAll();
  const offices = ["brisbane", "perth", "all"];

  const getInv = (id: string): StockInventory | undefined => {
    if (officeFilter) return allInv.find(i => i.stockItemId === id && i.office === officeFilter);
    return allInv.find(i => i.stockItemId === id);
  };

  const filtered = catalogue.filter(c => {
    if (search && !c.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && c.categoryId !== catFilter) return false;
    return true;
  });

  const doMovement = () => {
    const actor = { uid: session?.staffId || "", name: session?.name || "", role: session?.role || "" };
    let r;
    if (movType === "consume") r = applyMovement(movInvId, "consumed", -Math.abs(movQty), movReason, actor);
    else if (movType === "damage") r = applyMovement(movInvId, "damaged", -Math.abs(movQty), movReason, actor);
    else if (movType === "adjust") r = applyMovement(movInvId, "manual-adjustment", movIncrease ? movQty : -movQty, movReason, actor);
    else if (movType === "stocktake") r = stocktakeAdjustment(movInvId, movObserved, movReason, actor);
    if (!r?.success) { setMovError(r?.error || "Failed"); return; }
    setMovType(""); setMovQty(0); setMovObserved(0); setMovReason(""); setMovIncrease(true); setMovError(""); force();
  };
  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>Stock Register</h1></div>
      <div className={styles.filters}>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} aria-label="Search" />
        <select className={styles.catSelect} value={officeFilter} onChange={e => setOfficeFilter(e.target.value)} aria-label="Office"><option value="">All</option>{offices.map(o => <option key={o} value={o}>{o}</option>)}</select>
        <select className={styles.catSelect} value={catFilter} onChange={e => setCatFilter(e.target.value)} aria-label="Category"><option value="">All</option>{categories.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <Card><div className={styles.table}><div className={`${styles.tableRow} ${styles.tableHeader}`}><span>Item</span><span>Unit</span><span>Qty</span><span>Status</span><span>Actions</span></div>
        {filtered.map(c => {
          const inv = getInv(c.id); const st = inv ? stockStatus(inv) : "healthy";
          const lbl: Record<string, string> = { out: "Out", low: "Low", healthy: "OK", over: "Over" };
          const v: Record<string, any> = { out: "danger", low: "warning", healthy: "success", over: "info" };
          return <div key={c.id} className={styles.tableRow}>
            <span><Package size={14} style={{ marginRight: 6, verticalAlign: "middle", color: "#c99a35" }} />{c.itemName}</span>
            <span>{c.unitLabel}</span><span>{inv ? inv.currentQuantity : "—"}</span>
            <span>{inv ? <Badge variant={v[st]}>{lbl[st]}</Badge> : <Badge>—</Badge>}</span>
            <span className={styles.actionCell}>
              {inv && <Button variant="ghost" size="sm" onClick={() => { setMovInvId(inv.id); setMovQty(0); setMovReason(""); setMovError(""); setMovType("consume"); }}>Consume</Button>}
              {inv && <Button variant="ghost" size="sm" onClick={() => { setMovInvId(inv.id); setMovQty(0); setMovReason(""); setMovError(""); setMovType("damage"); }}>Damage</Button>}
              {inv && <Button variant="ghost" size="sm" onClick={() => { setMovInvId(inv.id); setMovQty(0); setMovReason(""); setMovError(""); setMovType("adjust"); setMovIncrease(true); }}>Adjust</Button>}
              {inv && <Button variant="ghost" size="sm" onClick={() => { setMovInvId(inv.id); setMovObserved(inv.currentQuantity); setMovReason(""); setMovError(""); setMovType("stocktake"); }}>Stocktake</Button>}
              {inv && <Button variant="ghost" size="sm" onClick={() => { setShowMov(inv.id); }}>History</Button>}
            </span>
          </div>;
        })}
        {filtered.length === 0 && <p className={styles.empty}>No items match filters.</p>}
      </div></Card>

      {/* MOVEMENT HISTORY */}
      <Modal open={!!showMov} onClose={() => setShowMov(null)} title="Movement History" width="600px">
        {(!showMov || movRepo.getByInventory(showMov).length === 0) && <p className={styles.empty}>No movements.</p>}
        {showMov && movRepo.getByInventory(showMov).slice(0, 30).map(m => <div key={m.id} style={{ borderBottom: "1px solid #ede5d8", padding: "8px 0", fontSize: 13 }}>
          <strong>{m.movementType}</strong> <span style={{ color: m.quantityChange > 0 ? "#2d7d46" : "#b33c2f" }}>{m.quantityChange > 0 ? "+" : ""}{m.quantityChange}</span>
          <div style={{ color: "#746f67", fontSize: 12 }}>{m.reason} &mdash; {m.actorDisplayName} &mdash; {new Date(m.createdAt).toLocaleString()}</div>
        </div>)}
      </Modal>

      {/* CONSUME */}
      <Modal open={movType === "consume"} onClose={() => setMovType("")} title="Consume Stock">
        <div className={styles.modalForm}><Input label="Qty" type="number" value={String(movQty)} onChange={e => setMovQty(parseInt(e.target.value) || 0)} />
          <Input label="Reason" value={movReason} onChange={e => setMovReason(e.target.value)} />
          <div className={styles.modalActions}><Button onClick={() => setMovType("")}>Cancel</Button><Button onClick={doMovement}>Consume</Button></div>
          {movError && <p style={{ color: "#b33c2f", fontSize: 13 }}>{movError}</p>}
        </div>
      </Modal>

      {/* DAMAGE */}
      <Modal open={movType === "damage"} onClose={() => setMovType("")} title="Record Damaged">
        <div className={styles.modalForm}><Input label="Qty damaged" type="number" value={String(movQty)} onChange={e => setMovQty(parseInt(e.target.value) || 0)} />
          <Input label="Reason" value={movReason} onChange={e => setMovReason(e.target.value)} />
          <div className={styles.modalActions}><Button onClick={() => setMovType("")}>Cancel</Button><Button onClick={doMovement}>Record</Button></div>
          {movError && <p style={{ color: "#b33c2f", fontSize: 13 }}>{movError}</p>}
        </div>
      </Modal>

      {/* ADJUST */}
      <Modal open={movType === "adjust"} onClose={() => setMovType("")} title="Manual Adjustment">
        <div className={styles.modalForm}><label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={!movIncrease} onChange={e => setMovIncrease(!e.target.checked)} /> Decrease</label>
          <Input label="Qty" type="number" value={String(movQty)} onChange={e => setMovQty(parseInt(e.target.value) || 0)} />
          <Input label="Reason" value={movReason} onChange={e => setMovReason(e.target.value)} />
          <div className={styles.modalActions}><Button onClick={() => setMovType("")}>Cancel</Button><Button onClick={doMovement}>Apply</Button></div>
          {movError && <p style={{ color: "#b33c2f", fontSize: 13 }}>{movError}</p>}
        </div>
      </Modal>

      {/* STOCKTAKE */}
      <Modal open={movType === "stocktake"} onClose={() => setMovType("")} title="Stocktake">
        <div className={styles.modalForm}>
          {movInvId && <p style={{ fontSize: 13, color: "#746f67" }}>Recorded: {allInv.find(i => i.id === movInvId)?.currentQuantity} | Observed: {movObserved}</p>}
          <Input label="Observed qty" type="number" value={String(movObserved)} onChange={e => setMovObserved(parseInt(e.target.value) || 0)} />
          <Input label="Reason" value={movReason} onChange={e => setMovReason(e.target.value)} />
          <div className={styles.modalActions}><Button onClick={() => setMovType("")}>Cancel</Button><Button onClick={doMovement}>Apply</Button></div>
          {movError && <p style={{ color: "#b33c2f", fontSize: 13 }}>{movError}</p>}
        </div>
      </Modal>
    </div>
  );
}
