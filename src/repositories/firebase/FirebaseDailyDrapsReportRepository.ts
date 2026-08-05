import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy} from "firebase/firestore";
import { getFirestoreDb } from "../../firebase/config";
import type { DailyDrapsReport } from "../../models/draps";
import { nowISO } from "../../utils/date";

const COLL = "dailyDrapsReports";

export class FirebaseDailyDrapsReportRepository {
  async getById(id: string): Promise<DailyDrapsReport | undefined> {
    const snap = await getDoc(doc(getFirestoreDb(), COLL, id));
    if (!snap.exists()) return undefined;
    return { id: snap.id, ...snap.data() } as DailyDrapsReport;
  }

  async getByDate(date: string, office: string): Promise<DailyDrapsReport | undefined> {
    const snap = await getDocs(query(collection(getFirestoreDb(), COLL), where("reportDate", "==", date), where("office", "==", office)));
    if (snap.empty) return undefined;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as DailyDrapsReport;
  }

  async getAll(): Promise<DailyDrapsReport[]> {
    const snap = await getDocs(query(collection(getFirestoreDb(), COLL), orderBy("reportDate", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyDrapsReport));
  }

  async create(date: string, office: string, uid: string, name: string): Promise<DailyDrapsReport> {
    const id = crypto.randomUUID();
    const report: DailyDrapsReport = {
      id, reportDate: date, office: office as DailyDrapsReport['office'],
      status: "draft",
      createdAt: nowISO(), createdByUid: uid, createdByName: name,
      updatedAt: nowISO(), updatedByUid: uid, updatedByName: name,
    };
    await setDoc(doc(getFirestoreDb(), COLL, id), report);
    return report;
  }

  async update(id: string, data: Partial<DailyDrapsReport>): Promise<void> {
    const ref = doc(getFirestoreDb(), COLL, id);
    await updateDoc(ref, { ...data, updatedAt: nowISO() });
  }

  async markComplete(id: string, uid: string, name: string): Promise<void> {
    const ref = doc(getFirestoreDb(), COLL, id);
    await updateDoc(ref, { status: "complete", completedAt: nowISO(), completedByUid: uid, completedByName: name, updatedAt: nowISO() });
  }

  async reopen(id: string, uid: string, name: string): Promise<void> {
    const ref = doc(getFirestoreDb(), COLL, id);
    await updateDoc(ref, { status: "draft", reopenedAt: nowISO(), reopenedByUid: uid, reopenedByName: name, updatedAt: nowISO() });
  }
}
