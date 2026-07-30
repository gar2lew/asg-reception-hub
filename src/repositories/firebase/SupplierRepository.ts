import { collection, getDocs, getDoc, doc, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { getFirestoreDb } from '../../firebase/config';
import type { Supplier } from '../../models';
import { nowISO } from '../../utils/date';
const COLL = 'suppliers';
export class FirebaseSupplierRepository {
  async getAll(): Promise<Supplier[]> { const snap = await getDocs(collection(getFirestoreDb(), COLL)); return snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)); }
  async getActive(): Promise<Supplier[]> { const q = query(collection(getFirestoreDb(), COLL), where('active', '==', true)); const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)); }
  async create(data: Partial<Supplier> & { name: string }): Promise<Supplier> {
    const docRef = await addDoc(collection(getFirestoreDb(), COLL), { ...data, active: true, createdAt: nowISO(), updatedAt: nowISO() });
    return { id: docRef.id, ...data, active: true, createdAt: nowISO(), updatedAt: nowISO() } as Supplier;
  }
  async update(id: string, data: Partial<Supplier>): Promise<void> { await updateDoc(doc(getFirestoreDb(), COLL, id), { ...data, updatedAt: nowISO() }); }
  async archive(id: string): Promise<void> { await this.update(id, { active: false } as any); }
}
