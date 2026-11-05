// The admin's audit log filters (`/audit?entity=&actor=&page=`), read from the URL.
import { z } from 'zod';

import { id } from './common';
import { page } from './search';

export const AUDIT_ENTITIES = ['product', 'category', 'setting', 'inquiry'] as const;

export const auditListInput = z
  .object({
    entity: z.enum(AUDIT_ENTITIES).optional(),
    actor: id.optional(),
    page: page.default(1),
  })
  .strict();

export type AuditListInput = z.infer<typeof auditListInput>;
