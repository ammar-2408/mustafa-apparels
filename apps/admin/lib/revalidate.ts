// Refreshes the storefront's cached pages after an admin save (docs/api.md §4). The last step of
// every mutation; it never throws, so a storefront outage can't fail the owner's save.
import 'server-only';

import { getEnv } from '@mustafa/config/env';
import { createRevalidator, type Revalidator } from '@mustafa/core/integrations/revalidate';

let revalidator: Revalidator | undefined;

export function revalidateStorefront(tags: string[]) {
  if (!revalidator) {
    const env = getEnv('admin');
    revalidator = createRevalidator({
      mode: env.INTEGRATIONS_MODE,
      webUrl: env.WEB_URL,
      secret: env.REVALIDATE_SECRET,
    });
  }
  return revalidator(tags);
}
