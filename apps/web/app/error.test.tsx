import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import ErrorPage from './error';

it('never shows the error itself, and Try again calls reset', () => {
  const reset = vi.fn();
  const error = Object.assign(new Error('relation "product" does not exist at line 3'), {
    digest: 'abc123',
  });
  const { container } = render(<ErrorPage error={error} reset={reset} />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Something went wrong');
  expect(container.textContent).not.toContain('relation');
  expect(container.textContent).not.toContain('abc123');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(reset).toHaveBeenCalledOnce();
});
