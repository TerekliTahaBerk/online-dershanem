import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getStudentGoals, type GoalView } from "@/lib/panel/goals";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { PanelShell } from "@/components/panel/panel-shell";
import { EmptyState, PageHeader, PropertyList, PropertyRow, Section, StatusBadge } from "@/components/panel/ui";

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

const NUM = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const RANK = new Intl.NumberFormat("tr-TR");

/* Bant renkleri: hedefe uzakken kehribar, yakınken/ulaşınca ürün vurgusu. */
const BAND_COLOR = {
  met: "bg-pn-accent",
  close: "bg-pn-accent-marker",
  behind: "bg-(--pn-tone-warning)",
} as const;

/* Hedefler türüne göre gruplanır (docs/panel-design-roadmap.md §10.3). */
const GROUPS: Array<{ id: string; title: string; kinds: GoalView["kind"][] }> = [
  { id: "sinav", title: "Sınav hedefi", kinds: ["EXAM_TARGET", "SCORE_TARGET"] },
  { id: "dersler", title: "Ders netleri", kinds: ["SUBJECT_NET"] },
  { id: "haftalik", title: "Haftalık", kinds: ["WEEKLY_STUDY_MINUTES", "WEEKLY_QUESTION_COUNT", "PLAN_COMPLETION"] },
  { id: "odak", title: "Odak", kinds: ["SUBJECT_FOCUS"] },
];

function currentLabel(goal: GoalView): string {
  if (goal.current === null) return "henüz ölçülmedi";
  return goal.kind === "PLAN_COMPLETION" ? `şu an %${goal.current}` : `şu an ${NUM.format(goal.current)}`;
}

export default async function StudentGoalsPage() {
  const session = await requireProductRole("OK", "STUDENT");

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, targetGoal: true, targetRank: true, classLevel: true },
  });

  const shell = (body: React.ReactNode) => (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Hedefler">
      <div className="max-w-[860px]">{body}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PageHeader title="Hedeflerim" />
        <EmptyState
          className="mt-6"
          title="Hesabını hazırlıyoruz."
          body="Her şey hazır olduğunda hedeflerini burada göreceksin."
        />
      </>,
    );
  }

  const [goals, coaching] = await Promise.all([getStudentGoals(profile.id), getStudentCoaching(profile.id)]);
  const examLine = [profile.targetGoal, profile.classLevel].filter(Boolean).join(" · ");

  return shell(
    <>
      <PageHeader
        title="Hedeflerim"
        description={
          coaching
            ? `${coaching.coachName} ile belirlediğin hedefler ve onlara ne kadar yaklaştığın. Hedeflerini koçun günceller.`
            : "Hedeflerin ve onlara ne kadar yaklaştığın."
        }
      />

      {examLine || profile.targetRank ? (
        <Section id="profil-hedefi" title="Sınav ve sıralama" divider={false}>
          <PropertyList>
            <PropertyRow label="Sınav">{examLine || "Henüz seçilmedi"}</PropertyRow>
            {profile.targetRank ? (
              <PropertyRow label="Hedef sıralama">
                {RANK.format(profile.targetRank)}
                <span className="text-pn-text-muted"> · gereken net aralığını koçunla belirleyeceksiniz</span>
              </PropertyRow>
            ) : null}
          </PropertyList>
        </Section>
      ) : null}

      {goals.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Henüz bir hedefin yok."
          body="Koçunla birlikte hedeflerini belirlediğinizde ilerlemeni buradan takip edebilirsin."
        />
      ) : (
        GROUPS.map((group) => {
          const items = goals.filter((goal) => group.kinds.includes(goal.kind));
          if (!items.length) return null;
          return (
            <Section key={group.id} id={`hedef-${group.id}`} title={group.title}>
              <ul className="border-t border-pn-border">
                {items.map((goal) => (
                  <li
                    key={goal.id}
                    className="grid gap-1 border-b border-pn-border py-3 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-pn-text">
                        {goal.label}
                        {goal.status === "ACHIEVED" ? (
                          <span className="ml-2 inline-block align-middle">
                            <StatusBadge label="Başardın!" tone="success" />
                          </span>
                        ) : goal.status === "PAUSED" ? (
                          <span className="ml-2 inline-block align-middle">
                            <StatusBadge label="Duraklatıldı" tone="neutral" />
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[12.5px] text-pn-text-muted">
                        {goal.current === null
                          ? "Bu hedef için henüz ölçüm yok; ilk veri gelince ilerlemeni göreceksin."
                          : `Kaynak: ${goal.basis}`}
                        {goal.nearTermNote ? ` · Yakın hedef: ${goal.nearTermNote}` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-[13px] tabular-nums text-pn-text-secondary sm:text-right">{currentLabel(goal)}</p>
                      {goal.percent !== null && goal.band !== null ? (
                        <div
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-pn-surface-subtle"
                          role="progressbar"
                          aria-valuenow={goal.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${goal.label} ilerlemesi`}
                        >
                          <div className={`h-full rounded-full ${BAND_COLOR[goal.band]}`} style={{ width: `${goal.percent}%` }} />
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          );
        })
      )}
    </>,
  );
}
