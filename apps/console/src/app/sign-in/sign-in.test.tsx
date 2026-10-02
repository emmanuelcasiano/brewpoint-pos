import { ApiRequestError, OFFLINE_MESSAGE, type StaffMe } from '@brewpoint/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api-client';
import { App } from '../App';

vi.mock('../../lib/api-client', () => ({
  api: {
    signIn: vi.fn(),
    verifyTwoStep: vi.fn(),
    beginTwoStepSetup: vi.fn(),
    confirmTwoStepSetup: vi.fn(),
    signOut: vi.fn(),
    me: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

function maria(stage: StaffMe['stage'], twoStepOn: boolean): StaffMe {
  return {
    stage,
    staff: { id: 's1', name: 'Maria Santos', email: 'maria@brewpoint.ph' },
    role: { id: 'r1', name: 'Superadmin' },
    twoStepOn,
  };
}

const SETUP = {
  secret: 'JBSWY3DPEHPK3PXP',
  otpauthUri:
    'otpauth://totp/BrewPoint:maria%40brewpoint.ph?secret=JBSWY3DPEHPK3PXP&issuer=BrewPoint',
};

function renderAt(path: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return user;
}

async function signInAs(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email'), 'maria@brewpoint.ph');
  await user.type(screen.getByLabelText('Password'), 'correct horse battery');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.me.mockRejectedValue(new ApiRequestError(401, 'signed_out', 'Sign in to continue.'));
});

describe('staff sign-in with two-step on', () => {
  beforeEach(() => {
    mocked.signIn.mockResolvedValue({ stage: 'two_step', offerTwoStepSetup: false });
  });

  it('asks for the code after the password, then opens the console', async () => {
    mocked.me
      .mockRejectedValueOnce(new ApiRequestError(401, 'signed_out', 'Sign in to continue.'))
      .mockResolvedValue(maria('two_step', true));
    mocked.verifyTwoStep.mockResolvedValue(maria('active', true));
    const user = renderAt('/');

    await signInAs(user);
    expect(await screen.findByRole('heading', { name: 'Two-step sign-in' })).toBeVisible();
    await user.type(screen.getByLabelText('Six-digit code'), '12a3456');
    expect(screen.getByLabelText('Six-digit code')).toHaveValue('123456');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));

    expect(await screen.findByRole('heading', { name: 'Signed in as Maria Santos' })).toBeVisible();
    expect(mocked.verifyTwoStep).toHaveBeenCalledWith({ code: '123456' });
    expect(screen.queryByText('Two-step sign-in is off.')).not.toBeInTheDocument();
  });

  it('comes back to the code step after a reload in the middle of signing in', async () => {
    mocked.me.mockResolvedValue(maria('two_step', true));
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Two-step sign-in' })).toBeVisible();
  });

  it('shows a wrong code under the field, and asks for six digits before sending', async () => {
    mocked.me.mockResolvedValue(maria('two_step', true));
    mocked.verifyTwoStep.mockRejectedValue(
      new ApiRequestError(401, 'wrong_code', 'Wrong code. Enter the newest six-digit code.', {
        field: 'code',
      }),
    );
    const user = renderAt('/two-step');

    await user.type(await screen.findByLabelText('Six-digit code'), '123');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));
    expect(screen.getByLabelText('Six-digit code')).toHaveAccessibleDescription(
      'Enter the six-digit code from your authenticator app.',
    );
    expect(mocked.verifyTwoStep).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Six-digit code'), '456');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Six-digit code')).toHaveAccessibleDescription(
        'Wrong code. Enter the newest six-digit code.',
      ),
    );
    expect(screen.getByLabelText('Six-digit code')).toHaveValue('');
  });

  it('goes back to sign-in, saying why, when the sign-in has ended', async () => {
    mocked.me.mockResolvedValue(maria('two_step', true));
    mocked.verifyTwoStep.mockRejectedValue(
      new ApiRequestError(
        401,
        'sign_in_again',
        'Your sign-in took too long or has ended. Sign in again.',
      ),
    );
    const user = renderAt('/two-step');

    await user.type(await screen.findByLabelText('Six-digit code'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your sign-in took too long or has ended.',
    );
  });
});

describe('two-step setup', () => {
  it('requires setup on the second sign-in, with no way to skip it', async () => {
    mocked.signIn.mockResolvedValue({ stage: 'two_step_setup', offerTwoStepSetup: false });
    mocked.me
      .mockRejectedValueOnce(new ApiRequestError(401, 'signed_out', 'Sign in to continue.'))
      .mockResolvedValue(maria('two_step_setup', false));
    mocked.beginTwoStepSetup.mockResolvedValue(SETUP);
    mocked.confirmTwoStepSetup.mockResolvedValue(maria('active', true));
    const user = renderAt('/');

    await signInAs(user);

    expect(
      await screen.findByRole('img', { name: 'Two-step setup code for maria@brewpoint.ph' }),
    ).toBeVisible();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeVisible();
    expect(screen.getByText(/required for every staff account/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Set up later' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Six-digit code'), '654321');
    await user.click(screen.getByRole('button', { name: 'Turn on two-step sign-in' }));

    expect(await screen.findByRole('heading', { name: 'Signed in as Maria Santos' })).toBeVisible();
    expect(mocked.confirmTwoStepSetup).toHaveBeenCalledWith({ code: '654321' });
  });

  it('offers setup on the first sign-in, with "Set up later" and a reminder', async () => {
    mocked.signIn.mockResolvedValue({ stage: 'active', offerTwoStepSetup: true });
    mocked.me
      .mockRejectedValueOnce(new ApiRequestError(401, 'signed_out', 'Sign in to continue.'))
      .mockResolvedValue(maria('active', false));
    mocked.beginTwoStepSetup.mockResolvedValue(SETUP);
    const user = renderAt('/');

    await signInAs(user);
    await user.click(await screen.findByRole('button', { name: 'Set up later' }));

    expect(await screen.findByRole('heading', { name: 'Signed in as Maria Santos' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Two-step sign-in is off. You must set it up before your next sign-in.',
    );
  });

  it('says so when setup cannot start offline, and tries again', async () => {
    mocked.me.mockResolvedValue(maria('two_step_setup', false));
    mocked.beginTwoStepSetup
      .mockRejectedValueOnce(new ApiRequestError(0, 'offline', OFFLINE_MESSAGE))
      .mockResolvedValue(SETUP);
    const user = renderAt('/two-step/setup');

    const banner = await screen.findByText(OFFLINE_MESSAGE);
    expect(banner.closest('.bp-banner')).toHaveClass('bp-banner--offline');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeVisible();
  });
});

describe('sign in', () => {
  it('shows a locked account in a warning banner', async () => {
    mocked.signIn.mockRejectedValue(
      new ApiRequestError(
        423,
        'account_locked',
        'Too many wrong tries. This account is locked until 3:15 PM.',
      ),
    );
    const user = renderAt('/sign-in');

    await signInAs(user);

    const banner = await screen.findByRole('status');
    expect(banner).toHaveClass('bp-banner--warning');
    expect(banner).toHaveTextContent('locked until 3:15 PM');
  });

  it('signs out from the console', async () => {
    mocked.me.mockResolvedValue(maria('active', true));
    mocked.signOut.mockResolvedValue(undefined);
    const user = renderAt('/');

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
