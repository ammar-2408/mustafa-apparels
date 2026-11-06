import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InquiryForm, THANK_YOU } from './inquiry-form';

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });

describe('InquiryForm', () => {
  it('shows field errors in the browser and sends nothing for an empty form', () => {
    const submit = vi.fn();
    render(<InquiryForm productId="p1" suitName="Black Suit" submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(screen.getByText('Enter your name')).toBeTruthy();
    expect(screen.getByText('Add a phone number or an email')).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it('sends the suit, the start time and the empty trap field, then thanks the shopper', async () => {
    const submit = vi.fn(async () => ({ ok: true as const, data: { inquiryId: 'i1' } }));
    render(<InquiryForm productId="p1" suitName="Black Suit" submit={submit} />);
    fill('Name', 'Ayesha');
    fill('Phone or WhatsApp', '0300 1234567');
    fill('Your question', 'Is it in stock?');
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(THANK_YOU));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p1',
        name: 'Ayesha',
        website: '',
        startedAt: expect.stringMatching(/^\d+$/),
      }),
    );
  });

  it('shows what the server refused', async () => {
    const submit = vi.fn(async () => ({
      ok: false as const,
      error: { code: 'RATE_LIMITED' as const, message: 'Too many messages.' },
    }));
    render(<InquiryForm productId="p1" suitName="Black Suit" submit={submit} />);
    fill('Name', 'Ayesha');
    fill('Email', 'ayesha@example.com');
    fill('Your question', 'Hello');
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Too many messages.'));
  });
});
