// Have I Been Pwned's range API (docs/auth-security.md §1). Only the first 5 characters of the
// password's SHA-1 leave the server (k-anonymity), with padding so the response size gives
// nothing away. If the service is down or slow, the password is allowed and the error logged
// (owner's decision, 2026-11-02): length rules still apply, and sign-up keeps working.
import { createHash } from 'node:crypto';

export type BreachCheck = (password: string) => Promise<boolean>;

export type BreachCheckOptions = {
  mode: 'live' | 'mock';
  timeoutMs?: number;
  log?: (message: string) => void;
};

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const DEFAULT_TIMEOUT_MS = 3000;

// Mock mode has no network, so E2E tests can still see the refusal with these.
export const MOCK_BREACHED = ['password1234', 'qwertyuiop', '1234567890', 'iloveyou123'];

export function createBreachCheck({
  mode,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  log = (message) => console.error(message),
}: BreachCheckOptions): BreachCheck {
  if (mode === 'mock') return async (password) => MOCK_BREACHED.includes(password.toLowerCase());

  return async (password) => {
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    try {
      const response = await fetch(`${RANGE_URL}${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        log(`[breached-passwords] check skipped: service answered ${response.status}`);
        return false;
      }
      // Lines are SUFFIX:COUNT. Padding lines have a count of 0.
      return (await response.text()).split('\n').some((line) => {
        const [candidate, count] = line.trim().split(':');
        return candidate === suffix && Number(count) > 0;
      });
    } catch (error) {
      log(`[breached-passwords] check skipped: ${error instanceof Error ? error.name : 'error'}`);
      return false;
    }
  };
}
