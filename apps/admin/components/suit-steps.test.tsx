import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { stepsFor, SuitSteps } from './suit-steps';

// Quicker suit adding (owner, 2026-11-22): Details, then Photos, then Publish.
describe('stepsFor', () => {
  it('starts a new suit on Details, with photos and publishing still to do', () => {
    expect(stepsFor({ isNew: true }).map((s) => [s.label, s.state])).toEqual([
      ['Details', 'current'],
      ['Photos', 'todo'],
      ['Publish', 'todo'],
    ]);
  });

  it('marks what a saved suit has done, from the publish problems, and points to the next job', () => {
    const photosMissing = stepsFor({
      problems: { media: ['Choose a main photo'] },
      status: 'draft',
    });
    expect(photosMissing.map((s) => s.state)).toEqual(['done', 'current', 'todo']);

    const priceAndPhotos = stepsFor({
      problems: { price: ['Add a price'], media: ['Choose a main photo'] },
      status: 'draft',
    });
    expect(priceAndPhotos.map((s) => s.state)).toEqual(['current', 'todo', 'todo']);

    // Open checks are cleared just before publishing.
    const ready = stepsFor({
      problems: { checks: ['Clear the open check first'] },
      status: 'draft',
    });
    expect(ready.map((s) => s.state)).toEqual(['done', 'done', 'current']);

    const live = stepsFor({ problems: {}, status: 'published' });
    expect(live.map((s) => s.state)).toEqual(['done', 'done', 'done']);
  });
});

describe('SuitSteps', () => {
  it('is a labelled list of numbered steps, each linking to its part of the page', () => {
    render(<SuitSteps steps={stepsFor({ problems: { media: ['x'] }, status: 'draft' })} />);
    const nav = screen.getByRole('navigation', { name: 'Steps to publish' });
    const items = within(nav).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Details'),
      expect.stringContaining('Photos'),
      expect.stringContaining('Publish'),
    ]);
    const photos = within(nav).getByRole('link', { name: /Photos/ });
    expect(photos.getAttribute('href')).toBe('#media-heading');
    expect(photos.getAttribute('aria-current')).toBe('step');
    expect(within(nav).getByRole('link', { name: /Details/ }).textContent).toContain('Done');
  });

  it('links every step on a saved suit, even one still missing its details', () => {
    render(
      <SuitSteps steps={stepsFor({ problems: { price: ['Add a price'] }, status: 'draft' })} />,
    );
    const nav = screen.getByRole('navigation', { name: 'Steps to publish' });
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
  });

  it('shows plain text, not links, on a new suit, where the later steps are not on the page yet', () => {
    render(<SuitSteps steps={stepsFor({ isNew: true })} isNew />);
    const nav = screen.getByRole('navigation', { name: 'Steps to publish' });
    expect(within(nav).queryAllByRole('link')).toHaveLength(0);
    expect(nav.textContent).toContain('Photos come next, once the details are saved.');
  });
});
