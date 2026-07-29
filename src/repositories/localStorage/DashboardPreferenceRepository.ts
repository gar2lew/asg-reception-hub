import type { DashboardPreference } from '../../models';
import { getItem, setItem } from '../../utils/storage';
import { defaultWidgetConfigs } from '../../models/dashboard';
import { nowISO } from '../../utils/date';
const KEY = 'dash_prefs';
export class DashboardPreferenceRepository {
  get(userId: string): DashboardPreference {
    const existing = getItem<DashboardPreference[]>(KEY) ?? [];
    const found = existing.find(p => p.userId === userId);
    return found ?? this.getDefaults(userId);
  }
  save(pref: DashboardPreference): void {
    const all = getItem<DashboardPreference[]>(KEY) ?? [];
    const idx = all.findIndex(p => p.userId === pref.userId);
    pref.updatedAt = nowISO();
    if (idx >= 0) all[idx] = pref; else all.push(pref);
    setItem(KEY, all);
  }
  private getDefaults(userId: string): DashboardPreference {
    return { userId, density: 'comfortable', defaultLanding: '/', widgets: defaultWidgetConfigs(), updatedAt: nowISO() };
  }
}
