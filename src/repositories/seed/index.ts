import { SEED_STAFF } from './staff';
import { SEED_TASK_DEFINITIONS } from './taskDefinitions';
import { SEED_TRAINING } from './training';
import { SEED_STOCK } from './stock';
import { SEED_PRINTING } from './printing';
import { SEED_QUICK_LINKS } from './quickLinks';
import { SEED_CONTACTS } from './contacts';
import { StaffRepository } from '../localStorage/StaffRepository';
import { TaskDefinitionRepository } from '../localStorage/TaskDefinitionRepository';
import { TrainingRepository } from '../localStorage/TrainingRepository';
import { StockRepository } from '../localStorage/StockRepository';
import { PrintingRepository } from '../localStorage/PrintingRepository';
import { QuickLinkRepository } from '../localStorage/QuickLinkRepository';
import { ContactRepository } from '../localStorage/ContactRepository';
export function runSeed(): void {
  console.log('[seed] Starting seed...');
  new StaffRepository().seed(SEED_STAFF);
  new TaskDefinitionRepository().seed(SEED_TASK_DEFINITIONS);
  new TrainingRepository().seed(SEED_TRAINING);
  new StockRepository().seed(SEED_STOCK);
  new PrintingRepository().seed(SEED_PRINTING);
  new QuickLinkRepository().seed(SEED_QUICK_LINKS);
  new ContactRepository().seed(SEED_CONTACTS);
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

