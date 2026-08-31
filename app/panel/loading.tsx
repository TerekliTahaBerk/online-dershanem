function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-dc-line-soft/70 ${className}`} aria-hidden="true" />;
}

export default function PanelLoading() {
  return (
    <div className="site-scope dc-panel-bg flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-dc-line bg-white px-3.5 py-5 lg:flex">
        <Pulse className="h-8 w-36 rounded-lg" />
        <div className="mt-7 flex-1 space-y-2">
          <Pulse className="h-9 w-full" />
          <Pulse className="h-9 w-full" />
          <Pulse className="h-9 w-[88%]" />
          <Pulse className="h-9 w-full" />
          <Pulse className="h-9 w-[84%]" />
        </div>
        <div className="mt-5 border-t border-dc-line-soft pt-4">
          <Pulse className="h-4 w-16 rounded-md" />
          <Pulse className="mt-3 h-10 w-full" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 flex-none items-center border-b border-dc-line bg-white px-4 sm:px-7">
          <Pulse className="h-6 w-28 rounded-md" />
          <Pulse className="ml-auto h-8 w-24 rounded-full" />
        </header>

        <main className="flex-1 px-4 pb-32 pt-6 sm:px-8 sm:pb-10 sm:pt-7">
          <div className="mx-auto max-w-[1040px] space-y-5">
            <Pulse className="h-8 w-56 rounded-md" />
            <Pulse className="h-32 w-full" />
            <Pulse className="h-48 w-full" />
          </div>
        </main>
      </div>
    </div>
  );
}
