import { ApiRequestError, OFFLINE_MESSAGE, type ShopMe } from '@brewpoint/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api-client';
import { App } from '../App';

vi.mock('../../lib/api-client', () => ({
  api: {
    signIn: vi.fn(),
    signOut: vi.fn(),
    me: vi.fn(),
    forgotPassword: vi.fn(),
    passwordLink: vi.fn(),
    setPassword: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const CARLO: ShopMe = {
  user: { id: 'u1', name: 'Carlo Reyes', email: 'carlo@kapedavao.test' },
  shop: { id: 't1', name: 'Kape Davao', accentHex: '#E2A13B' },
  branches: [{ id: 'b1', name: 'Main branch' }],
  roles: [{ branchId: null, roleName: 'Owner' }],
  surface: 'backoffice',
  device: null,
};

const signedOut = () => new ApiRequestError(401, 'signed_out', 'Sign in to continue.');

function renderAt(path: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return user;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.me.mockRejectedValue(signedOut());
});

describe('sign in', () => {
  it('checks the session first, then asks a signed-out person to sign in', async () => {
    let finish: (error: unknown) => void = () => {};
    mocked.me.mockReturnValue(new Promise((_, reject) => (finish = reject)));
    renderAt('/');

    expect(screen.getByRole('status')).toHaveTextContent('Checking your sign-in…');
    finish(signedOut());

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('signs in with email and password and lands on the signed-in page', async () => {
    mocked.signIn.mockResolvedValue(CARLO);
    const user = renderAt('/sign-in');

    await user.type(await screen.findByLabelText('Email'), 'carlo@kapedavao.test');
    await user.type(screen.getByLabelText('Password'), 'brewpoint-demo');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Kape Davao' })).toBeVisible();
    expect(screen.getByText('Signed in as Carlo Reyes')).toBeVisible();
    expect(mocked.signIn).toHaveBeenCalledWith({
      email: 'carlo@kapedavao.test',
      password: 'brewpoint-demo',
    });
  });

  it('asks for a missing email and password under each field, without calling the server', async () => {
    const user = renderAt('/sign-in');

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email.');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password.');
    expect(mocked.signIn).not.toHaveBeenCalled();
  });

  it('shows a wrong password under the password field and clears it', async () => {
    mocked.signIn.mockRejectedValue(
      new ApiRequestError(
        401,
        'wrong_credentials',
        'Wrong email or password. Check both and try again.',
      ),
    );
    const user = renderAt('/sign-in');

    await user.type(await screen.findByLabelText('Email'), 'carlo@kapedavao.test');
    await user.type(screen.getByLabelText('Password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const password = screen.getByLabelText('Password');
    await waitFor(() =>
      expect(password).toHaveAccessibleDescription(
        'Wrong email or password. Check both and try again.',
      ),
    );
    expect(password).toHaveValue('');
    expect(password).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a locked account in a warning banner', async () => {
    mocked.signIn.mockRejectedValue(
      new ApiRequestError(
        423,
        'account_locked',
        'Too many wrong tries. This account is locked until 3:15 PM.',
      ),
    );
    const user = renderAt('/sign-in');

    await user.type(await screen.findByLabelText('Email'), 'carlo@kapedavao.test');
    await user.type(screen.getByLabelText('Password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const banner = await screen.findByRole('status');
    expect(banner).toHaveClass('bp-banner--warning');
    expect(banner).toHaveTextContent('locked until 3:15 PM');
  });

  it('says so, in a neutral banner, when the server cannot be reached', async () => {
    mocked.me.mockRejectedValue(new ApiRequestError(0, 'offline', OFFLINE_MESSAGE));
    renderAt('/');

    await screen.findByRole('heading', { name: 'Sign in' });
    const banner = screen.getByRole('status');
    expect(banner).toHaveClass('bp-banner--offline');
    expect(banner).toHaveTextContent(OFFLINE_MESSAGE);
  });

  it('explains a session that ended after 12 hours without activity', async () => {
    mocked.me.mockRejectedValue(
      new ApiRequestError(
        401,
        'session_expired',
        'You were signed out after 12 hours without activity. Sign in again.',
      ),
    );
    renderAt('/');

    await screen.findByRole('heading', { name: 'Sign in' });
    expect(screen.getByRole('status')).toHaveTextContent(
      'You were signed out after 12 hours without activity. Sign in again.',
    );
  });

  it('signs out back to the sign-in page', async () => {
    mocked.me.mockResolvedValue(CARLO);
    mocked.signOut.mockResolvedValue(undefined);
    const user = renderAt('/');

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(mocked.signOut).toHaveBeenCalledOnce();
  });
});

describe('forgot password', () => {
  it('sends the link and says the same thing for any email', async () => {
    mocked.forgotPassword.mockResolvedValue(undefined);
    const user = renderAt('/forgot-password');

    await user.type(screen.getByLabelText('Email'), 'carlo@kapedavao.test');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'If carlo@kapedavao.test has a BrewPoint account, a reset link is on its way. It works for 1 hour.',
    );
  });

  it('asks for the email before sending', async () => {
    const user = renderAt('/forgot-password');

    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Enter the email you sign in with.',
    );
    expect(mocked.forgotPassword).not.toHaveBeenCalled();
  });
});

describe('set password', () => {
  const INVITE = { purpose: 'invite' as const, name: 'Iris Cruz', email: 'iris@kapedavao.test' };

  it('refuses a link with no token, offering a new one', async () => {
    renderAt('/set-password');

    expect(await screen.findByRole('heading', { name: 'This link cannot be used' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Request a new link' })).toBeVisible();
    expect(mocked.passwordLink).not.toHaveBeenCalled();
  });

  it('checks the link before showing the form', async () => {
    let finish: (link: typeof INVITE) => void = () => {};
    mocked.passwordLink.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderAt('/set-password?token=abc');

    expect(await screen.findByText('Checking your link…')).toBeVisible();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    finish(INVITE);

    expect(await screen.findByLabelText('New password')).toBeVisible();
    expect(screen.queryByText('Checking your link…')).not.toBeInTheDocument();
  });

  it('shows why an expired link cannot be used', async () => {
    mocked.passwordLink.mockRejectedValue(
      new ApiRequestError(400, 'link_invalid', 'This link has expired or was already used.'),
    );
    const user = renderAt('/set-password?token=abc');

    expect(await screen.findByText('This link has expired or was already used.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Request a new link' }));
    expect(await screen.findByRole('heading', { name: 'Reset your password' })).toBeVisible();
  });

  it('checks the length and the repeat, sets the password, and sends the person to sign in', async () => {
    mocked.passwordLink.mockResolvedValue(INVITE);
    mocked.setPassword.mockResolvedValue(undefined);
    const user = renderAt('/set-password?token=abc');

    expect(await screen.findByText('iris@kapedavao.test')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Set your password' })).toBeVisible();
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Type it again'), 'shorter');
    await user.click(screen.getByRole('button', { name: 'Set password' }));
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(
      /Use at least 10 characters/,
    );
    expect(screen.getByLabelText('Type it again')).toHaveAccessibleDescription(
      'The two passwords do not match. Type the same password twice.',
    );
    expect(mocked.setPassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('New password'));
    await user.clear(screen.getByLabelText('Type it again'));
    await user.type(screen.getByLabelText('New password'), 'my first password');
    await user.type(screen.getByLabelText('Type it again'), 'my first password');
    await user.click(screen.getByRole('button', { name: 'Set password' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Password set. Sign in with your new password.',
    );
    expect(mocked.setPassword).toHaveBeenCalledWith({
      token: 'abc',
      password: 'my first password',
    });
  });
});
