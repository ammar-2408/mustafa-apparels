// A rough strength meter for the sign-up and reset forms (docs/auth-security.md §1). It only
// guides: the rules are the length limits and the breached-password check on the server.
// Kept small on purpose, since zxcvbn would add about 400 kB to the page.
import { PASSWORD_MIN } from './auth';

export const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: (typeof STRENGTH_LABELS)[number] };

const SEQUENCES = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];
const COMMON = ['password', 'iloveyou', 'welcome', 'letmein', 'admin', 'mustafa', 'apparels'];
const RUN = 6;

function looksPredictable(password: string) {
  const lower = password.toLowerCase();
  if (new Set(lower).size <= 3) return true;
  if (COMMON.some((word) => lower.includes(word))) return true;
  return SEQUENCES.some((sequence) => {
    for (let i = 0; i + RUN <= sequence.length; i++) {
      if (lower.includes(sequence.slice(i, i + RUN))) return true;
    }
    return false;
  });
}

export function passwordStrength(password: string): Strength {
  if (password.length < PASSWORD_MIN) return { score: 0, label: STRENGTH_LABELS[0] };

  let score = password.length >= 20 ? 4 : password.length >= 16 ? 3 : password.length >= 12 ? 2 : 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) => kind.test(password));
  if (kinds.length >= 3) score += 1;
  if (looksPredictable(password)) score = Math.min(score, 1);

  const capped = Math.min(score, 4) as Strength['score'];
  return { score: capped, label: STRENGTH_LABELS[capped] };
}
