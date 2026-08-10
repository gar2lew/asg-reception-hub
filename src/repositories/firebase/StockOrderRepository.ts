import { collection, getDocs, getDoc, doc, addDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { getFirestoreDb } from '../../firebase/config';
import type { StockOrder, OrderLineItem, StockReceipt } from '../../models';
import { nowISO } from '../../utils/date';

const ORD = 'stockOrders'; const LNS = 'orderLineItems'; const REC = 'stockReceipts';

export class FirebaseStockOrderRepository {
  async getAll(): Promise<StockOrder[]> {
    const snap = await getDocs(query(collection(getFirestoreDb(), ORD), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockOrder));
  }
  async getByOffice(office: string): Promise<StockOrder[]> {
    const q = query(collection(getFirestoreDb(), ORD), where('office', '==', office), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockOrder));
  }
  async getById(id: string): Promise<StockOrder | undefined> {
    const snap = await getDoc(doc(getFirestoreDb(), ORD, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } as StockOrder : undefined;
  }
  async create(data: Partial<StockOrder> & { office: string; requestedBy: string }): Promise<StockOrder> {
    const ref = await addDoc(collection(getFirestoreDb(), ORD), { ...data, status: 'draft', requestedAt: nowISO(), createdAt: nowISO(), updatedAt: nowISO() });
    return { id: ref.id, office: data.office || '', requestedBy: data.requestedBy || '', status: 'draft' as const, requestedAt: nowISO(), createdAt: nowISO(), updatedAt: nowISO() } as any;
  }
  async update(id: string, data: Partial<StockOrder>): Promise<void> {
    await updateDoc(doc(getFirestoreDb(), ORD, id), { ...data, updatedAt: nowISO() });
  }
}

export class FirebaseOrderLineItemRepository {
  async getByOrder(orderId: string): Promise<OrderLineItem[]> {
    const q = query(collection(getFirestoreDb(), LNS), where('orderId', '==', orderId));
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderLineItem));
  }
  async create(data: Partial<OrderLineItem> & { orderId: string; stockItemId: string; itemName: string; unitLabel: string; quantityRequested: number }): Promise<OrderLineItem> {
    const ref = await addDoc(collection(getFirestoreDb(), LNS), { ...data, quantityReceived: 0, createdAt: nowISO() });
    return { id: ref.id, orderId: data.orderId, stockItemId: data.stockItemId, itemName: data.itemName, unitLabel: data.unitLabel, quantityRequested: data.quantityRequested, quantityReceived: 0, createdAt: nowISO() } as any;
  }
  async update(id: string, data: Partial<OrderLineItem>): Promise<void> {
    await updateDoc(doc(getFirestoreDb(), LNS, id), data);
  }
}

export class FirebaseStockReceiptRepository {
  async getAll(): Promise<StockReceipt[]> {
    const snap = await getDocs(collection(getFirestoreDb(), REC));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockReceipt));
  }
  async getByOffice(office: string): Promise<StockReceipt[]> {
    const q = query(collection(getFirestoreDb(), REC), where('office', '==', office));
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockReceipt));
  }
  async getByOrder(orderId: string, office?: string): Promise<StockReceipt[]> {
    const constraints = [where('orderId', '==', orderId)];
    if (office) constraints.push(where('office', '==', office));
    const q = query(collection(getFirestoreDb(), REC), ...constraints);
    const snap = await getDocs(q); return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockReceipt));
  }
  async create(data: StockReceipt): Promise<StockReceipt> {
    const ref = await addDoc(collection(getFirestoreDb(), REC), data);
    return { id: ref.id, receivedAt: '', receivedBy: '', orderId: '', office: '' } as any;
  }
}
