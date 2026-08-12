import { createElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock('../../services/authService', () => ({
  login: mocks.login,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (onLogin = vi.fn()) => {
    render(createElement(LoginPage, { onLogin }));
    return { onLogin };
  };

  const selectAccount = (name: string) => {
    fireEvent.change(screen.getByLabelText('Staff Name'), { target: { value: name } });
  };

  const enterPin = (pin: string) => {
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: pin } });
  };

  it('disables Sign In until an account and an exactly-4-digit PIN are provided', () => {
    renderPage();
    const signIn = screen.getByRole('button', { name: /sign in/i });

    expect(signIn).toBeDisabled();

    selectAccount('Administrator');
    expect(signIn).toBeDisabled();

    enterPin('123');
    expect(signIn).toBeDisabled();

    enterPin('1234');
    expect(signIn).toBeEnabled();
  });

  it('retains the selected account and surfaces the mapped error after a failed login', async () => {
    mocks.login.mockResolvedValue({ success: false, error: 'Incorrect account or PIN.' });
    renderPage();
    selectAccount('Brisbane Reception');
    enterPin('9999');

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Incorrect account or PIN.')).toBeInTheDocument();
    expect(screen.getByLabelText('Staff Name')).toHaveValue('Brisbane Reception');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  it('shows a signing-in state and disables the form while authentication is in flight', async () => {
    let resolveLogin: (value: { success: boolean }) => void = () => {};
    mocks.login.mockImplementation(() => new Promise(res => { resolveLogin = res; }));
    const onLogin = vi.fn();
    renderPage(onLogin);
    selectAccount('Administrator');
    enterPin('8711');

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const signingIn = await screen.findByRole('button', { name: /signing in/i });
    expect(signingIn).toBeDisabled();
    expect(screen.getByLabelText('Staff Name')).toBeDisabled();
    expect(screen.getByLabelText('PIN')).toBeDisabled();

    resolveLogin({ success: true });
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });

  it('falls back to a safe message when the login service throws', async () => {
    mocks.login.mockRejectedValue(new Error('unexpected'));
    renderPage();
    selectAccount('Perth Reception');
    enterPin('1001');

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Login failed.')).toBeInTheDocument();
  });
});
