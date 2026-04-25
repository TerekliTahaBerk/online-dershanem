import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcDaysLeft } from "@/lib/admin";
import { Package, Clock, CheckCircle2, XCircle, FileText, Tag } from "lucide-react";
import Link from "next/link";

async function getData(userId: string) {
  const now = new Date();

  const [entitlements, manualTags, attemptRows] = await Promise.all([
    // Package-based entitlements
    prisma.odkEntitlement.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        package: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        userAccessTags: {
          where: { revokedAt: null },
          select: {
            id: true,
            expiresAt: true,
            revokedAt: true,
            accessTag: {
              select: {
                id: true,
                title: true,
                description: true,
                examTags: {
                  select: {
                    exam: {
                      select: {
                        id: true,
                        title: true,
                        cadenceFamily: true,
                        durationMinutes: true,
                        status: true,
                        sections: { select: { questionCount: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Manual (non-entitlement) access tags
    prisma.odkUserAccessTag.findMany({
      where: { userId, entitlementId: null },
      select: {
        id: true,
        source: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        accessTag: {
          select: {
            id: true,
            title: true,
            description: true,
            examTags: {
              select: {
                exam: {
                  select: {
                    id: true,
                    title: true,
                    cadenceFamily: true,
                    durationMinutes: true,
                    status: true,
                    sections: { select: { questionCount: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.odkExamAttempt.findMany({
      where: { userId },
      select: { examId: true, status: true, score: true },
    }),
  ]);

  const attemptMap = new Map(attemptRows.map((r) => [r.examId, r]));

  function enrichExams(examTags: Array<{ exam: { id: string; title: string; cadenceFamily: string; durationMinutes: number; status: string; sections: Array<{ questionCount: number }> } }>) {
    return examTags
      .map((et) => ({
        ...et.exam,
        totalQuestions: et.exam.sections.reduce((s, sec) => s + sec.questionCount, 0),
        myAttempt: attemptMap.get(et.exam.id) ?? null,
      }))
      .filter((e) => e.status === "PUBLISHED");
  }

  const isActive = (expiresAt: Date | null, revokedAt: Date | null) =>
    !revokedAt && (!expiresAt || expiresAt > now);

  const enrichedEntitlements = entitlements.map((ent) => {
    const active = isActive(ent.expiresAt, ent.revokedAt) && ent.status === "ACTIVE";
    const dLeft = ent.expiresAt && active
      ? Math.max(0, calcDaysLeft(ent.expiresAt, now))
      : null;

    const allExams = ent.userAccessTags.flatMap((uat) => enrichExams(uat.accessTag.examTags));
    // Deduplicate exams by id
    const seen = new Set<string>();
    const exams = allExams.filter((e) => seen.has(e.id) ? false : (seen.add(e.id), true));

    return { ...ent, isActive: active, daysLeft: dLeft, exams };
  });

  const enrichedManualTags = manualTags.map((uat) => {
    const active = isActive(uat.expiresAt, uat.revokedAt);
    const dLeft = uat.expiresAt && active
      ? Math.max(0, calcDaysLeft(uat.expiresAt, now))
      : null;
    return { ...uat, isActive: active, daysLeft: dLeft, exams: enrichExams(uat.accessTag.examTags) };
  });

  return { entitlements: enrichedEntitlements, manualTags: enrichedManualTags };
}

const familyLabels: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", LGS: "LGS", KPSS: "KPSS", ALES: "ALES",
};

export default async function PaketimPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/odk/giris");

  const { entitlements, manualTags } = await getData(session.user.id);

  const activeEntitlements = entitlements.filter((e) => e.isActive);
  const inactiveEntitlements = entitlements.filter((e) => !e.isActive);
  const activeManualTags = manualTags.filter((t) => t.isActive);
  const inactiveManualTags = manualTags.filter((t) => !t.isActive);

  const hasAny = entitlements.length > 0 || manualTags.length > 0;

  if (!hasAny) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-20 text-center">
          <Package className="h-8 w-8 text-stone-300 mb-3" />
          <p className="text-sm font-medium text-stone-500">Henüz aktif paketin yok</p>
          <p className="text-xs text-stone-400 mt-1">Paket satın aldığında sınavlara erişim otomatik açılacak.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Paketim</h1>
        <p className="text-sm text-stone-500 mt-0.5">Paket erişimlerin ve sınavların</p>
      </div>

      {/* Active entitlements (packages) */}
      {activeEntitlements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-700">Aktif Paketler</h2>
          {activeEntitlements.map((ent) => (
            <EntitlementCard key={ent.id} ent={ent} />
          ))}
        </div>
      )}

      {/* Active manual tags */}
      {activeManualTags.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5" />
            Diğer Erişimler
          </h2>
          {activeManualTags.map((tag) => (
            <TagCard key={tag.id} tag={tag} />
          ))}
        </div>
      )}

      {/* Inactive / expired */}
      {(inactiveEntitlements.length > 0 || inactiveManualTags.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-400">Süresi Dolan / İptal Erişimler</h2>
          {inactiveEntitlements.map((ent) => (
            <EntitlementCard key={ent.id} ent={ent} />
          ))}
          {inactiveManualTags.map((tag) => (
            <TagCard key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Entitlement card ──────────────────────────────────────────────────────────

type EntItem = {
  id: string;
  isActive: boolean;
  daysLeft: number | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  status: string;
  package: { title: string; description: string | null };
  exams: Array<{
    id: string;
    title: string;
    cadenceFamily: string;
    durationMinutes: number;
    totalQuestions: number;
    myAttempt: { status: string; score: unknown } | null;
  }>;
};

function EntitlementCard({ ent }: { ent: EntItem }) {
  const completedCount = ent.exams.filter((e) => e.myAttempt?.status === "SUBMITTED").length;

  return (
    <div className={`rounded-xl border ${ent.isActive ? "border-purple-200 bg-white" : "border-stone-200 bg-stone-50 opacity-70"} overflow-hidden`}>
      <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-stone-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {ent.isActive
              ? <Package className="h-4 w-4 text-purple-500 shrink-0" />
              : <XCircle className="h-4 w-4 text-stone-400 shrink-0" />}
            <h3 className="font-semibold text-stone-900">{ent.package.title}</h3>
            {ent.isActive && (
              <span className="rounded-full bg-purple-50 border border-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                Paket
              </span>
            )}
          </div>
          {ent.package.description && (
            <p className="text-xs text-stone-400 mt-0.5 ml-6">{ent.package.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {ent.isActive && ent.daysLeft !== null && (
            <span className={`flex items-center gap-1 text-xs font-medium ${ent.daysLeft <= 7 ? "text-red-600" : "text-stone-500"}`}>
              <Clock className="h-3.5 w-3.5" />
              {ent.daysLeft} gün kaldı
            </span>
          )}
          {ent.isActive && ent.expiresAt && (
            <p className="text-xs text-stone-400 mt-0.5">
              {new Date(ent.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          {ent.revokedAt && <span className="text-xs text-red-500 font-medium">İptal edildi</span>}
          {!ent.expiresAt && !ent.revokedAt && ent.isActive && (
            <span className="text-xs text-emerald-600 font-medium">Süresiz</span>
          )}
        </div>
      </div>

      <ExamList exams={ent.exams} completedCount={completedCount} isAccessActive={ent.isActive} />
    </div>
  );
}

// ── Tag card (manual) ─────────────────────────────────────────────────────────

type TagItem = {
  id: string;
  isActive: boolean;
  daysLeft: number | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  accessTag: { title: string; description: string | null };
  exams: EntItem["exams"];
};

function TagCard({ tag }: { tag: TagItem }) {
  const completedCount = tag.exams.filter((e) => e.myAttempt?.status === "SUBMITTED").length;

  return (
    <div className={`rounded-xl border ${tag.isActive ? "border-emerald-200 bg-white" : "border-stone-200 bg-stone-50 opacity-70"} overflow-hidden`}>
      <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-stone-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {tag.isActive
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              : <XCircle className="h-4 w-4 text-stone-400 shrink-0" />}
            <h3 className="font-semibold text-stone-900">{tag.accessTag.title}</h3>
          </div>
          {tag.accessTag.description && (
            <p className="text-xs text-stone-400 mt-0.5 ml-6">{tag.accessTag.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {tag.isActive && tag.daysLeft !== null && (
            <span className={`flex items-center gap-1 text-xs font-medium ${tag.daysLeft <= 7 ? "text-red-600" : "text-stone-500"}`}>
              <Clock className="h-3.5 w-3.5" />
              {tag.daysLeft} gün kaldı
            </span>
          )}
          {tag.isActive && tag.expiresAt && (
            <p className="text-xs text-stone-400 mt-0.5">
              {new Date(tag.expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          {tag.revokedAt && <span className="text-xs text-red-500 font-medium">İptal edildi</span>}
          {!tag.expiresAt && !tag.revokedAt && tag.isActive && (
            <span className="text-xs text-emerald-600 font-medium">Süresiz</span>
          )}
        </div>
      </div>

      <ExamList exams={tag.exams} completedCount={completedCount} isAccessActive={tag.isActive} />
    </div>
  );
}

// ── Shared exam list ──────────────────────────────────────────────────────────

function ExamList({
  exams,
  completedCount,
  isAccessActive,
}: {
  exams: EntItem["exams"];
  completedCount: number;
  isAccessActive: boolean;
}) {
  if (exams.length === 0) {
    return <p className="px-5 py-4 text-xs text-stone-400">Bu pakete bağlı sınav yok.</p>;
  }

  return (
    <div className="divide-y divide-stone-50">
      <div className="px-5 py-2.5 flex items-center justify-between text-xs text-stone-400">
        <span>{exams.length} sınav · {completedCount} tamamlandı</span>
        <span>{Math.round((completedCount / exams.length) * 100)}% ilerleme</span>
      </div>
      {exams.map((exam) => (
        <div key={exam.id} className="flex items-center justify-between px-5 py-3">
          <div className="min-w-0 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{exam.title}</p>
              <p className="text-xs text-stone-400">
                {familyLabels[exam.cadenceFamily] ?? exam.cadenceFamily} · {exam.durationMinutes} dk · {exam.totalQuestions} soru
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {exam.myAttempt?.status === "SUBMITTED" && exam.myAttempt.score != null && (
              <span className="text-xs font-bold text-stone-600">
                {Number(exam.myAttempt.score).toFixed(2)} net
              </span>
            )}
            {isAccessActive && (
              <Link
                href={`/odk/panel/sinavlar/${exam.id}`}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  exam.myAttempt?.status === "SUBMITTED"
                    ? "border-stone-200 text-stone-600 hover:bg-stone-50"
                    : exam.myAttempt?.status === "IN_PROGRESS"
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {exam.myAttempt?.status === "SUBMITTED"
                  ? "Sonuç"
                  : exam.myAttempt?.status === "IN_PROGRESS"
                  ? "Devam Et"
                  : "Başla"}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
