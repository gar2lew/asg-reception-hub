import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where } from "firebase/firestore";
import { getFirestoreDb } from "../../firebase/config";
import type { DailyRepResult } from "../../models/draps";
import { nowISO } from "../../utils/date";

const COLL = "dailyRepResults";

export class FirebaseDailyRepResultRepository {
  async getByReport(reportId: string): Promise<DailyRepResult[]> {
    const snap = await getDocs(query(collection(getFirestoreDb(), COLL), where("reportId", "==", reportId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyRepResult));
  }

  async save(result: DailyRepResult): Promise<void> {
    const ref = doc(getFirestoreDb(), COLL, result.id);
    await setDoc(ref, { ...result, updatedAt: nowISO() });
  }

  async update(id: string, data: Partial<DailyRepResult>): Promise<void> {
    const ref = doc(getFirestoreDb(), COLL, id);
    await updateDoc(ref, { ...data, updatedAt: nowISO() });
  }
}
