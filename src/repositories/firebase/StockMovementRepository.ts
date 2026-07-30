import { collection, getDocs, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getFirestoreDb } from '../../firebase/config';
import type { StockMovement } from '../../models';
import { nowISO } from '../../utils/date';
const COLL = 'stockMovements';
export class FirebaseStockMovementRepository {
  async getByItem(stockItemId: string): Promise<StockMovement[]> {
    const q = query(collection(getFirestoreDb(), COLL), where('stockItemId', '==', stockItemId), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement));
  }
  async getByInventory(stockInventoryId: string): Promise<StockMovement[]> {
    const q = query(collection(getFirestoreDb(), COLL), where('stockInventoryId', '==', stockInventoryId), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement));
  }
  async add(movement: StockMovement): Promise<void> {
    await addDoc(collection(getFirestoreDb(), COLL), { ...movement, createdAt: nowISO() });
  }
}
