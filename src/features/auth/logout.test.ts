import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, type ReactNode } from 'react';
import { AppLayout } from '../../app/AppLayout.tsx';
import { LogoutButton } from './LogoutButton.tsx';

const { logout, navigate } = vi.hoisted(() => ({ logout: vi.fn(), navigate: vi.fn() }));

vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

vi.mock('../../services/authService.ts', () => ({
  getSession: () => ({ staffId: 'admin-user', name: 'Administrator', role: 'admin', loginAt: '2026-08-02T00:00:00.000Z' }),
  isAdmin: () => true,
  logout,
}));

vi.mock('../../services/authService', () => ({
  getSession: () => ({ staffId: 'admin-user', name: 'Administrator', role: 'admin', loginAt: '2026-08-02T00:00:00.000Z' }),
  isAdmin: () => true,
  logout,
}));

function renderWithRouter(component: ReactNode) {
  return render(
    createElement(MemoryRouter, { initialEntries: ['/'] }, component)
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('logout navigation', () => {
  it('waits for AppLayout logout to finish before navigating', async () => {
    let resolveLogout!: () => void;
    logout.mockImplementation(() => new Promise<void>(resolve => { resolveLogout = resolve; }));

    renderWithRouter(createElement(AppLayout));
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign out' })[0]);

    expect(navigate).not.toHaveBeenCalled();
    resolveLogout();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'));
  });

  it('navigates safely after LogoutButton sign-out fails', async () => {
    logout.mockRejectedValue(new Error('network unavailable'));

    renderWithRouter(createElement(LogoutButton));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'));
  });
});
