import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { productLabel } from "@/lib/auth/roles";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import {
  deriveStudent360Issues,
  pickNearestUpcomingExam,
  pickNearestUpcomingLesson,
} from "@/lib/panel/student-360";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle, PanelHeading } from "@/components/panel/ui";
import { RelationshipRemoveButton } from "@/components/panel/relationship-remove-button";
import { StudentParentLinkForm } from "@/components/panel/student-parent-link-form";
import { assignCoach } from "../../kocluk/actions";
import { retryOrderProvisioning } from "../../siparisler/[id]/actions";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt>{label}</dt>
      <dd className={tone ?? "text-dc-ink-muted"}>{value}</dd>
    </div>
  );
}

export default async function AdminStudent360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { id } = await params;
  const now = new Date();

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    select: {
      id: true,
      classLevel: true,
      targetGoal: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          createdAt: true,
          productMemberships: {
            where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            select: { product: true, expiresAt: true },
            orderBy: { product: "asc" },
          },
          odOrders: {
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              packageName: true,
              status: true,
              provisioningStatus: true,
              provisioningError: true,
              createdAt: true,
              totalCents: true,
            },
          },
        },
      },
      parents: {
        include: {
          parent: { select: { id: true, fullName: true, email: true } },
        },
      },
      enrollments: {
        where: { endedAt: null },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              subject: true,
              teacher: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      },
      coachAssignments: {
        where: { endedAt: null },
        take: 1,
        select: {
          cadenceDays: true,
          coach: { select: { id: true, user: { select: { fullName: true, email: true } } } },
        },
      },
    },
  });
  if (!student) notFound();

  const groupIds = student.enrollments.map((enrollment) => enrollment.groupId);
  const currentCoach = student.coachAssignments[0] ?? null;
  const products = student.user.productMemberships.map((membership) => membership.product);
  const blockedOrders = student.user.odOrders.filter(
    (order) => order.status === "PAID" && order.provisioningStatus !== "SUCCEEDED",
  );

  const [upcomingLessons, exams, coachOptions, parentOptions] = await Promise.all([
    groupIds.length
      ? prisma.lesson.findMany({
          where: { groupId: { in: groupIds }, status: "PLANNED", startsAt: { gte: now } },
          orderBy: { startsAt: "asc" },
          take: 3,
          select: { id: true, title: true, startsAt: true },
        })
      : Promise.resolve([]),
    products.includes("ODK") ? listStudentExams(student.user.id) : Promise.resolve([]),
    prisma.teacherProfile.findMany({
      where: { isCoach: true },
      orderBy: { user: { fullName: "asc" } },
      select: {
        id: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "PARENT",
        status: "ACTIVE",
        id: { notIn: student.parents.map((parentLink) => parentLink.parentId) },
      },
      orderBy: { fullName: "asc" },
      take: 40,
      select: { id: true, fullName: true, email: true },
    }),
  ]);

  const nearestLesson = pickNearestUpcomingLesson(upcomingLessons, now);
  const nearestExam = pickNearestUpcomingExam(
    exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      status: exam.status,
      startsAt: exam.startsAt,
      endsAt: exam.endsAt,
    })),
    now,
  );
  const issues = deriveStudent360Issues({
    products,
    blockedProvisioningCount: blockedOrders.length,
    hasActiveGroup: student.enrollments.length > 0,
    hasParentLink: student.parents.length > 0,
    hasCoachAssignment: Boolean(currentCoach),
  });

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Öğrenci 360"
    >
      <div className="max-w-[1100px]">
        <p className="text-[13px] text-dc-ink-faint">
          <Link href="/panel/yonetim/ogrenciler" className="hover:text-dc-brand-hover hover:underline">
            Öğrenciler
          </Link>
        </p>

        <div className="mt-2">
          <PanelHeading
            eyebrow="Öğrenci 360 operasyon"
            title={student.user.fullName || student.user.email}
            description={`${student.user.email} · kayıt ${DATE.format(student.user.createdAt)}${
              student.classLevel ? ` · ${student.classLevel}` : ""
            }${student.targetGoal ? ` · ${student.targetGoal}` : ""}`}
            actions={
              <Link
                href={`/panel/yonetim/kullanicilar/${student.user.id}`}
                className="rounded-[10px] border border-[#DDE4E0] bg-white px-4 py-2.5 text-[13px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
              >
                Kişi detayını aç
              </Link>
            }
          />
        </div>

        {issues.length ? (
          <PanelCard className="mt-5 border-dc-line border-l-[3px] border-l-[#C2493D]">
            <PanelCardTitle>Erişim ve operasyon sinyalleri</PanelCardTitle>
            <ul className="mt-3 space-y-2.5">
              {issues.map((issue) => (
                <li key={issue.code} className="rounded-[10px] border border-dc-line-soft bg-white px-3.5 py-3">
                  <p
                    className={`text-[13px] font-bold ${
                      issue.severity === "critical" ? "text-[#C2493D]" : "text-[#A5764A]"
                    }`}
                  >
                    {issue.title}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-[1.6] text-dc-ink-muted">{issue.description}</p>
                </li>
              ))}
            </ul>
          </PanelCard>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <PanelCard>
            <PanelCardTitle>Ürünler ve siparişler</PanelCardTitle>
            <dl className="mt-3.5 flex flex-col gap-2.5 text-[13.5px] font-medium text-dc-ink-body">
              <Row
                label="Ürün erişimi"
                value={
                  student.user.productMemberships.length
                    ? student.user.productMemberships.map((membership) => productLabel(membership.product)).join(" · ")
                    : "Aktif ürün erişimi yok"
                }
                tone={student.user.productMemberships.length ? undefined : "text-[#A5764A]"}
              />
              <Row label="Toplam sipariş" value={String(student.user.odOrders.length)} />
            </dl>
            <div className="mt-4 space-y-2.5">
              {student.user.odOrders.map((order) => (
                <article key={order.id} className="rounded-[10px] border border-dc-line-soft bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[13.5px] font-bold text-dc-ink">{order.packageName}</p>
                      <p className="mt-1 text-[12px] text-dc-ink-faint">
                        {DATE.format(order.createdAt)} · {(order.totalCents / 100).toLocaleString("tr-TR")} ₺
                      </p>
                    </div>
                    <Link
                      href={`/panel/yonetim/siparisler/${order.id}`}
                      className="text-[12.5px] font-semibold text-dc-brand hover:underline"
                    >
                      Siparişi aç
                    </Link>
                  </div>
                  <p className="mt-2 text-[12.5px] text-dc-ink-muted">
                    Ödeme: {order.status} · Erişim: {order.provisioningStatus}
                  </p>
                  {order.status === "PAID" && order.provisioningStatus !== "SUCCEEDED" ? (
                    <form action={retryOrderProvisioning} className="mt-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <button
                        type="submit"
                        className="rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2 text-[12px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
                      >
                        Erişimi yeniden dene
                      </button>
                    </form>
                  ) : null}
                  {order.provisioningError ? (
                    <p className="mt-2 text-[12px] text-[#C2493D]">{order.provisioningError}</p>
                  ) : null}
                </article>
              ))}
              {!student.user.odOrders.length ? (
                <p className="text-[13px] text-dc-ink-muted">Sipariş kaydı yok.</p>
              ) : null}
            </div>
          </PanelCard>

          <PanelCard>
            <PanelCardTitle>Atamalar ve yaklaşan etkinlik</PanelCardTitle>
            <dl className="mt-3.5 flex flex-col gap-2.5 text-[13.5px] font-medium text-dc-ink-body">
              <Row
                label="Öğretmen / grup"
                value={
                  student.enrollments.length
                    ? student.enrollments
                        .map(
                          (enrollment) =>
                            `${enrollment.group.teacher.fullName || enrollment.group.teacher.email} · ${enrollment.group.name}`,
                        )
                        .join(", ")
                    : "Aktif grup ataması yok"
                }
                tone={student.enrollments.length ? undefined : "text-[#A5764A]"}
              />
              <Row
                label="Koç"
                value={
                  currentCoach
                    ? `${currentCoach.coach.user.fullName || currentCoach.coach.user.email}${
                        currentCoach.cadenceDays ? ` · ${currentCoach.cadenceDays} günde bir` : ""
                      }`
                    : "Koç ataması yok"
                }
                tone={currentCoach ? undefined : "text-[#A5764A]"}
              />
              <Row
                label="En yakın ders"
                value={
                  nearestLesson
                    ? `${nearestLesson.title} · ${DATE.format(nearestLesson.startsAt)}`
                    : "Yaklaşan ders bulunmuyor"
                }
                tone={nearestLesson ? undefined : "text-[#A5764A]"}
              />
              <Row
                label="En yakın deneme"
                value={
                  nearestExam
                    ? `${nearestExam.title}${
                        nearestExam.startsAt ? ` · ${DATE.format(nearestExam.startsAt)}` : " · canlı pencere"
                      }`
                    : "Yaklaşan deneme bulunmuyor"
                }
                tone={nearestExam ? undefined : "text-[#A5764A]"}
              />
            </dl>

            <form action={assignCoach} className="mt-4 rounded-[10px] border border-dc-line-soft bg-white p-3.5">
              <p className="text-[12.5px] font-bold text-dc-ink">
                {currentCoach ? "Koç devret" : "Koç ata"}
              </p>
              <input type="hidden" name="studentId" value={student.id} />
              <div className="mt-2.5 flex flex-wrap items-end gap-2">
                <div className="min-w-[220px] flex-1">
                  <label className="sr-only" htmlFor="coachId">
                    Koç
                  </label>
                  <select
                    id="coachId"
                    name="coachId"
                    required
                    defaultValue={currentCoach?.coach.id ?? coachOptions[0]?.id ?? ""}
                    className="panel-input py-2 text-xs"
                  >
                    {!coachOptions.length ? <option value="">Aktif koç bulunamadı</option> : null}
                    {coachOptions.map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.user.fullName || coach.user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-[120px]">
                  <label className="sr-only" htmlFor="cadenceDays">
                    Sıklık (gün)
                  </label>
                  <input
                    id="cadenceDays"
                    name="cadenceDays"
                    type="number"
                    min={1}
                    defaultValue={currentCoach?.cadenceDays ?? ""}
                    className="panel-input py-2 text-xs"
                    placeholder="Sıklık"
                  />
                </div>
                <button
                  type="submit"
                  disabled={coachOptions.length === 0}
                  className="rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2 text-[12px] font-bold text-dc-ink transition-colors hover:border-dc-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {currentCoach ? "Devret" : "Koç ata"}
                </button>
              </div>
            </form>
          </PanelCard>
        </div>

        <PanelCard className="mt-5">
          <PanelCardTitle>Veli bağlantıları</PanelCardTitle>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {student.parents.map((parentLink) => (
              <div
                key={parentLink.id}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-dc-line p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-dc-ink">
                    {parentLink.parent.fullName || parentLink.parent.email}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-dc-ink-muted">
                    {parentLink.relationship || "Veli"}
                  </p>
                </div>
                <RelationshipRemoveButton id={parentLink.id} />
              </div>
            ))}
            {!student.parents.length ? (
              <p className="text-[13px] text-dc-ink-muted lg:col-span-2">Aktif veli bağlantısı yok.</p>
            ) : null}
          </div>
          <StudentParentLinkForm
            studentId={student.id}
            parents={parentOptions.map((parent) => ({ id: parent.id, name: parent.fullName || parent.email }))}
          />
        </PanelCard>
      </div>
    </PanelShell>
  );
}
