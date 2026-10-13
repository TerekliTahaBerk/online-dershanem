export default function BusinessSectionLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="İşletme merkezi yükleniyor"
      className="pn-scope max-w-[1280px] space-y-4 p-6"
    >
      <div className="h-7 w-56 motion-safe:animate-pulse rounded-md bg-pn-selected" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-24 motion-safe:animate-pulse rounded-[10px] border border-pn-border bg-pn-surface-subtle"
          />
        ))}
      </div>
      <div className="h-80 motion-safe:animate-pulse rounded-[10px] border border-pn-border bg-pn-surface-subtle" />
    </div>
  );
}
