import { serializeJsonLd } from '../lib/seo';

// Server-rendered structured data (docs/design.md §8.3), escaped by serializeJsonLd.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
