import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { getFirestoreDb } from "../../firebase/config";
import type { TaskDefinition, TaskDefinitionCreate } from "../../models";
import { nowISO } from "../../utils/date";

const COLL = "taskDefinitions";

export class FirebaseTaskDefinitionRepository {
  async getAll(): Promise<TaskDefinition[]> {
    const snap = await getDocs(collection(getFirestoreDb(), COLL));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskDefinition));
  }

  async getActive(): Promise<TaskDefinition[]> {
    const all = await this.getAll();
    return all.filter(t => t.active);
  }

  async getById(id: string): Promise<TaskDefinition | undefined> {
    const snap = await getDoc(doc(getFirestoreDb(), COLL, id));
    if (!snap.exists()) return undefined;
    return { id: snap.id, ...snap.data() } as TaskDefinition;
  }

  async create(data: TaskDefinitionCreate): Promise<TaskDefinition> {
    const id = crypto.randomUUID();
    const task: TaskDefinition = {
      id,
      title: data.title,
      description: data.description,
      category: data.category,
      recurrence: data.recurrence,
      scope: data.scope ?? "organisation",
      completionType: data.completionType ?? "personal",
      assignedStaffIds: data.assignedStaffIds,
      required: data.required ?? true,
      priority: data.priority ?? "normal",
      dueTime: data.dueTime,
      instructions: data.instructions,
      relatedTrainingId: data.relatedTrainingId,
      externalUrl: data.externalUrl,
      active: data.active ?? true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    await setDoc(doc(getFirestoreDb(), COLL, id), task);
    return task;
  }

  async update(id: string, data: Partial<TaskDefinition>): Promise<TaskDefinition | undefined> {
    const ref = doc(getFirestoreDb(), COLL, id);
    await updateDoc(ref, { ...data, updatedAt: nowISO() });
    const snap = await getDoc(ref);
    if (!snap.exists()) return undefined;
    return { id: snap.id, ...snap.data() } as TaskDefinition;
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(getFirestoreDb(), COLL, id));
  }

  async seed(data: TaskDefinition[]): Promise<void> {
    const existing = await this.getAll();
    if (existing.length > 0) return;
    for (const def of data) {
      await setDoc(doc(getFirestoreDb(), COLL, def.id), def);
    }
  }
}
