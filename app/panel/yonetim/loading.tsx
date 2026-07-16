export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[var(--site-bg-warm)] px-4 py-8 sm:px-6 lg:px-10" aria-busy="true" aria-label="Yönetim paneli yükleniyor">
      <div className="mx-auto max-w-[1180px] animate-pulse">
        <div className="h-3 w-28 rounded-full bg-[#e2dfd5]" />
        <div className="mt-4 h-9 w-64 max-w-full rounded-xl bg-[#d8d5ca]" />
        <div className="mt-3 h-4 w-[430px] max-w-full rounded-full bg-[#e5e2d9]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 rounded-[24px] border border-white bg-white/70" />)}
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <div className="h-[360px] rounded-[26px] border border-white bg-white/70" />
          <div className="h-[360px] rounded-[26px] border border-white bg-white/70" />
        </div>
      </div>
      <span className="sr-only">Yönetim verileri hazırlanıyor.</span>
    </main>
  );
}
