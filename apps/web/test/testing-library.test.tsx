import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

// These two run in order: the second fails if Testing Library doesn't clean up between tests.
it('renders a component', () => {
  render(<p>first render</p>);
  expect(screen.getByText('first render')).toBeTruthy();
});

it('starts the next test with an empty page', () => {
  expect(screen.queryByText('first render')).toBeNull();
  expect(document.body.innerHTML).toBe('');
});
