/**
 * Root-level loading skeleton — Next.js App Router segmenti yüklenirken görünür.
 * Tüm panel-dışı public sayfalar için varsayılan loading UI.
 */
export default function Loading() {
  return (
    <div className="site-scope min-h-screen bg-[var(--site-bg-warm)]">
      <div className="mx-auto max-w-[1080px] px-5 py-16 sm:px-8">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded-md bg-[var(--site-line)]" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-[var(--site-line-soft)]" />
        </div>

        {/* Content blocks skeleton */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[24px] border border-[var(--site-line)] bg-white p-6">
              <div className="h-5 w-1/3 animate-pulse rounded bg-[var(--site-line)]" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-[var(--site-line-soft)]" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--site-line-soft)]" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--site-line-soft)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
