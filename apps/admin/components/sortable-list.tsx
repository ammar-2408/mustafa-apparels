'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

type Item = { id: string };

type SortableListProps<T extends Item> = {
  items: T[];
  /** Called with the ids in their new order. */
  onReorder: (ids: string[]) => void;
  /** What a screen reader calls the row ("Dhanak"). */
  labelOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  disabled?: boolean;
  /** For grids of thumbnails; rows by default. */
  className?: string;
};

// Drag by the handle (mouse, touch, or the keyboard: Space, arrows, Space), or use the Move
// buttons. Both end in onReorder, so the parent saves one way.
export function SortableList<T extends Item>({
  items,
  onReorder,
  labelOf,
  renderItem,
  disabled = false,
  className = 'flex flex-col gap-2',
}: SortableListProps<T>) {
  const sensors = useSensors(
    // A short move before a drag starts, so a tap on a phone still scrolls and clicks.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((item) => item.id);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    onReorder(arrayMove(ids, from, to));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul className={className}>
          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              id={item.id}
              label={labelOf(item)}
              first={index === 0}
              last={index === items.length - 1}
              disabled={disabled}
              onUp={() => move(index, index - 1)}
              onDown={() => move(index, index + 1)}
            >
              {renderItem(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

type SortableRowProps = {
  id: string;
  label: string;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onUp: () => void;
  onDown: () => void;
  children: ReactNode;
};

const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-sm border border-border text-fg hover:border-border-strong disabled:opacity-40';

function SortableRow({
  id,
  label,
  first,
  last,
  disabled,
  onUp,
  onDown,
  children,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-sm border border-border bg-surface p-2 ${
        isDragging ? 'relative z-10 shadow-soft' : ''
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={`${iconButton} cursor-grab touch-none`}
        aria-label={`Drag to reorder ${label}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⋮⋮</span>
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        className={iconButton}
        aria-label={`Move ${label} up`}
        disabled={disabled || first}
        onClick={onUp}
      >
        <span aria-hidden="true">↑</span>
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={`Move ${label} down`}
        disabled={disabled || last}
        onClick={onDown}
      >
        <span aria-hidden="true">↓</span>
      </button>
    </li>
  );
}
