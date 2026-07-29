import { describe, it, expect, beforeEach } from "vitest";
import { UserTaskRepository } from "../../repositories/localStorage/UserTaskRepository";
import { QuickLinkRepository } from "../../repositories/localStorage/QuickLinkRepository";
import { QuickLinkGroupRepository } from "../../repositories/localStorage/QuickLinkGroupRepository";
import { DashboardPreferenceRepository } from "../../repositories/localStorage/DashboardPreferenceRepository";
import { isValidUrl } from "../../utils/urlValidation";

beforeEach(() => { localStorage.clear(); });

describe('Personal Tasks (Phase B)', () => {
  it('should create a personal task', () => {
    const repo = new UserTaskRepository();
    const t = repo.create({ title: 'Test Task', ownerUid: 'user-1' });
    expect(t.id).toBeTruthy(); expect(t.title).toBe('Test Task'); expect(t.ownerUid).toBe('user-1'); expect(t.completed).toBe(false);
  });
  it('should complete and reopen a task', () => {
    const repo = new UserTaskRepository(); const t = repo.create({ title: 'Do thing', ownerUid: 'user-1' });
    repo.update(t.id, { completed: true }); expect(repo.getById(t.id)?.completed).toBe(true);
    repo.update(t.id, { completed: false }); expect(repo.getById(t.id)?.completed).toBe(false);
  });
  it('should archive a task', () => {
    const repo = new UserTaskRepository(); const t = repo.create({ title: 'Archivable', ownerUid: 'user-1' });
    repo.archive(t.id); const all = repo.getAll().filter(x => x.archived); expect(all.length).toBe(1);
  });
  it('should isolate tasks between users', () => {
    const repo = new UserTaskRepository();
    repo.create({ title: 'A', ownerUid: 'user-1' }); repo.create({ title: 'B', ownerUid: 'user-2' });
    expect(repo.getByUser('user-1').length).toBe(1); expect(repo.getByUser('user-2').length).toBe(1);
  });
});

describe('Quick Links (Phase B)', () => {
  it('should create personal links', () => {
    const repo = new QuickLinkRepository();
    const l = repo.create({ id: 'l1', title: 'Drive', url: 'https://drive.google.com', group: 'daily_systems', scope: 'personal', ownerUid: 'user-1', openBehaviour: 'new-tab', pinned: false, order: 0, enabled: true, createdAt: '', updatedAt: '' });
    expect(l.title).toBe('Drive');
  });
  it('should scope shared vs personal links', () => {
    const repo = new QuickLinkRepository();
    repo.create({ id: 's1', title: 'Org Link', url: 'https://asg.com', group: 'communication', scope: 'organisation', ownerUid: 'admin', openBehaviour: 'new-tab', pinned: false, order: 0, enabled: true, createdAt: '', updatedAt: '' });
    repo.create({ id: 'p1', title: 'My Link', url: 'https://my.link', group: 'communication', scope: 'personal', ownerUid: 'user-1', openBehaviour: 'new-tab', pinned: false, order: 0, enabled: true, createdAt: '', updatedAt: '' });
    const org = repo.getAll().filter(l => l.scope === 'organisation');
    expect(org.length).toBe(1); expect(org[0].title).toBe('Org Link');
  });
  it('should pin and unpin links', () => {
    const repo = new QuickLinkRepository();
    repo.create({ id: 'l1', title: 'PinTest', url: 'https://test.com', group: 'daily_systems', scope: 'personal', ownerUid: 'u1', openBehaviour: 'new-tab', pinned: false, order: 0, enabled: true, createdAt: '', updatedAt: '' });
    repo.update('l1', { pinned: true }); expect(repo.getAll().find(l => l.id === 'l1')?.pinned).toBe(true);
    repo.update('l1', { pinned: false }); expect(repo.getAll().find(l => l.id === 'l1')?.pinned).toBe(false);
  });
  it('should archive links', () => {
    const repo = new QuickLinkRepository();
    repo.create({ id: 'l1', title: 'Archivable', url: 'https://test.com', group: 'daily_systems', scope: 'personal', ownerUid: 'u1', openBehaviour: 'new-tab', pinned: false, order: 0, enabled: true, createdAt: '', updatedAt: '' });
    repo.update('l1', { archived: true });
    expect(repo.getAll().find(l => l.id === 'l1')?.archived).toBe(true);
  });
  it('should create groups', () => {
    const repo = new QuickLinkGroupRepository();
    const g = repo.create({ name: 'Test Group', scope: 'organisation' });
    expect(g.id).toBeTruthy(); expect(g.name).toBe('Test Group'); expect(g.scope).toBe('organisation');
  });
});

describe('URL Validation (Phase B)', () => {
  it('should accept https', () => { expect(isValidUrl('https://example.com')).toBe(true); });
  it('should accept http', () => { expect(isValidUrl('http://example.com')).toBe(true); });
  it('should accept mailto', () => { expect(isValidUrl('mailto:test@example.com')).toBe(true); });
  it('should accept tel', () => { expect(isValidUrl('tel:+61730000001')).toBe(true); });
  it('should reject javascript:', () => { expect(isValidUrl('javascript:alert(1)')).toBe(false); });
  it('should reject data:', () => { expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false); });
  it('should reject empty URL', () => { expect(isValidUrl('')).toBe(false); });
  it('should reject malformed URL', () => { expect(isValidUrl('not-a-url')).toBe(false); });
});

describe('Dashboard Preferences (Phase B)', () => {
  it('should return defaults for new user', () => {
    const repo = new DashboardPreferenceRepository();
    const pref = repo.get('new-user');
    expect(pref.userId).toBe('new-user'); expect(pref.widgets.length).toBe(9);
    expect(pref.widgets.find(w => w.widgetKey === 'progress')?.enabled).toBe(true);
  });
  it('should save and load preferences', () => {
    const repo = new DashboardPreferenceRepository();
    const pref = repo.get('user-1'); pref.density = 'compact';
    repo.save(pref);
    const loaded = repo.get('user-1');
    expect(loaded.density).toBe('compact');
  });
  it('should persist widget visibility', () => {
    const repo = new DashboardPreferenceRepository();
    const pref = repo.get('user-1');
    pref.widgets.find(w => w.widgetKey === 'stock')!.enabled = false;
    repo.save(pref);
    const loaded = repo.get('user-1');
    expect(loaded.widgets.find(w => w.widgetKey === 'stock')?.enabled).toBe(false);
  });
});

