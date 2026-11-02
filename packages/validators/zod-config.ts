// Imported first by every schema module. Zod 4 probes for `new Function` to speed up object
// parsing, and the browser reports that probe as a CSP violation on our nonce pages
// (docs/auth-security.md §3.2). Jitless parsing never tries, and the forms are small.
import { z } from 'zod';

z.config({ jitless: true });
