import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { loadParentLessons } from "@/lib/panel/parent-lessons-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildContext } from "@/components/panel/parent/child-context";
import {
  PanelHeading,
  buttonClass,
  PanelCard,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
  PanelEmpty,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * VELİ · DERSLER — onaylı tasarım (Panel.dc.html → pLessons).
 *
 * Tasarımın işlev tanımı: tarih / ders ve konu / öğretmen / katılım tablosu,
 * altında "Son dersin özeti" ve gizlilik notu.
 *
 * GİZLİLİK: yalnızca ORTAK ders notu (`studentId: null`) okunur. Öğretmenin
 * öğrenciye özel notu sorguya HİÇ girmez — veliye sızma ihtimali kalmaz.
 */

const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

export default async function ParentLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(
    session.userId,
    studentId,
  );
  // Hangi çocuğun verisine bakıldığı başlığın özellik satırında (§9.7).
  const childContext = <ChildContext options={children} selectedId={selected?.id ?? null} basePath="/panel/veli/takvim" />;

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Dersler"
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Dersler" />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde ders takvimi burada görünür."
        />
      </>,
    );
  }

  if (!selected.products.includes("OD")) {
    return shell(
      <>
        <PanelHeading title="Dersler" metadata={childContext} />
        <PanelEmpty
          title="Bu hesapta canlı ders ürünü bulunmuyor."
          body="onlinedershanem. eklendiğinde ders takvimi ve katılım burada görünür."
        />
      </>,
    );
  }

  // Ortak yükleyici (mobil `GET /api/panel/parent/lessons` ile aynı): yalnız
  // ortak ders notunun konusu seçilir; öğrenciye özel not sorguya girmez.
  const { lessons, lastSummary } = await loadParentLessons(selected);


  return shell(
    <>
      <PanelHeading title="Dersler" metadata={childContext} actions={<a href={`/api/panel/calendar/export?studentId=${encodeURIComponent(selected.id)}`} className={buttonClass("secondary", "md")}>Takvime ekle (.ics)</a>} />

      {lessons.length === 0 ? (
        <PanelEmpty
          title="Henüz ders kaydı yok."
          body="Dersler planlandıkça tarih, öğretmen ve katılım bilgisi burada listelenir."
        />
      ) : (
        <>
          <PanelTable
            caption={`${selected.name} ders listesi`}
            columns={["Tarih", "Ders ve konu", "Öğretmen", "Katılım"]}
          >
            {lessons.map((lesson) => (
                <PanelTableRow key={lesson.id}>
                  <PanelTableCell>{DAY.format(lesson.startsAt)}</PanelTableCell>
                  <PanelTableCell>
                    {lesson.title}
                    {lesson.topic ? ` · ${lesson.topic}` : ""}
                  </PanelTableCell>
                  <PanelTableCell>{lesson.teacherName || "—"}</PanelTableCell>
                  <PanelTableCell
                    tone={
                      lesson.attendance.key === "ABSENT"
                        ? "warn"
                        : lesson.attendance.key === "PRESENT" || lesson.attendance.key === "EXCUSED"
                          ? "ok"
                          : "default"
                    }
                  >
                    {lesson.attendance.label}
                  </PanelTableCell>
                </PanelTableRow>
            ))}
          </PanelTable>

          <PanelCard className="mt-5 max-w-[760px]">
            <h2 className="text-[15px] font-bold text-dc-ink">
              Son dersin özeti
            </h2>
            <p className="mt-2 text-[14.5px] leading-[1.65] text-(--pd-ink-3)">
              {lastSummary ||
                "Öğretmen henüz ders özeti eklemedi. Eklendiğinde burada görünecek."}
            </p>
            <p className="mt-2.5 text-[12.5px] text-dc-ink-faint">
              Öğretmenin öğrenciye özel notları veliyle paylaşılmaz.
            </p>
          </PanelCard>
        </>
      )}
    </>,
  );
}
