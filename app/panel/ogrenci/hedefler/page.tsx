import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getStudentGoals } from "@/lib/panel/goals";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelHeading, PanelEmpty } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · HEDEFLER — onaylı tasarım (Panel.dc.html → sGoals).
 *
 * Tasarımın her satırı iki parçadır: hedef ("Matematik neti 25") ve şu anki
 * değer ("şimdi 19,00"). Hedef saklanır, ŞU ANKİ DEĞER HER SEFERİNDE gerçek
 * veriden hesaplanır (`lib/panel/goals.ts`) — saklansa yeni deneme girildiği
 * anda bayatlar ve öğrenciye yanlış ilerleme gösterirdi.
 *
 * Ölçüm yoksa çubuk ÇİZİLMEZ: o derste henüz deneme girilmemişken %0 çizmek
 * "hedeften çok uzaksın" demek olurdu ki bu doğru değil.
 *
 * ÜRÜN KAPSAMI: Online Koçum (OK) — hedefler koçla birlikte belirlenir.
 */

const NUM = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const RANK = new Intl.NumberFormat("tr-TR");

/* Tasarımın bant renkleri: hedefe uzakken kehribar, yakınken/ulaşınca yeşil. */
const BAND_COLOR = {
  met: "bg-dc-brand",
  close: "bg-dc-brand",
  behind: "bg-[#E0A34A]",
} as const;

export default async function StudentGoalsPage() {
  const session = await requireProductRole("OK", "STUDENT");

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, targetGoal: true, targetRank: true, classLevel: true },
  });

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Hedefler"
    >
      <div className="max-w-[860px]">{body}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Hedefler" />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında hedeflerin burada görünür."
        />
      </>,
    );
  }

  const [goals, coaching] = await Promise.all([
    getStudentGoals(profile.id),
    getStudentCoaching(profile.id),
  ]);

  const examLine = [profile.targetGoal, profile.classLevel]
    .filter(Boolean)
    .join(" · ");

  return shell(
    <>
      <PanelHeading
        title="Hedefler"
        description={
          coaching
            ? `${coaching.coachName} ile belirlediğin hedefler ve şu anki durumun.`
            : "Belirlenen hedeflerin ve şu anki durumun."
        }
      />

      {examLine || profile.targetRank ? (
        <PanelCard className="mt-6">
          <p className="text-[13px] text-dc-ink-faint">Sınav hedefi</p>
          <p className="mt-1 text-[22px] font-extrabold text-dc-ink">
            {examLine || "Sınav belirlenmedi"}
            {profile.targetRank ? ` · hedef sıralama ${RANK.format(profile.targetRank)}` : ""}
          </p>
          <p className="mt-1.5 text-[13.5px] leading-[1.6] text-dc-ink-muted">
            Hedef sıralama için gereken net aralığını koçun belirler.
          </p>
        </PanelCard>
      ) : null}

      {goals.length === 0 ? (
        <PanelEmpty
          title="Henüz hedef belirlenmedi."
          body="Koçunla birlikte net ve plan hedeflerini belirlediğinizde burada takip edebilirsin."
        />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {goals.map((goal) => (
            <PanelCard key={goal.id} className="px-[22px] py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[15px] font-semibold text-dc-ink">
                <span>{goal.label}</span>
                <span className="text-dc-ink-muted">
                  {goal.current === null
                    ? "ölçüm yok"
                    : goal.kind === "PLAN_COMPLETION"
                      ? `şimdi %${goal.current}`
                      : `şimdi ${NUM.format(goal.current)}`}
                </span>
              </div>

              {goal.percent !== null && goal.band !== null ? (
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-dc-line-soft"
                  role="progressbar"
                  aria-valuenow={goal.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.label} ilerlemesi`}
                >
                  <div
                    className={`h-full rounded-full ${BAND_COLOR[goal.band]}`}
                    style={{ width: `${goal.percent}%` }}
                  />
                </div>
              ) : null}

              {goal.nearTermNote ? (
                <p className="mt-2 text-[13px] text-dc-ink-muted">
                  Yakın hedef: {goal.nearTermNote}
                </p>
              ) : null}

              <p className="mt-2 text-[12.5px] text-dc-ink-faint">
                {goal.current === null
                  ? "Bu başlıkta henüz ölçüm yok; ilerleme çizilmiyor."
                  : `Kaynak: ${goal.basis}`}
              </p>
            </PanelCard>
          ))}
        </div>
      )}
    </>,
  );
}
