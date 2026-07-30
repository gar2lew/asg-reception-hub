import { useState } from "react";
import { Card, CardHeader, CardTitle } from "../../components/Card/Card";
import { Button } from "../../components/Button/Button";
import { Badge } from "../../components/Badge/Badge";
import { StockCatalogueRepository } from "../../repositories/localStorage/StockCatalogueRepository";
import { StockInventoryRepository } from "../../repositories/localStorage/StockInventoryRepository";
import { RotateCcw } from "lucide-react";
import { nowISO } from "../../utils/date";
import styles from "./AdminPage.module.css";

const catRepo = new StockCatalogueRepository();
const invRepo = new StockInventoryRepository();

export function ArchivedStockSection() {
  const [, refresh] = useState(0);
  const forceRefresh = () => refresh(n => n + 1);
  const archived = catRepo.getAll().filter(c => !c.active);

  const restore = (id: string) => {
    catRepo.update(id, { active: true, archivedAt: undefined, archivedBy: undefined });
    forceRefresh();
  };

  return (<Card><CardHeader><CardTitle>Archived Stock Items ({archived.length})</CardTitle></CardHeader>
    {archived.length === 0 && <p className={styles.opsNote}>No archived items.</p>}
    <div className={styles.table}><div className={`${styles.tableRow} ${styles.tableHeader}`}><span>Item</span><span>Unit</span><span>Inventory</span><span>Archived</span><span>Actions</span></div>
      {archived.map(c => {
        const invCount = invRepo.getByItem(c.id).length;
        return <div key={c.id} className={styles.tableRow}>
          <span>{c.itemName}</span><span>{c.unitLabel}</span>
          <span>{invCount > 0 ? <Badge>{invCount} record(s)</Badge> : <Badge>None</Badge>}</span>
          <span style={{ fontSize: 12, color: "#746f67" }}>{c.archivedAt ? new Date(c.archivedAt).toLocaleDateString() : "—"}</span>
          <span className={styles.actionCell}><Button variant="ghost" size="sm" onClick={() => restore(c.id)}><RotateCcw size={14} /> Restore</Button></span>
        </div>;
      })}
    </div>
  </Card>);
}
