// The body of the admin → storefront revalidate call (docs/api.md §4).
import { z } from 'zod';

// The only cache tags the storefront accepts. Ids and slugs are word characters and hyphens.
export const REVALIDATE_TAG = /^(products|categories|settings|product:[\w-]+|category:[\w-]+)$/;

export const revalidateTag = z.string().max(160).regex(REVALIDATE_TAG, 'Unknown cache tag');

export const revalidateBody = z.object({ tags: z.array(revalidateTag).min(1).max(20) }).strict();

export type RevalidateBody = z.infer<typeof revalidateBody>;
