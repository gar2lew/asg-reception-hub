import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { createElement } from 'react';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  isAuthenticated: vi.fn(),
  isAdmin: vi.fn(),
  logout: vi.fn(),
  login: vi.fn(),
}));

vi.mock('../../services/authService.ts', () => auth);
vi.mock('../../services/authService', () => auth);

type RouterModule = typeof import('../../app/Router');
let router: RouterModule['router'];

async function goto(path: string | number) {
  await act(async () => { await router.navigate(path as any); });
}

function adminSession() {
  auth.getSession.mockReturnValue({ staffId: 'admin-user', name: 'Administrator', role: 'admin', loginAt: '2026-08-02T00:00:00.000Z' });
  auth.isAuthenticated.mockReturnValue(true);
  auth.isAdmin.mockReturnValue(true);
  auth.logout.mockResolvedValue(undefined);
}

beforeEach(async () => {
  ({ router } = await import('../../app/Router'));
  adminSession();
  localStorage.clear();
  await goto('/');
  render(createElement(RouterProvider, { router }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('admin navigation', () => {
  it('renders Task Management by default at /admin', async () => {
    await goto('/admin');
    expect(await screen.findByText(/Task Definitions \(\d+\)/)).toBeTruthy();
  });

  it('renders the Staff section when opened directly at /admin?tab=staff', async () => {
    await goto('/admin?tab=staff');
    expect(await screen.findByText('Staff Accounts')).toBeTruthy();
  });

  it('renders Stock Categories when opened directly at /admin?tab=categories', async () => {
    await goto('/admin?tab=categories');
    expect(await screen.findByText(/Stock Categories \(\d+\)/)).toBeTruthy();
  });

  it('renders Suppliers when opened directly at /admin?tab=suppliers', async () => {
    await goto('/admin?tab=suppliers');
    expect(await screen.findByText(/Suppliers \(\d+\)/)).toBeTruthy();
  });

  it('renders Archived Stock when opened directly at /admin?tab=archived-stock', async () => {
    await goto('/admin?tab=archived-stock');
    expect(await screen.findByText(/Archived Stock Items \(\d+\)/)).toBeTruthy();
  });

  it('renders the admin Orders workflow when opened directly at /admin?tab=orders', async () => {
    await goto('/admin?tab=orders');
    expect(await screen.findByText(/Stock Orders \(\d+\)/)).toBeTruthy();
  });

  it('navigates from the sidebar Staff link to the Staff section', async () => {
    const nav = within(screen.getByRole('navigation'));
    fireEvent.click(nav.getByRole('button', { name: 'Staff' }));
    expect(await screen.findByText('Staff Accounts')).toBeTruthy();
    expect(router.state.location.search).toBe('?tab=staff');
  });

  it('keeps only the matching admin sidebar item active', async () => {
    await goto('/admin?tab=staff');
    const nav = within(screen.getByRole('navigation'));
    expect(nav.getByRole('button', { name: 'Staff' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('button', { name: 'Task Management' })).not.toHaveAttribute('aria-current');
    await goto('/admin?tab=suppliers');
    expect(nav.getByRole('button', { name: 'Suppliers' })).toHaveAttribute('aria-current', 'page');
    expect(nav.getByRole('button', { name: 'Staff' })).not.toHaveAttribute('aria-current');
  });

  it('updates the URL when an admin tab is clicked', async () => {
    await goto('/admin');
    await screen.findByText(/Task Definitions \(\d+\)/);
    const tabButton = screen.getAllByRole('button', { name: 'Staff' }).find(b => b.className.includes('tab'));
    expect(tabButton).toBeTruthy();
    fireEvent.click(tabButton!);
    expect(await screen.findByText('Staff Accounts')).toBeTruthy();
    expect(router.state.location.search).toBe('?tab=staff');
  });

  it('restores the previous section when navigating back', async () => {
    await goto('/admin?tab=suppliers');
    expect(await screen.findByText(/Suppliers \(\d+\)/)).toBeTruthy();
    await goto('/admin?tab=archived-stock');
    expect(await screen.findByText(/Archived Stock Items \(\d+\)/)).toBeTruthy();
    await goto(-1);
    expect(await screen.findByText(/Suppliers \(\d+\)/)).toBeTruthy();
    expect(router.state.location.search).toBe('?tab=suppliers');
  });

  it('falls back to Task Management for an invalid tab', async () => {
    await goto('/admin?tab=banana');
    expect(await screen.findByText(/Task Definitions \(\d+\)/)).toBeTruthy();
  });

  it('blocks a non-admin reception user from the admin area', async () => {
    auth.isAdmin.mockReturnValue(false);
    auth.getSession.mockReturnValue({ staffId: 'reception-1', name: 'Reception', role: 'reception', location: 'brisbane', loginAt: '2026-08-02T00:00:00.000Z' });
    await goto('/admin?tab=staff');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(screen.queryByText('Staff Accounts')).toBeNull();
  });
});
