import { collection, getDocs, getDoc, doc, addDoc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { getFirestoreDb } from '../../firebase/config';
import type { StockInventory } from '../../models';
import { nowISO } from '../../utils/date';
const COLL = 'stockInventory';
export class FirebaseStockInventoryRepository {
  async getByItem(stockItemId: string): Promise<StockInventory[]> {
    const q = query(collection(getFirestoreDb(), COLL), where('stockItemId', '==', stockItemId));
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockInventory));
  }
  async getByOffice(office: string): Promise<StockInventory[]> {
    const q = query(collection(getFirestoreDb(), COLL), where('office', '==', office));
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockInventory));
  }
  async upsert(inv: StockInventory): Promise<void> {
    const db = getFirestoreDb();
    if (inv.id) { await updateDoc(doc(db, COLL, inv.id), { ...inv, updatedAt: nowISO() }); return; }
    await addDoc(collection(db, COLL), { ...inv, updatedAt: nowISO() });
  }
}
