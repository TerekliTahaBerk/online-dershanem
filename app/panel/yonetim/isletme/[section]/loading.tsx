export default function BusinessSectionLoading() {
  return <div aria-busy="true" aria-label="İşletme merkezi yükleniyor" className="space-y-4"><div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200"/><div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100"/>)}</div><div className="h-80 animate-pulse rounded-2xl bg-slate-100"/></div>;
}
