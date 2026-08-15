/**
 * ÜRÜN GÖRSELLERİ — arayüz eskizleri.
 *
 * Bunlar ekran görüntüsü DEĞİL, ürünün düzenini anlatan çizimlerdir; ana
 * sayfadaki ürün kartlarıyla aynı dili konuşurlar. Daha önce burada taralı
 * bir yer tutucu ve "CANLI DERS EKRAN GÖRÜNTÜSÜ" gibi büyük harfli etiketler
 * vardı — canlı sitede yarım bırakılmış bir maket gibi duruyordu.
 *
 * Kural: bu eskizler gerçek bir veri ya da sonuç iddia etmez. İçlerindeki
 * yazılar arayüz etiketidir (gün adı, bölüm başlığı), öğrenci verisi değildir.
 */

function Frame({
  label,
  height,
  children,
}: {
  label: string;
  height: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2.5 rounded-xl bg-dc-surface-muted p-3.5 ${height}`}>
      <p className="font-mono text-[10px] font-semibold tracking-[0.06em] text-[var(--dc-ink-faint)]">
        {label}
      </p>
      <div className="flex flex-1 flex-col gap-2 rounded-lg border border-dc-line bg-white p-3">
        {children}
      </div>
    </div>
  );
}

/** Canlı ders: paylaşılan tahta + en fazla dört katılımcı şeridi. */
export function LessonBoardVisual({ height = "h-[260px] sm:h-[330px]" }: { height?: string }) {
  return (
    <Frame label="CANLI DERS" height={height}>
      <div className="flex flex-1 flex-col justify-center gap-2 rounded-md bg-[#F2F7F4] px-4">
        <span className="h-2 w-[62%] rounded-full bg-[#CDE2D8]" />
        <span className="h-2 w-[84%] rounded-full bg-[#DCEAE3]" />
        <span className="h-2 w-[44%] rounded-full bg-dc-brand" />
        <span className="h-2 w-[71%] rounded-full bg-[#DCEAE3]" />
      </div>
      <div className="flex gap-2">
        <span className="h-[34px] flex-1 rounded-lg bg-[#DFEBE5]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
        <span className="h-[34px] flex-1 rounded-lg bg-[#E9F1ED]" />
      </div>
    </Frame>
  );
}

/** Öğrenci arayüzü: sıradaki ders + ödev satırları. */
export function StudentScheduleVisual({ height = "h-[200px]" }: { height?: string }) {
  return (
    <Frame label="ÖĞRENCİ EKRANI" height={height}>
      <div className="flex items-center gap-2.5 rounded-md bg-dc-brand-soft px-3 py-2.5">
        <span className="h-7 w-1 flex-none rounded-full bg-dc-brand" />
        <span className="flex flex-col gap-1.5">
          <span className="block h-2 w-[104px] rounded-full bg-[#A8CFBD]" />
          <span className="block h-2 w-[64px] rounded-full bg-[#CDE2D8]" />
        </span>
      </div>
      {[82, 64, 48].map((w, i) => (
        <div key={w} className="flex items-center gap-2.5 border-t border-dc-line-soft pt-2">
          <span
            className={`h-3.5 w-3.5 flex-none rounded-[4px] ${
              i === 0 ? "bg-dc-brand" : "border border-[#D6E2DC] bg-white"
            }`}
          />
          <span className="h-2 rounded-full bg-[#E1E8E4]" style={{ width: `${w}px` }} />
        </div>
      ))}
    </Frame>
  );
}

/** Veli özeti: katılım şeridi + ilerleme çubukları. */
export function ParentSummaryVisual({ height = "h-[200px]" }: { height?: string }) {
  return (
    <Frame label="VELİ ÖZETİ" height={height}>
      <div className="flex gap-1.5">
        {[1, 1, 1, 0, 1, 1].map((present, i) => (
          <span
            key={i}
            className={`h-6 flex-1 rounded-[5px] ${
              present ? "bg-dc-brand-soft" : "border border-dashed border-[#D6E2DC] bg-white"
            }`}
          />
        ))}
      </div>
      <div className="mt-1 flex flex-1 items-end gap-2">
        {[46, 58, 52, 74].map((h) => (
          <span
            key={h}
            className="flex-1 rounded-t-md bg-[#CDE2D8]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </Frame>
  );
}

/** Koçluk: görüşme notu + haftanın tamamlanma oranı. */
export function CoachSessionVisual({ height = "h-[260px] sm:h-[330px]" }: { height?: string }) {
  return (
    <Frame label="KOÇLUK EKRANI" height={height}>
      <div className="flex flex-col gap-1.5 rounded-md bg-[#F2F7F4] p-3">
        <span className="h-2 w-[74%] rounded-full bg-[#CDE2D8]" />
        <span className="h-2 w-[52%] rounded-full bg-[#DCEAE3]" />
      </div>
      <div className="grid grid-cols-7 gap-[5px] text-center font-mono text-[9px] font-semibold text-[var(--dc-ink-faint)]">
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[5px]">
        {[1, 1, 0, 1, 1, 0, 0].map((done, i) => (
          <span
            key={i}
            className={`h-[26px] rounded-[5px] ${
              done ? "bg-dc-brand" : "border border-dashed border-[#D6E2DC] bg-white"
            }`}
            style={done ? { opacity: i === 3 ? 0.65 : 1 } : undefined}
          />
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E4EBE7]">
          <span className="block h-full w-[58%] rounded-full bg-dc-brand" />
        </span>
      </div>
    </Frame>
  );
}
