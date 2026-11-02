import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Dialog } from './dialog';

// jsdom has no showModal() or close(). The browser supplies the focus trap, Esc and focus
// return; these stand-ins only record that the dialog opens as a modal and closes.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

const renderDialog = (open: boolean, onClose = vi.fn()) => {
  const view = render(
    <Dialog open={open} onClose={onClose} title="Filters">
      <p>Pick a fabric</p>
    </Dialog>,
  );
  return { ...view, onClose };
};

describe('Dialog', () => {
  it('opens as a modal, named by its title', () => {
    renderDialog(true);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeTruthy();
    expect(screen.getByText('Pick a fabric')).toBeTruthy();
  });

  it('stays shut while closed', () => {
    renderDialog(false);
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes when its open prop turns false', () => {
    const { rerender, onClose } = renderDialog(true);
    rerender(
      <Dialog open={false} onClose={onClose} title="Filters">
        <p>Pick a fabric</p>
      </Dialog>,
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('asks to close from its close button', () => {
    const { onClose } = renderDialog(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('reports a close the browser made itself, such as Esc', () => {
    const { onClose } = renderDialog(true);
    fireEvent(screen.getByRole('dialog'), new Event('close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('asks to close on a click on the backdrop, not on its content', () => {
    const { onClose } = renderDialog(true);
    fireEvent.click(screen.getByText('Pick a fabric'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
