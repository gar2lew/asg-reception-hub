import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { getFirestoreDb } from "../../firebase/config";
import type { Representative, RepresentativeCreate } from "../../models/representative";
import { nowISO } from "../../utils/date";

const COLL = "representatives";

export class FirebaseRepresentativeRepository {
  async getAll(): Promise<Representative[]> {
    const snap = await getDocs(query(collection(getFirestoreDb(), COLL), orderBy("displayOrder")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Representative));
  }

  async getActive(): Promise<Representative[]> {
    const all = await this.getAll();
    return all.filter(r => r.active);
  }

  async getById(id: string): Promise<Representative | undefined> {
    const snap = await getDoc(doc(getFirestoreDb(), COLL, id));
    if (!snap.exists()) return undefined;
    return { id: snap.id, ...snap.data() } as Representative;
  }

  async create(data: RepresentativeCreate, uid: string, name: string): Promise<Representative> {
    const id = crypto.randomUUID();
    const all = await this.getAll();
    const maxOrder = all.reduce((max, r) => Math.max(max, r.displayOrder || 0), 0);
    const rep: Representative = {
      id, name: data.name.trim(), office: data.office,
      active: true,
      includeDraps: data.includeDraps,
      includeFirstConsult: data.includeFirstConsult,
      includeFinanceRun: data.includeFinanceRun,
      displayOrder: data.displayOrder ?? maxOrder + 1,
      notes: data.notes?.trim() || undefined,
      createdAt: nowISO(), createdByUid: uid, createdByName: name,
      updatedAt: nowISO(), updatedByUid: uid, updatedByName: name,
    };
    await setDoc(doc(getFirestoreDb(), COLL, id), rep);
    return rep;
  }

  async update(id: string, data: Partial<Representative>, uid: string, name: string): Promise<Representative | undefined> {
    const ref = doc(getFirestoreDb(), COLL, id);
    await updateDoc(ref, { ...data, updatedAt: nowISO(), updatedByUid: uid, updatedByName: name });
    const snap = await getDoc(ref);
    if (!snap.exists()) return undefined;
    return { id: snap.id, ...snap.data() } as Representative;
  }

  async deactivate(id: string, uid: string): Promise<void> {
    const ref = doc(getFirestoreDb(), COLL, id);
    await updateDoc(ref, { active: false, archivedAt: nowISO(), archivedByUid: uid, updatedAt: nowISO() });
  }

  async restore(id: string, uid: string, name: string): Promise<void> {
    const ref = doc(getFirestoreDb(), COLL, id);
    await updateDoc(ref, { active: true, updatedAt: nowISO(), updatedByUid: uid, updatedByName: name });
  }
}
