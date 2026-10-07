function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-dc-line-soft/80 motion-reduce:animate-none ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Panel yükleme iskeleti — yeni kabukla aynı iskelet: gri kenar çubuğu,
 * 48px bağlam çubuğu, beyaz çalışma alanı (docs/panel-design-roadmap.md §6).
 * Sayfalar kabuğu kendileri çizdiği için bu sınır tüm panel bölümlerini kapsar.
 */
export default function PanelLoading() {
  return (
    <div className="site-scope pn-scope flex min-h-dvh" aria-busy="true">
      <p className="sr-only" role="status">
        Sayfa yükleniyor
      </p>
      <aside className="sticky top-0 hidden h-dvh w-[232px] flex-none flex-col border-r border-pn-border bg-pn-sidebar px-2.5 pb-3 pt-3 lg:flex xl:w-[240px]">
        <Pulse className="h-6 w-32" />
        <Pulse className="mt-3 h-10 w-full" />
        <div className="mt-6 flex-1 space-y-1.5">
          <Pulse className="h-3 w-14" />
          <Pulse className="h-8 w-full" />
          <Pulse className="h-8 w-[90%]" />
          <Pulse className="h-8 w-full" />
          <Pulse className="mt-4 h-3 w-16" />
          <Pulse className="h-8 w-[86%]" />
          <Pulse className="h-8 w-full" />
        </div>
        <div className="mt-3 border-t border-pn-border pt-3">
          <Pulse className="h-9 w-full" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-12 flex-none items-center border-b border-pn-border bg-pn-canvas px-3 sm:px-6">
          <Pulse className="h-4 w-40" />
          <Pulse className="ml-auto h-7 w-7 rounded-full" />
        </header>

        <main className="flex-1 px-4 pb-32 pt-6 sm:px-8 sm:pb-10 sm:pt-7">
          <div className="max-w-[1040px] space-y-6">
            <div className="space-y-2">
              <Pulse className="h-7 w-64" />
              <Pulse className="h-4 w-96 max-w-full" />
            </div>
            <div className="space-y-2 border-t border-pn-border pt-6">
              <Pulse className="h-10 w-full" />
              <Pulse className="h-10 w-full" />
              <Pulse className="h-10 w-[92%]" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
