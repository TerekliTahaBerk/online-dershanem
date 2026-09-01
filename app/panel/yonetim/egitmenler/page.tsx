import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
  PanelEmpty,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ADMIN · EĞİTMENLER — onaylı tasarım (Panel.dc.html → aEdu).
 *
 * Tasarımın sütunları: eğitmen, yetki, ders, sınav, kapasite.
 *
 * KAPASİTE GERÇEK VERİDEN: tasarımdaki "9 / 12 saat" haftalık ders saati
 * kotasını varsayıyor; şemada öğretmen başına kota alanı YOK. Uydurma bir
 * tavan üretmek yerine gerçekten ölçülebilen şey gösterilir: aktif grup
 * sayısı, toplam öğrenci ve grup kapasitesinin doluluğu. Doluluk oranı
 * `Group.capacity` üzerinden hesaplanır — bu alan şemada gerçekten var.
 *
 * "Yetki" sütunu rolün kendisidir; şemada "öğretmen + koç" ayrımı yok, o
 * yüzden uydurulmaz.
 */

export default async function AdminEducatorsPage() {
  const session = await requireRole("ADMIN");

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      teacherProfile: { select: { subjects: true } },
      taughtGroups: {
        where: { isActive: true },
        select: {
          level: true,
          capacity: true,
          _count: { select: { enrollments: true } },
        },
      },
    },
  });

  const overCapacity = teachers.filter((t) =>
    t.taughtGroups.some((g) => g._count.enrollments > g.capacity),
  ).length;

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Öğretmenler"
    >
      <div className="max-w-[1080px]">
        <PanelHeading
          title="Öğretmenler"
          description={`${teachers.length} öğretmen${
            overCapacity ? ` · ${overCapacity} kapasite üstünde` : ""
          }`}
          actions={
            <Link
              href="/panel/yonetim/kullanicilar"
              className="rounded-[10px] bg-dc-brand px-[18px] py-[11px] text-[14px] font-bold text-white transition-colors hover:bg-dc-brand-hover"
            >
              Öğretmen ekle
            </Link>
          }
        />

        {teachers.length === 0 ? (
          <PanelEmpty
            title="Kayıtlı öğretmen yok."
            body="Öğretmen hesabı açıldığında ders alanı, grupları ve doluluğu burada listelenir."
          />
        ) : (
          <div className="mt-5">
            <PanelTable
              caption="Öğretmenler ve grup doluluğu"
              columns={["Öğretmen", "Durum", "Ders", "Sınav", "Doluluk", ""]}
            >
              {teachers.map((teacher) => {
                const groups = teacher.taughtGroups;
                const seats = groups.reduce((sum, g) => sum + g.capacity, 0);
                const filled = groups.reduce((sum, g) => sum + g._count.enrollments, 0);
                const pct = seats ? Math.round((filled / seats) * 100) : null;
                const over = groups.some((g) => g._count.enrollments > g.capacity);
                const levels = [...new Set(groups.map((g) => g.level).filter(Boolean))];
                const subjects = teacher.teacherProfile?.subjects ?? [];

                return (
                  <PanelTableRow key={teacher.id}>
                    <PanelTableCell>
                      <Link
                        href={`/panel/yonetim/kullanicilar/${teacher.id}`}
                        className="text-[14px] font-bold text-dc-ink underline-offset-2 hover:text-dc-brand-hover hover:underline"
                      >
                        {teacher.fullName || teacher.email}
                      </Link>
                    </PanelTableCell>
                    <PanelTableCell tone={teacher.status === "ACTIVE" ? undefined : "warn"}>
                      {teacher.status === "ACTIVE" ? "Aktif" : "Askıda"}
                    </PanelTableCell>
                    <PanelTableCell>{subjects.length ? subjects.join(", ") : "—"}</PanelTableCell>
                    <PanelTableCell>{levels.length ? levels.join(" · ") : "—"}</PanelTableCell>
                    <PanelTableCell tone={over ? "warn" : undefined}>
                      {groups.length === 0
                        ? "Aktif grup yok"
                        : `${filled} / ${seats} kontenjan${pct === null ? "" : ` · %${pct}`}${
                            over ? " · aşıldı" : ""
                          }`}
                    </PanelTableCell>
                    <PanelTableCell>
                      <Link
                        href={`/panel/yonetim/kullanicilar/${teacher.id}`}
                        className="text-[13px] font-semibold text-dc-brand hover:underline"
                      >
                        Öğretmeni gör
                      </Link>
                    </PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
