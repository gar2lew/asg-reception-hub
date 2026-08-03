import { collection, getDocs, getDoc, doc, setDoc, query, where } from "firebase/firestore";
import { getFirestoreDb } from "../../firebase/config";
import type { TaskInstance } from "../../models";

const COLL = "dailyTaskInstances";
const META_COLL = "system";
const GEN_KEY = "last_generated_date";

export class FirebaseDailyTaskInstanceRepository {
  async getByDate(businessDate: string): Promise<TaskInstance[]> {
    const all = await this.getAll();
    return all.filter(t => t.businessDate === businessDate);
  }

  async getByDateAndStaff(businessDate: string, staffId: string): Promise<TaskInstance[]> {
    const all = await this.getAll();
    return all.filter(t => t.businessDate === businessDate && t.assignedStaffId === staffId);
  }

  async getById(id: string): Promise<TaskInstance | undefined> {
    const snap = await getDoc(doc(getFirestoreDb(), COLL, id));
    if (!snap.exists()) return undefined;
    return { id: snap.id, ...snap.data() } as TaskInstance;
  }

  async upsert(instance: TaskInstance): Promise<void> {
    await setDoc(doc(getFirestoreDb(), COLL, instance.id), instance, { merge: true });
  }

  async upsertMany(instances: TaskInstance[]): Promise<void> {
    for (const inst of instances) {
      await setDoc(doc(getFirestoreDb(), COLL, inst.id), inst, { merge: true });
    }
  }

  async getLastGeneratedDate(): Promise<string | null> {
    try {
      const snap = await getDoc(doc(getFirestoreDb(), META_COLL, GEN_KEY));
      if (!snap.exists()) return null;
      return (snap.data() as any).value ?? null;
    } catch {
      return null;
    }
  }

  async setLastGeneratedDate(date: string): Promise<void> {
    await setDoc(doc(getFirestoreDb(), META_COLL, GEN_KEY), { value: date }, { merge: true });
  }

  async getAll(): Promise<TaskInstance[]> {
    const snap = await getDocs(collection(getFirestoreDb(), COLL));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskInstance));
  }
}
