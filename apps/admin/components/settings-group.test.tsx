import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ updateSiteSettings: vi.fn() }));
vi.mock('../app/(panel)/settings/actions', () => actions);

import { SettingsGroup } from './settings-group';

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  actions.updateSiteSettings.mockReset().mockResolvedValue({ ok: true, data: {} });
});

describe('SettingsGroup', () => {
  const contact = [
    { key: 'whatsapp', label: 'WhatsApp number', kind: 'text' as const },
    { key: 'email', label: 'Email', kind: 'text' as const },
  ];

  it('sends only the keys that changed', async () => {
    render(
      <SettingsGroup
        title="Contact"
        fields={contact}
        values={{ whatsapp: '+923482799707', email: 'shop@example.com' }}
      />,
    );
    type('WhatsApp number', '0300 1234567');
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    await screen.findByText('Saved.');
    expect(actions.updateSiteSettings.mock.calls).toEqual([
      [{ key: 'whatsapp', value: '0300 1234567' }],
    ]);
  });

  it('says so when nothing changed, and skips empty settings never filled in', async () => {
    render(
      <SettingsGroup
        title="Contact"
        fields={contact}
        values={{ whatsapp: '+923482799707', email: null }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    expect(await screen.findByText('Nothing changed.')).toBeTruthy();
    expect(actions.updateSiteSettings).not.toHaveBeenCalled();
  });

  it('builds an object setting from its fields, leaving empty ones out', async () => {
    render(
      <SettingsGroup
        title="Social links"
        fields={[
          { key: 'socials', part: 'instagram', label: 'Instagram', kind: 'text' },
          { key: 'socials', part: 'facebook', label: 'Facebook', kind: 'text' },
        ]}
        values={{ socials: null }}
      />,
    );
    type('Instagram', 'https://www.instagram.com/mustafaapparels');
    fireEvent.click(screen.getByRole('button', { name: 'Save social links' }));
    await waitFor(() =>
      expect(actions.updateSiteSettings).toHaveBeenCalledWith({
        key: 'socials',
        value: { instagram: 'https://www.instagram.com/mustafaapparels' },
      }),
    );
  });

  it('shows a refused value under its field', async () => {
    actions.updateSiteSettings.mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Check',
        fieldErrors: { value: ['Enter a Pakistani mobile number'] },
      },
    });
    render(
      <SettingsGroup title="Contact" fields={contact} values={{ whatsapp: null, email: null }} />,
    );
    type('WhatsApp number', '042 1234567');
    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
    expect(await screen.findByText('Enter a Pakistani mobile number')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/not saved/);
  });
});
