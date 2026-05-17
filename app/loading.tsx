/**
 * Root-level loading skeleton — Next.js App Router segmenti yüklenirken görünür.
 * Tüm panel-dışı public sayfalar için varsayılan loading UI.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-2/3 rounded-md bg-stone-200/70 animate-pulse" />
          <div className="h-4 w-1/2 rounded-md bg-stone-200/50 animate-pulse" />
        </div>

        {/* Content blocks skeleton */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="h-5 w-1/3 rounded bg-stone-200/70 animate-pulse" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-stone-100 animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-stone-100 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-stone-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
