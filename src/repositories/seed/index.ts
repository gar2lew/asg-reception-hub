import { SEED_STAFF } from './staff';
import { SEED_TASK_DEFINITIONS } from './taskDefinitions';
import { SEED_TRAINING } from './training';
import { SEED_STOCK } from './stock';
import { SEED_PRINTING } from './printing';
import { SEED_QUICK_LINKS } from './quickLinks';
import { SEED_CONTACTS } from './contacts';
import { StaffRepository } from '../localStorage/StaffRepository';
import { TaskDefinitionRepository } from '../localStorage/TaskDefinitionRepository';
import { FirebaseTaskDefinitionRepository } from '../firebase/FirebaseTaskDefinitionRepository';
import { getFirebaseAuth, getProvider } from '../../firebase/config';
import { TrainingRepository } from '../localStorage/TrainingRepository';
import { StockRepository } from '../localStorage/StockRepository';
import { PrintingRepository } from '../localStorage/PrintingRepository';
import { QuickLinkRepository } from '../localStorage/QuickLinkRepository';
import { ContactRepository } from '../localStorage/ContactRepository';
import { migrateStockData } from './stockMigration';

function isFirebaseError(err: unknown, code: string): boolean {
  return !!(err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code === code);
}

/** Role of the current Firebase user, or null when not signed in / unreadable. */
async function currentUserRole(): Promise<string | null> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdTokenResult(true);
    const role = token.claims.role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

/**
 * Seed Firebase task definitions only when an administrator is signed in.
 * Reception and unauthenticated startup must never attempt these admin-only writes.
 */
async function seedFirebaseTaskDefinitions(): Promise<void> {
  try {
    const role = await currentUserRole();
    if (role !== 'administrator') {
      console.debug('[seed] Skipping Firebase task definitions — administrator role required.');
      return;
    }
    const repo = new FirebaseTaskDefinitionRepository();
    const existing = await repo.getAll();
    if (existing.length > 0) {
      console.debug('[seed] Firebase task definitions already present — skipping seed.');
      return;
    }
    await repo.seed(SEED_TASK_DEFINITIONS);
    console.log('[seed] Firebase task definitions seeded');
  } catch (err) {
    if (isFirebaseError(err, 'permission-denied')) {
      console.debug('[seed] Firebase task definitions skipped — permission denied (admin only).');
      return;
    }
    console.warn('[seed] Firebase task definitions seed failed:', err);
  }
}

export async function runSeed(): Promise<void> {
  console.log('[seed] Starting seed...');
  if (getProvider() === 'firebase') {
    await seedFirebaseTaskDefinitions();
  }
  new StaffRepository().seed(SEED_STAFF);
  new TaskDefinitionRepository().seed(SEED_TASK_DEFINITIONS);
  new TrainingRepository().seed(SEED_TRAINING);
  new StockRepository().seed(SEED_STOCK);
  new PrintingRepository().seed(SEED_PRINTING);
  new QuickLinkRepository().seed(SEED_QUICK_LINKS);
  new ContactRepository().seed(SEED_CONTACTS);
  migrateStockData();
  const staff = new StaffRepository().getAll();
  console.log('[seed] Staff count:', staff.length, 'names:', staff.map(s => s.name));
}
export {
  SEED_STAFF,
  SEED_TASK_DEFINITIONS,
  SEED_TRAINING,
  SEED_STOCK,
  SEED_PRINTING,
  SEED_QUICK_LINKS,
  SEED_CONTACTS,
};


