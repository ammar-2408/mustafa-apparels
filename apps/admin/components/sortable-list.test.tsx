import { act, fireEvent, render, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { SortableList } from './sortable-list';

const items = [
  { id: 'a', name: 'Dhanak' },
  { id: 'b', name: 'Khaddar' },
  { id: 'c', name: 'Lajwanti' },
];

const renderList = (props: { disabled?: boolean } = {}) => {
  const onReorder = vi.fn();
  render(
    <SortableList
      items={items}
      onReorder={onReorder}
      labelOf={(item) => item.name}
      renderItem={(item) => <span>{item.name}</span>}
      {...props}
    />,
  );
  return onReorder;
};

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

describe('SortableList', () => {
  it('shows each item with a named drag handle and Move buttons', () => {
    renderList();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Dhanak'),
      expect.stringContaining('Khaddar'),
      expect.stringContaining('Lajwanti'),
    ]);
    expect(button('Drag to reorder Khaddar')).toBeTruthy();
  });

  it('moves an item up or down by one with the buttons', () => {
    const onReorder = renderList();
    fireEvent.click(button('Move Khaddar up'));
    expect(onReorder).toHaveBeenLastCalledWith(['b', 'a', 'c']);
    fireEvent.click(button('Move Khaddar down'));
    expect(onReorder).toHaveBeenLastCalledWith(['a', 'c', 'b']);
  });

  it('cannot move the first item up or the last item down', () => {
    renderList();
    expect(button('Move Dhanak up').disabled).toBe(true);
    expect(button('Move Lajwanti down').disabled).toBe(true);
    expect(button('Move Dhanak down').disabled).toBe(false);
  });

  it('turns every control off while disabled (a save in progress)', () => {
    const onReorder = renderList({ disabled: true });
    fireEvent.click(button('Move Khaddar up'));
    expect(onReorder).not.toHaveBeenCalled();
    expect(button('Drag to reorder Khaddar').disabled).toBe(true);
  });
});

describe('SortableList hydration', () => {
  it('hydrates the server HTML with no mismatch (the dev overlay "Issue")', async () => {
    const list = (
      <SortableList
        items={items}
        onReorder={() => {}}
        labelOf={(item) => item.name}
        renderItem={(item) => <span>{item.name}</span>}
      />
    );
    // An earlier render moves dnd-kit's own id counter on, as other requests do on a server.
    renderToString(list);
    const container = document.createElement('div');
    container.innerHTML = renderToString(list);
    document.body.append(container);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, list);
    });
    const messages = errors.mock.calls.map((call) => String(call[0]));
    errors.mockRestore();
    act(() => root?.unmount());
    container.remove();
    expect(messages.filter((m) => /hydrat|didn.t match/i.test(m))).toEqual([]);
  });
});
