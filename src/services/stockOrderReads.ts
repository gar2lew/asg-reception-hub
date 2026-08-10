import { getProvider } from '../firebase/config';
import type { OrderLineItem, StockCatalogueItem, StockInventory, StockMovement, StockOrder, StockReceipt, Supplier } from '../models';
import {
  FirebaseOrderLineItemRepository,
  FirebaseStockOrderRepository,
  FirebaseStockReceiptRepository,
} from '../repositories/firebase/StockOrderRepository';
import { FirebaseStockInventoryRepository } from '../repositories/firebase/StockInventoryRepository';
import { FirebaseStockMovementRepository } from '../repositories/firebase/StockMovementRepository';
import { FirebaseStockCatalogueRepository } from '../repositories/firebase/StockCatalogueRepository';
import { FirebaseSupplierRepository } from '../repositories/firebase/SupplierRepository';
import { OrderLineItemRepository } from '../repositories/localStorage/OrderLineItemRepository';
import { StockCatalogueRepository } from '../repositories/localStorage/StockCatalogueRepository';
import { StockInventoryRepository } from '../repositories/localStorage/StockInventoryRepository';
import { StockMovementRepository } from '../repositories/localStorage/StockMovementRepository';
import { StockOrderRepository } from '../repositories/localStorage/StockOrderRepository';
import { StockReceiptRepository } from '../repositories/localStorage/StockReceiptRepository';
import { SupplierRepository } from '../repositories/localStorage/SupplierRepository';

export interface OrderReadSession {
  role?: string;
  location?: string;
}

const firebaseOrders = new FirebaseStockOrderRepository();
const firebaseLines = new FirebaseOrderLineItemRepository();
const firebaseReceipts = new FirebaseStockReceiptRepository();
const firebaseInventory = new FirebaseStockInventoryRepository();
const firebaseMovements = new FirebaseStockMovementRepository();
const firebaseCatalogue = new FirebaseStockCatalogueRepository();
const firebaseSuppliers = new FirebaseSupplierRepository();
const localOrders = new StockOrderRepository();
const localLines = new OrderLineItemRepository();
const localReceipts = new StockReceiptRepository();
const localInventory = new StockInventoryRepository();
const localMovements = new StockMovementRepository();
const localCatalogue = new StockCatalogueRepository();
const localSuppliers = new SupplierRepository();

function isAdmin(session: OrderReadSession): boolean {
  return session.role === 'admin';
}

function ownOffice(session: OrderReadSession): string {
  if (!session.location) throw new Error('An office is required to load operational data.');
  return session.location;
}

function normalizeFirestoreDates<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  const output = { ...(value as Record<string, unknown>) };
  for (const [key, candidate] of Object.entries(output)) {
    if (candidate && typeof candidate === 'object' && 'toDate' in candidate && typeof candidate.toDate === 'function') {
      output[key] = candidate.toDate().toISOString();
    }
  }
  return output as T;
}

function normalizeMany<T>(values: T[]): T[] {
  return values.map(normalizeFirestoreDates);
}

export async function loadOrders(session: OrderReadSession): Promise<StockOrder[]> {
  if (getProvider() === 'firebase') {
    const values = isAdmin(session) ? await firebaseOrders.getAll() : await firebaseOrders.getByOffice(ownOffice(session));
    return normalizeMany(values);
  }
  return isAdmin(session) ? localOrders.getAll() : localOrders.getByOffice(ownOffice(session));
}

export async function loadOrder(orderId: string): Promise<StockOrder | undefined> {
  if (getProvider() === 'firebase') {
    const value = await firebaseOrders.getById(orderId);
    return value ? normalizeFirestoreDates(value) : undefined;
  }
  return localOrders.getById(orderId);
}

export async function loadOrderLines(orderId: string): Promise<OrderLineItem[]> {
  const values = getProvider() === 'firebase' ? await firebaseLines.getByOrder(orderId) : localLines.getByOrder(orderId);
  return normalizeMany(values);
}

export async function loadInventory(session: OrderReadSession): Promise<StockInventory[]> {
  if (getProvider() === 'firebase') {
    const values = isAdmin(session) ? await firebaseInventory.getAll() : await firebaseInventory.getByOffice(ownOffice(session));
    return normalizeMany(values);
  }
  return isAdmin(session) ? localInventory.getAll() : localInventory.getByOffice(ownOffice(session));
}

export async function loadMovements(session: OrderReadSession): Promise<StockMovement[]> {
  if (getProvider() === 'firebase') {
    const values = isAdmin(session) ? await firebaseMovements.getAll() : await firebaseMovements.getByOffice(ownOffice(session));
    return normalizeMany(values);
  }
  return isAdmin(session) ? localMovements.getAll() : localMovements.getByOffice(ownOffice(session));
}

export async function loadReceipts(session: OrderReadSession): Promise<StockReceipt[]> {
  if (getProvider() === 'firebase') {
    const values = isAdmin(session) ? await firebaseReceipts.getAll() : await firebaseReceipts.getByOffice(ownOffice(session));
    return normalizeMany(values);
  }
  return isAdmin(session) ? localReceipts.getAll() : localReceipts.getAll().filter(receipt => receipt.office === ownOffice(session));
}

export async function loadOrderReceipts(orderId: string, session: OrderReadSession): Promise<StockReceipt[]> {
  if (getProvider() === 'firebase') {
    const values = await firebaseReceipts.getByOrder(orderId, isAdmin(session) ? undefined : ownOffice(session));
    return normalizeMany(values);
  }
  return localReceipts.getByOrder(orderId).filter(receipt => isAdmin(session) || receipt.office === ownOffice(session));
}

export async function loadOrderReferenceData(): Promise<{ items: StockCatalogueItem[]; suppliers: Supplier[] }> {
  if (getProvider() === 'firebase') {
    const [items, suppliers] = await Promise.all([firebaseCatalogue.getAll(), firebaseSuppliers.getActive()]);
    return { items: normalizeMany(items.filter(item => item.active)), suppliers: normalizeMany(suppliers) };
  }
  return { items: localCatalogue.getActive(), suppliers: localSuppliers.getActive() };
}
