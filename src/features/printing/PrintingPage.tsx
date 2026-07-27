import { useState } from 'react';
import { Printer, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Modal } from '../../components/Modal/Modal';
import { PrintingRepository } from '../../repositories/localStorage/PrintingRepository';
import { getSession } from '../../services/authService';
import { formatAustralian } from '../../utils/date';
import styles from './PrintingPage.module.css';
const repo = new PrintingRepository();
export function PrintingPage() {
  const session = getSession();
  const [, refresh] = useState(0);
  const [printId, setPrintId] = useState<string | null>(null);
  const [printQty, setPrintQty] = useState('');
  const forceRefresh = () => refresh(n => n + 1);
  const items = repo.getAll();
  const selected = printId ? repo.getById(printId) : null;
  const recordPrint = () => {
    if (printId && printQty) {
      repo.recordPrintRun(printId, parseInt(printQty), session?.name || 'Unknown');
      setPrintId(null); setPrintQty(''); forceRefresh();
    }
  };
  const needsCheck = (item: typeof items[0]) => {
    if (!item.lastPrintedDate) return true;
    const last = new Date(item.lastPrintedDate).getTime();
    const diff = (Date.now() - last) / (1000 * 60 * 60 * 24);
    return diff > item.checkFrequencyDays || item.estimatedQuantity <= item.preferredMinimum;
  };
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Printing Register</h1>
      <Card>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Resource</span>
            <span>Est. Qty</span>
            <span>Last Printed</span>
            <span>Frequency</span>
            <span>Actions</span>
          </div>
          {items.map(item => {
            const due = needsCheck(item);
            return (
              <div key={item.id} className={styles.tableRow}>
                <span className={styles.resourceName}>
                  <Printer size={14} className={styles.rowIcon} />
                  {item.name}
                  {due && <Badge variant="info">Check Due</Badge>}
                  {item.estimatedQuantity <= item.preferredMinimum && <Badge variant="warning"><AlertTriangle size={10} /> Low</Badge>}
                </span>
                <span>{item.estimatedQuantity}</span>
                <span>{item.lastPrintedDate ? formatAustralian(item.lastPrintedDate) : 'Never'}</span>
                <span>Every {item.checkFrequencyDays} days</span>
                <span>
                  <Button variant="ghost" size="sm" onClick={() => { setPrintId(item.id); setPrintQty(String(item.quantityLastPrinted || item.estimatedQuantity)); }}>
                    Record Print Run
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      </Card>
      <Modal open={!!selected} onClose={() => { setPrintId(null); setPrintQty(''); }} title={`Record Print Run — ${selected?.name || ''}`}>
        <div className={styles.modalForm}>
          <Input label="Quantity Printed" type="number" value={printQty} onChange={e => setPrintQty(e.target.value)} />
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => { setPrintId(null); setPrintQty(''); }}>Cancel</Button>
            <Button onClick={recordPrint}>Record Print Run</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
