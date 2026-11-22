// Takes the place of a field label above a button in a filter row, so the button lines up with
// the input box rather than with the hint under it. Hidden when the row stacks on small screens.
// Same type as the card-look field labels (owner, 2026-11-22), so it takes the same height.
export function LabelSpacer({ from = 'sm' }: { from?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`invisible mb-2 hidden text-body font-bold ${from === 'md' ? 'md:block' : 'sm:block'}`}
    >
      Search
    </span>
  );
}
