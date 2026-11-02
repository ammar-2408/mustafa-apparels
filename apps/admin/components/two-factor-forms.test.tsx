import { AUTH_MESSAGES } from '@mustafa/validators/auth';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  twoFactor: { verifyTotp: vi.fn(), verifyBackupCode: vi.fn() },
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const startTwoFactorSetup = vi.hoisted(() => vi.fn());

vi.mock('../lib/auth-client', () => ({ authClient: client }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../app/(auth)/setup-2fa/actions', () => ({ startTwoFactorSetup }));

import { TwoFactorSetup } from './two-factor-setup';
import { VerifyCodeForm } from './verify-code-form';

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const press = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => vi.clearAllMocks());

describe('VerifyCodeForm', () => {
  it('checks the code format before sending', async () => {
    render(<VerifyCodeForm />);
    fill('Code from your app', '12ab');
    press(/continue/i);
    expect(await screen.findByText('Enter the 6-digit code from your app')).toBeTruthy();
    expect(client.twoFactor.verifyTotp).not.toHaveBeenCalled();
  });

  it('verifies an app code and opens the dashboard', async () => {
    client.twoFactor.verifyTotp.mockResolvedValue({ data: {}, error: null });
    render(<VerifyCodeForm />);
    fill('Code from your app', '123456');
    press(/continue/i);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(client.twoFactor.verifyTotp).toHaveBeenCalledWith({ code: '123456' });
  });

  it('takes a backup code instead, and explains a wrong one', async () => {
    client.twoFactor.verifyBackupCode.mockResolvedValue({
      data: null,
      error: { status: 401, code: 'INVALID_BACKUP_CODE' },
    });
    render(<VerifyCodeForm />);
    press(/use a backup code/i);
    fill('Backup code', 'abcde-12345');
    press(/continue/i);
    expect((await screen.findByRole('alert')).textContent).toBe(AUTH_MESSAGES.wrongCode);
    expect(client.twoFactor.verifyBackupCode).toHaveBeenCalledWith({ code: 'abcde-12345' });
  });
});

describe('TwoFactorSetup', () => {
  it('shows the wrong-password message on the field', async () => {
    startTwoFactorSetup.mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Check',
        fieldErrors: { password: ['That password is incorrect'] },
      },
    });
    render(<TwoFactorSetup />);
    fill('Your password', 'wrong');
    press(/continue/i);
    expect(await screen.findByText('That password is incorrect')).toBeTruthy();
  });

  it('shows the QR code, key and backup codes, then turns 2FA on with a code', async () => {
    startTwoFactorSetup.mockResolvedValue({
      ok: true,
      data: { qr: 'data:image/png;base64,AAAA', secret: 'JBSWY3DP', backupCodes: ['abcde-12345'] },
    });
    client.twoFactor.verifyTotp.mockResolvedValue({ data: {}, error: null });
    render(<TwoFactorSetup />);
    fill('Your password', 'correct horse battery');
    press(/continue/i);

    expect(await screen.findByTestId('totp-secret')).toHaveProperty('textContent', 'JBSWY3DP');
    expect(screen.getByRole('img', { name: /QR code/ })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Backup codes' }).textContent).toContain('abcde-12345');

    fill('Code from your app', '654321');
    press(/turn on 2fa/i);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('explains a wrong confirmation code', async () => {
    startTwoFactorSetup.mockResolvedValue({
      ok: true,
      data: { qr: 'data:image/png;base64,AAAA', secret: 'K', backupCodes: [] },
    });
    client.twoFactor.verifyTotp.mockResolvedValue({
      data: null,
      error: { status: 401, code: 'INVALID_CODE' },
    });
    render(<TwoFactorSetup />);
    fill('Your password', 'x');
    press(/continue/i);
    await screen.findByLabelText('Code from your app');
    fill('Code from your app', '111111');
    press(/turn on 2fa/i);
    expect((await screen.findByRole('alert')).textContent).toBe(AUTH_MESSAGES.wrongCode);
  });
});
