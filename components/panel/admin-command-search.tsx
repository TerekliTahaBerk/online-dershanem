"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, CalendarDays, CreditCard, History, LayoutDashboard, Plus, Search, UsersRound, X } from "lucide-react";

const commands = [
  { label: "Kontrol merkezine git", detail: "Bugünün özeti ve uyarılar", href: "/panel/yonetim", icon: LayoutDashboard },
  { label: "Haftalık takvimi aç", detail: "Tüm dersleri gün gün gör", href: "/panel/yonetim/takvim", icon: CalendarDays },
  { label: "Kişileri aç", detail: "Öğrenci, öğretmen ve veli hesapları", href: "/panel/yonetim/kullanicilar", icon: UsersRound },
  { label: "Yeni hesap aç", detail: "Geçici parolalı kullanıcı oluştur", href: "/panel/yonetim/kullanicilar#yeni-hesap", icon: Plus },
  { label: "Grup ve dersleri aç", detail: "Eğitim operasyonu", href: "/panel/yonetim/egitim", icon: BookOpenCheck },
  { label: "Yeni grup kur", detail: "En fazla dört öğrenci", href: "/panel/yonetim/egitim#yeni-grup", icon: Plus },
  { label: "Ders planla", detail: "Gruba 60 dakikalık ders ekle", href: "/panel/yonetim/egitim#ders-planla", icon: Plus },
  { label: "Sipariş ve talepleri aç", detail: "Operasyon kuyruğu", href: "/panel/yonetim/isler", icon: CreditCard },
  { label: "İşlem geçmişini aç", detail: "Yönetim ve güvenlik kayıtları", href: "/panel/yonetim/kayitlar", icon: History },
];

export function AdminCommandSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 30);
    else setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return commands;
    return commands.filter((item) => `${item.label} ${item.detail}`.toLocaleLowerCase("tr-TR").includes(needle));
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--site-line)] bg-white text-[var(--site-muted)] transition hover:border-[#d4d0c5] hover:text-[var(--site-ink)] sm:w-[260px] sm:justify-between sm:px-3.5" aria-label="Panelde ara">
        <span className="flex items-center gap-2"><Search size={16} /><span className="hidden text-[12.5px] sm:inline">Sayfa veya işlem ara</span></span>
        <kbd className="hidden rounded-md border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--site-muted)] sm:inline">⌘K</kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[300] flex items-start justify-center bg-[#10150d]/35 px-4 pt-[12vh] backdrop-blur-[3px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Panelde ara" className="w-full max-w-[620px] overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-[0_35px_100px_-25px_rgba(20,20,15,.55)]">
            <div className="flex items-center gap-3 border-b border-[var(--site-line)] px-4 py-3">
              <Search size={18} className="text-[var(--brand-olive)]" />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && results[0]) go(results[0].href); }} className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-[var(--site-ink)] outline-none placeholder:text-[var(--site-muted)]" placeholder="Ne yapmak istiyorsunuz?" />
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--site-muted)] hover:bg-[var(--site-bg-warm)] hover:text-[var(--site-ink)]" aria-label="Aramayı kapat"><X size={16} /></button>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {results.map((item) => {
                const Icon = item.icon;
                return <button key={item.href + item.label} type="button" onClick={() => go(item.href)} className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-[var(--site-bg-warm)]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><Icon size={16} /></span><span className="min-w-0 flex-1"><span className="block text-[13px] font-bold text-[var(--site-ink)]">{item.label}</span><span className="mt-0.5 block truncate text-[11.5px] text-[var(--site-muted)]">{item.detail}</span></span><ArrowRight size={15} className="text-[var(--site-muted)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></button>;
              })}
              {!results.length ? <div className="px-4 py-10 text-center"><p className="text-sm font-bold text-[var(--site-ink)]">Sonuç bulunamadı</p><p className="mt-1 text-xs text-[var(--site-muted)]">Başka bir işlem adı deneyin.</p></div> : null}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--site-line)] bg-[var(--site-bg-warm)] px-4 py-2.5 text-[10.5px] text-[var(--site-muted)]"><span>İlk sonuca gitmek için Enter</span><span>Kapatmak için Esc</span></div>
          </div>
        </div>
      ) : null}
    </>
  );
}
