type Json = Record<string, unknown>;

/**
 * Tekrar kullanılabilir JSON-LD render katmanı. Tek bir şema nesnesi veya nesne
 * dizisi alır ve her birini ayrı bir <script type="application/ld+json"> olarak
 * basar. Şema verisi `lib/seo/jsonld.ts` builder'larıyla üretilir
 * (breadcrumbJsonLd, productJsonLd, courseJsonLd, articleJsonLd).
 */
export async function SchemaJsonLd({ schema }: { schema: Json | Json[] }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const list = Array.isArray(schema) ? schema : [schema];
  return (
    <>
      {list.map((item, i) => (
        <script
          key={i}
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
import { headers } from "next/headers";
