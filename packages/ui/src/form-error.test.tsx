import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormError } from './form-error';

describe('FormError', () => {
  it('is an alert from the start, so a later message is announced', () => {
    const { rerender } = render(<FormError message="" />);
    const alert = screen.getByRole('alert', { hidden: true });
    expect(alert.textContent).toBe('');
    rerender(<FormError message="Invalid email or password" />);
    expect(screen.getByRole('alert').textContent).toBe('Invalid email or password');
  });
});
