import { collection, getDocs, getDoc, doc, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { getFirestoreDb } from '../../firebase/config';
import type { StockCategory } from '../../models';
import { nowISO } from '../../utils/date';
const COLL = 'stockCategories';
export class FirebaseStockCategoryRepository {
  async getAll(): Promise<StockCategory[]> {
    const q = query(collection(getFirestoreDb(), COLL), orderBy('order'));
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockCategory));
  }
  async create(data: Partial<StockCategory> & { name: string }): Promise<StockCategory> {
    const docRef = await addDoc(collection(getFirestoreDb(), COLL), { ...data, createdAt: nowISO(), updatedAt: nowISO() });
    return { id: docRef.id, ...data, createdAt: nowISO(), updatedAt: nowISO() } as StockCategory;
  }
  async update(id: string, data: Partial<StockCategory>): Promise<void> {
    await updateDoc(doc(getFirestoreDb(), COLL, id), { ...data, updatedAt: nowISO() });
  }
  async archive(id: string): Promise<void> { await this.update(id, { archived: true } as any); }
}
