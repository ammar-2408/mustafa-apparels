// The message for the whole form. On the page from the start, so screen readers announce it.
export function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-small text-error empty:hidden">
      {message}
    </p>
  );
}
