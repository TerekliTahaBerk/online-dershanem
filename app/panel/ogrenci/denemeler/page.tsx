import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { MockExamWorkspace } from "@/components/panel/mock-exam-workspace";
import { mockExamViewInclude, toMockExamView } from "@/lib/mock-exam-view";
import { netScore } from "@/lib/goals";
import { PanelPageHeader, PanelCard, PanelEmpty, PanelFilterLink } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · DENEME SONUCU — onaylı tasarım (Panel.dc.html → scExam).
 *
 * Tasarımın işlev tanımı: üst şeritte toplam net / önceki denemeye göre fark /
 * tarih / süre; solda ders bazında bar + D-Y-net dökümü ve kendi denemelerine
 * göre gelişim.
 *
 * KARŞILAŞTIRMA KURALI: tasarım açıkça "Karşılaştırma yalnızca kendi geçmiş
 * denemelerinle yapılır" diyor — başka öğrenciyle/kohortla kıyas YOK.
 */

const FULL = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const fmt = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const net = (s: { correctCount: number; incorrectCount: number }) =>
  netScore(s.correctCount, s.incorrectCount);

export default async function StudentExamResultPage({
  searchParams,
}: {
  searchParams: Promise<{ deneme?: string }>;
}) {
  const session = await requireRole("STUDENT");
  if (!getPanelFeatureFlags().mockExamAnalysis) notFound();

  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Dış deneme sonuçları"
    >
      <div className="max-w-[1040px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelPageHeader title="Dış deneme sonuçların" />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında dış deneme sonuçların burada açılır."
        />
      </>,
    );
  }

  const exams = await prisma.mockExam.findMany({
    where: { studentId: profile.id },
    orderBy: { takenAt: "desc" },
    take: 10,
    include: { sections: { orderBy: { position: "asc" } } },
  });

  /*
   * Deneme GİRİŞİ öğrencinin kendi ekranında olmalı.
   * `MockExamWorkspace` öğretmen, veli ve yönetim sayfalarında render
   * ediliyordu; öğrencide tasarım geçişinde düşmüş ve öğrenci kendi deneme
   * sonucunu giremez hale gelmişti.
   */
  const entryExams = await prisma.mockExam.findMany({
    where: { studentId: profile.id },
    orderBy: { takenAt: "desc" },
    take: 40,
    include: mockExamViewInclude,
  });
  const examEntry = (
    <MockExamWorkspace
      role={session.role}
      students={[{ id: profile.id, name: session.fullName || session.email }]}
      initialExams={entryExams.map(toMockExamView)}
    />
  );

  if (exams.length === 0) {
    return shell(
      <>
        <PanelPageHeader
          title="Dış deneme sonuçların"
          description="Okulda, kursta veya başka bir platformda çözdüğün denemenin sonucunu gelişim takibine ekleyebilirsin."
        />
        <div className="mt-6">{examEntry}</div>
      </>,
    );
  }

  const requested = (await searchParams).deneme;
  const current = exams.find((e) => e.id === requested) ?? exams[0];
  const currentIndex = exams.findIndex((e) => e.id === current.id);
  const previous = exams[currentIndex + 1];

  const total = current.sections.reduce((sum, s) => sum + net(s), 0);
  const delta = previous
    ? total - previous.sections.reduce((sum, s) => sum + net(s), 0)
    : null;

  const maxNet = Math.max(...current.sections.map((s) => Math.max(net(s), 1)));

  // Kendi geçmişi — eskiden yeniye
  const history = [...exams].reverse();
  const historyNets = history.map((e) => e.sections.reduce((sum, s) => sum + net(s), 0));

  return shell(
    <>
      <PanelPageHeader
        eyebrow="Dış Deneme Sonuçları"
        title={current.title || current.exam}
        actions={
          exams.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {exams.slice(0, 5).map((e) => (
                <PanelFilterLink
                  key={e.id}
                  href={`/panel/ogrenci/denemeler?deneme=${e.id}`}
                  active={e.id === current.id}
                >
                  {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(
                    e.takenAt,
                  )}
                </PanelFilterLink>
              ))}
            </div>
          ) : undefined
        }
      />

      <div className="mt-5 flex flex-wrap items-end gap-9 border-b border-dc-line pb-5">
        <div>
          <p className="text-[13px] text-dc-ink-faint">Toplam net</p>
          <p className="text-[40px] font-extrabold tracking-[-0.025em] text-dc-ink">
            {fmt(total)}
          </p>
        </div>
        {delta !== null ? (
          <div>
            <p className="text-[13px] text-dc-ink-faint">Önceki denemeye göre</p>
            <p
              className={`text-[24px] font-extrabold ${
                delta >= 0 ? "text-dc-brand-hover" : "text-[#8A5F37]"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {fmt(delta)}
            </p>
          </div>
        ) : null}
        <div>
          <p className="text-[13px] text-dc-ink-faint">Tarih</p>
          <p className="text-[18px] font-bold text-dc-ink">{FULL.format(current.takenAt)}</p>
        </div>
        {current.durationMinutes ? (
          <div>
            <p className="text-[13px] text-dc-ink-faint">Süre</p>
            <p className="text-[18px] font-bold text-dc-ink">{current.durationMinutes} dk</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <div>
          <h2 className="text-[16px] font-bold text-dc-ink">Ders bazında</h2>
          <ul className="mt-3.5">
            {current.sections.map((s, i) => {
              const value = net(s);
              const pct = Math.max(4, Math.round((value / maxNet) * 100));
              return (
                <li
                  key={s.id}
                  className={`flex flex-wrap items-center gap-3.5 py-3 ${
                    i < current.sections.length - 1 ? "border-b border-dc-line-soft" : ""
                  }`}
                >
                  <span className="w-24 shrink-0 text-[14px] font-semibold text-dc-ink">
                    {s.subjectName}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-dc-line-soft"
                  >
                    <span
                      className="block h-full rounded-full bg-dc-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-right text-[13px] text-dc-ink-muted">
                    {s.correctCount}D / {s.incorrectCount}Y · {fmt(value)}
                  </span>
                </li>
              );
            })}
          </ul>

          {history.length >= 2 ? (
            <>
              <h2 className="mt-7 text-[16px] font-bold text-dc-ink">
                Kendi denemelerine göre
              </h2>
              <svg
                viewBox="0 0 520 140"
                className="mt-3 h-[150px] w-full"
                role="img"
                aria-label={`Toplam net gelişimi: ${historyNets.map((n) => fmt(n)).join(", ")}`}
              >
                {[20, 70, 118].map((y) => (
                  <line key={y} x1="0" y1={y} x2="520" y2={y} stroke="var(--dc-line-soft)" />
                ))}
                <polyline
                  points={historyNets
                    .map((n, i) => {
                      const min = Math.min(...historyNets);
                      const span = Math.max(...historyNets) - min || 1;
                      const x = Math.round((i * 520) / (historyNets.length - 1));
                      const y = Math.round(118 - ((n - min) / span) * 90);
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="var(--dc-brand)"
                  strokeWidth="2.5"
                />
              </svg>
              <p className="text-[12.5px] text-dc-ink-ghost">
                Karşılaştırma yalnızca kendi geçmiş denemelerinle yapılır.
              </p>
            </>
          ) : null}
        </div>
      </div>

      {current.nextAction ? (
        <PanelCard className="mt-6">
          <h2 className="text-[15px] font-bold text-dc-ink">Bir sonraki denemeye kadar</h2>
          <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">
            {current.nextAction}
          </p>
        </PanelCard>
      ) : null}

      <div className="mt-8">{examEntry}</div>
    </>,
  );
}
