// The admin's audit log filters (`/audit?entity=&actor=&removed=1&page=`), read from the URL.
// Rows from removed accounts (test admins, deleted customers) are hidden unless removed=1.
import { z } from 'zod';

import { id } from './fields';
import { page } from './search';

export const AUDIT_ENTITIES = ['product', 'category', 'setting', 'inquiry'] as const;

export const auditListInput = z
  .object({
    entity: z.enum(AUDIT_ENTITIES).optional(),
    actor: id.optional(),
    removed: z
      .enum(['1'])
      .optional()
      .transform((value) => value === '1'),
    page: page.default(1),
  })
  .strict();

export type AuditListInput = z.infer<typeof auditListInput>;
