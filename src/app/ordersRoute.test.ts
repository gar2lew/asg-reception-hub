import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/authService', () => ({
  isAdmin: vi.fn(() => false),
  isAuthenticated: vi.fn(() => true),
  getSession: vi.fn(() => ({ staffId: 'test', name: 'Test', role: 'reception', location: 'brisbane', loginAt: new Date().toISOString() })),
  login: vi.fn(),
  logout: vi.fn(),
}));

describe('orders navigation', () => {
  it('registers the requester orders route', { timeout: 20000 }, async () => {
    const { router } = await import('./Router');
    const root = router.routes.find((r: any) => r.path === '/');
    const orders = root?.children?.find((r: any) => r.path === 'orders');
    expect(orders).toBeTruthy();
    expect(orders?.element).toBeTruthy();
  });

  it('shows admin navigation available to authenticated users', async () => {
    const { router } = await import('./Router');
    const root = router.routes.find((r: any) => r.path === '/');
    const routes = root?.children?.map((r: any) => r.path).filter(Boolean) || [];
    expect(routes).toContain('orders');
  });
});
