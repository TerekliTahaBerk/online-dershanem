import { Check, Star, TrendingUp } from "lucide-react";

export function HeroLessonMockup() {
  const students = ["LGS", "YKS", "Mat", "Soru"];

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-[26px] border border-[var(--site-line)] bg-white shadow-[0_24px_60px_-34px_rgba(20,20,15,0.35)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--site-line)] bg-[var(--site-bg-warm)] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
          <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
          <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
        </div>
        <span className="rounded-full bg-[var(--brand-orange-soft)] px-3 py-1 text-[10px] font-bold text-[var(--brand-orange-ink)] sm:text-[12px]">
          Canlı matematik dersi
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1.2fr_.8fr] sm:p-6 lg:p-8">
        <div className="rounded-[22px] bg-[linear-gradient(160deg,var(--brand-orange-tint),#ffffff_48%,#f7f4ea)] p-4 sm:p-6">
          <div className="flex min-h-[210px] flex-col justify-between rounded-[18px] border border-[var(--site-line)] bg-white p-5">
            <div>
              <p className="text-[12px] font-semibold uppercase text-[var(--site-muted)]">Bugünkü ders</p>
              <h3 className="mt-2 font-display text-[28px] leading-none text-[var(--site-ink)] sm:text-[38px]">
                Problemler ve birlikte çözüm
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {students.map((student) => (
                <span
                  key={student}
                  className="flex aspect-square items-center justify-center rounded-2xl bg-[var(--brand-orange-soft)] text-[12px] font-bold text-[var(--brand-orange-ink)]"
                >
                  {student}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            ["En fazla 4 öğrenci", "Herkes soru sorar"],
            ["Ders sonrası takip", "Sıradaki çalışma net"],
            ["₺3.000 / ay", "Eski fiyat ₺5.000 / ay"],
            ["LGS / YKS", "Sınava göre grup"],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[18px] border border-[var(--site-line)] bg-white p-4">
              <p className="text-[14px] font-bold text-[var(--site-ink)]">{title}</p>
              <p className="mt-1 text-[12px] text-[var(--site-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Yardımcı: küçük görev/konu çipi */
function TaskChip({ label, tag, done }: { label: string; tag: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--site-line)] bg-white px-2.5 py-2">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] ${
          done ? "bg-[var(--brand-orange)] text-white" : "border border-[var(--site-line)] bg-[var(--site-bg-warm)]"
        }`}
        aria-hidden="true"
      >
        {done ? <Check size={11} strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10.5px] font-medium text-[var(--site-ink)]">{label}</span>
        <span className="block text-[9px] text-[var(--site-muted)]">{tag}</span>
      </span>
    </div>
  );
}

/**
 * Haftalık planlayıcı mockup — "Her şeyi tek yerden yönet" görseli.
 * Tamamen CSS/DOM ile üretilir; görsel asset yoktur.
 */
export function PlannerMockup() {
  const days = [
    { day: "Pzt", tasks: [{ l: "Türev — kurallar", t: "YKS", d: true }, { l: "Problemler", t: "YKS" }] },
    { day: "Sal", tasks: [{ l: "Fonksiyonlar", t: "YKS", d: true }, { l: "Deneme analizi", t: "YKS", d: true }] },
    { day: "Çar", tasks: [{ l: "Çarpanlara ayırma", t: "LGS" }, { l: "Ödev kontrolü", t: "Plan" }] },
    { day: "Per", tasks: [{ l: "İntegral giriş", t: "AYT" }] },
  ];
  return (
    <div
      aria-hidden="true"
      className="rounded-[20px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-3 shadow-[0_20px_50px_-24px_rgba(20,20,15,0.28)] sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-[var(--site-ink)]">Haftalık plan</span>
        <span className="rounded-full bg-[var(--brand-orange-soft)] px-2 py-0.5 text-[9.5px] font-semibold text-[var(--brand-orange-ink)]">
          08 – 14 Eyl
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {days.map((col) => (
          <div key={col.day} className="rounded-xl bg-white/70 p-2">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--site-muted)]">
              {col.day}
            </div>
            <div className="flex flex-col gap-2">
              {col.tasks.map((t, i) => (
                <TaskChip key={i} label={t.l} tag={t.t} done={t.d} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Aylık performans raporu mockup — ilerleme halkası + branş barları.
 * Değerler temsilîdir (etiketlenmiştir).
 */
export function ReportMockup() {
  const rows = [
    { subject: "YKS Temel", value: 78 },
    { subject: "YKS İleri", value: 64 },
    { subject: "Geometri", value: 52 },
    { subject: "Problemler", value: 71 },
  ];
  return (
    <div className="rounded-[20px] border border-[var(--site-line)] bg-white p-5 shadow-[0_20px_50px_-24px_rgba(20,20,15,0.28)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold text-[var(--site-ink)]">Aylık gelişim raporu</div>
          <div className="text-[10.5px] text-[var(--site-muted)]">Örnek görünüm · temsilîdir</div>
        </div>
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full text-[12px] font-bold text-white"
          style={{ background: "conic-gradient(var(--brand-orange) 78%, var(--site-line) 0)" }}
          aria-hidden="true"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--brand-orange-ink)]">
            %78
          </span>
        </span>
      </div>
      <ul className="flex flex-col gap-3" aria-hidden="true">
        {rows.map((r) => (
          <li key={r.subject}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--site-body)]">
              <span>{r.subject}</span>
              <span className="font-semibold text-[var(--site-ink)]">{r.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--site-line-soft)]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${r.value}%`,
                  background: "linear-gradient(90deg, var(--brand-orange-bright), var(--brand-orange))",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Öğretmen kadrosu mockup — baş harf avatarlı profil kartları (sahte foto yok).
 */
export function TeacherRosterMockup() {
  const teachers = [
    { initials: "AY", role: "Matematik Öğretmeni", tag: "YKS · İleri matematik" },
    { initials: "MK", role: "Matematik Öğretmeni", tag: "YKS · Temel matematik" },
    { initials: "SD", role: "Matematik Öğretmeni", tag: "LGS · 8. sınıf" },
  ];
  return (
    <div
      aria-hidden="true"
      className="rounded-[20px] border border-[var(--site-line)] bg-white p-4 shadow-[0_20px_50px_-24px_rgba(20,20,15,0.28)]"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-[var(--site-ink)]">Öğretmen kadrosu</span>
        <span className="text-[10px] text-[var(--site-muted)]">En fazla 4 öğrenci</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {teachers.map((t) => (
          <div key={t.initials} className="rounded-xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-orange-soft)] text-[12px] font-bold text-[var(--brand-orange-ink)]">
              {t.initials}
            </span>
            <div className="mt-2.5 text-[11px] font-semibold text-[var(--site-ink)]">{t.role}</div>
            <div className="mt-0.5 text-[9.5px] text-[var(--site-muted)]">{t.tag}</div>
            <div className="mt-2 flex items-center gap-0.5 text-[var(--brand-orange)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={9} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Veliye haftalık not — telefon mockup (referanstaki telefon kartına benzer).
 * İçerik "Örnek" olarak işaretlenmiştir.
 */
export function ParentNoteMockup() {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[34px] border-[7px] border-[#1B1B18] bg-[var(--site-bg-warm)] p-3 shadow-[0_28px_60px_-24px_rgba(20,20,15,0.4)]">
        <div className="mb-3 flex items-center justify-between px-1 pt-1">
          <span className="text-[11px] font-semibold text-[var(--site-ink)]">Haftalık Durum Notu</span>
          <span className="rounded-full bg-[var(--brand-orange-soft)] px-2 py-0.5 text-[9px] font-semibold text-[var(--brand-orange-ink)]">
            Örnek
          </span>
        </div>
        <div className="flex flex-col gap-2.5" aria-hidden="true">
          <div className="rounded-2xl rounded-tl-md bg-white p-3 text-[11px] leading-5 text-[var(--site-body)] shadow-sm">
            <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--site-muted)]">
              Bu hafta işlenen
            </div>
            Çarpanlara ayırma · Özdeşlikler
          </div>
          <div className="rounded-2xl rounded-tl-md bg-white p-3 text-[11px] leading-5 text-[var(--site-body)] shadow-sm">
            <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--site-muted)]">
              Öğretmen notu
            </div>
            “Özdeşliklerde belirgin ilerleme var. Bu hafta işlem hızına biraz daha pratik iyi olur — ödev buna göre.”
          </div>
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[var(--brand-orange)] p-3 text-[11px] leading-5 text-white shadow-sm">
            Teşekkürler, süreci net görebiliyoruz.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Konu başlıklarında örnek gelişim grafiği — sonuçlar bölümü.
 * Değerler temsilîdir; kesin başarı verisi olarak sunulmaz.
 */
export function NetGrowthMockup() {
  const bars = [
    { label: "Mat", value: 92 },
    { label: "Geo", value: 70 },
    { label: "Prob", value: 80 },
    { label: "Türev", value: 62 },
  ];
  return (
    <div className="rounded-[20px] border border-[var(--site-line)] bg-white p-5">
      <div className="mb-1 flex items-center gap-2 text-[var(--brand-orange-ink)]">
        <TrendingUp size={16} strokeWidth={2} aria-hidden="true" />
        <span className="text-[12px] font-semibold">Konu başlıklarına göre örnek gelişim</span>
      </div>
      <p className="mb-4 text-[11px] text-[var(--site-muted)]">Temsilî görünüm</p>
      <div className="flex h-32 items-end justify-between gap-3" aria-hidden="true">
        {bars.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-lg"
              style={{
                height: `${b.value}%`,
                background: "linear-gradient(180deg, var(--brand-orange-bright), var(--brand-orange))",
              }}
            />
            <span className="text-[10px] font-medium text-[var(--site-muted)]">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
