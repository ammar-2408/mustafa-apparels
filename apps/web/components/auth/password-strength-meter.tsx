import { passwordStrength } from '@mustafa/validators/password-strength';

// Four segments that fill as the password gets stronger, plus the word, so colour is never the
// only signal. Ink and border tokens only: the brand has no accent colour. The live region is
// on the page from the start, so screen readers announce the first rating too.
export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  const empty = password.length === 0;
  return (
    <div className="flex flex-col gap-2">
      {empty ? null : (
        <div className="flex gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={`h-1 flex-1 rounded-sm ${score >= step ? 'bg-fg' : 'bg-border'}`}
            />
          ))}
        </div>
      )}
      <p aria-live="polite" className="text-small text-muted empty:hidden">
        {empty ? '' : `Password strength: ${label}`}
      </p>
    </div>
  );
}
