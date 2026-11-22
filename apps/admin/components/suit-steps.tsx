// Adding a suit, top to bottom (owner, 2026-11-22: make adding suits easy): Details, then Photos,
// then Publish. Each step's state comes from the same rules Publish checks (core publishErrors),
// so the bar and the Publish button always agree.

type State = 'done' | 'current' | 'todo';
export type Step = { label: string; href: string; state: State };

type FieldErrors = Record<string, string[]>;

type Input =
  | { isNew: true }
  | { isNew?: false; problems: FieldErrors; status: 'draft' | 'published' | 'archived' };

/** The three steps and where each stands. */
export function stepsFor(input: Input): Step[] {
  if (input.isNew) {
    return [
      { label: 'Details', href: '#details', state: 'current' },
      { label: 'Photos', href: '#media-heading', state: 'todo' },
      { label: 'Publish', href: '#publish', state: 'todo' },
    ];
  }
  const keys = Object.keys(input.problems);
  const detailsDone = keys.every((key) => key === 'media' || key === 'checks');
  const photosDone = !keys.includes('media');
  const published = input.status === 'published';
  const done = [detailsDone, photosDone, published];
  // The first step not done is the one to work on now.
  const next = done.indexOf(false);
  const stateOf = (i: number): State => (done[i] ? 'done' : i === next ? 'current' : 'todo');
  return [
    { label: 'Details', href: '#details', state: stateOf(0) },
    { label: 'Photos', href: '#media-heading', state: stateOf(1) },
    { label: 'Publish', href: '#publish', state: stateOf(2) },
  ];
}

const CIRCLE: Record<State, string> = {
  done: 'border-deep bg-deep text-action-fg',
  current: 'border-deep bg-bg text-deep',
  todo: 'border-border-strong bg-bg text-muted',
};

/** The step bar at the top of the new-suit and suit pages. */
export function SuitSteps({ steps, isNew = false }: { steps: Step[]; isNew?: boolean }) {
  return (
    <nav aria-label="Steps to publish" className="mb-10">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {steps.map((step, i) => {
          const content = (
            <>
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-small font-bold ${CIRCLE[step.state]}`}
              >
                {step.state === 'done' ? (
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className={step.state === 'todo' ? 'text-muted' : 'font-bold text-deep'}>
                {step.label}
              </span>
              {step.state === 'done' && <span className="sr-only"> (Done)</span>}
              {step.state === 'done' && (
                <span aria-hidden="true" className="text-small text-muted">
                  Done
                </span>
              )}
            </>
          );
          return (
            <li key={step.label} className="flex items-center gap-3">
              {isNew ? (
                <span className="flex min-h-11 items-center gap-2">{content}</span>
              ) : (
                <a
                  href={step.href}
                  aria-current={step.state === 'current' ? 'step' : undefined}
                  className="flex min-h-11 items-center gap-2 rounded-full px-2 hover:bg-surface-soft"
                >
                  {content}
                </a>
              )}
              {i < steps.length - 1 && (
                <span aria-hidden="true" className="h-0.5 w-6 bg-border-strong sm:w-10" />
              )}
            </li>
          );
        })}
      </ol>
      {isNew && (
        <p className="mt-2 text-small text-muted">Photos come next, once the details are saved.</p>
      )}
    </nav>
  );
}
