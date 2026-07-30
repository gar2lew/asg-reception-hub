import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { getFirestoreDb } from '../../firebase/config';
import type { StockCatalogueItem } from '../../models';
import { nowISO } from '../../utils/date';

const COLLECTION = 'stockItems';

export class FirebaseStockCatalogueRepository {
  private async getCollection() { return collection(getFirestoreDb(), COLLECTION); }

  async getAll(): Promise<StockCatalogueItem[]> {
    const snap = await getDocs(await this.getCollection());
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockCatalogueItem));
  }

  async getById(id: string): Promise<StockCatalogueItem | undefined> {
    const docRef = doc(getFirestoreDb(), COLLECTION, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } as StockCatalogueItem : undefined;
  }

  async create(data: Partial<StockCatalogueItem> & { itemName: string; unitLabel: string }): Promise<StockCatalogueItem> {
    const docRef = await addDoc(await this.getCollection(), { ...data, active: true, createdAt: nowISO(), updatedAt: nowISO() });
    return { id: docRef.id, ...data, active: true, createdAt: nowISO(), updatedAt: nowISO() } as StockCatalogueItem;
  }

  async update(id: string, data: Partial<StockCatalogueItem>): Promise<StockCatalogueItem | undefined> {
    const docRef = doc(getFirestoreDb(), COLLECTION, id);
    await updateDoc(docRef, { ...data, updatedAt: nowISO() });
    return this.getById(id);
  }

  async archive(id: string, archivedBy: string): Promise<StockCatalogueItem | undefined> {
    return this.update(id, { active: false, archivedAt: nowISO(), archivedBy } as any);
  }
}
