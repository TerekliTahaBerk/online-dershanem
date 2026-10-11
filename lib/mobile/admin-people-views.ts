import type { ProductCode } from "@prisma/client";
import { MOBILE_ADMIN_CONTRACT_VERSION, type MobilePeopleDirectory, type MobilePersonDetail } from "@/lib/mobile-contracts/admin";
import { productLabel, roleLabel } from "@/lib/auth/roles";
import { ACCESS_SOURCE_LABEL, accessState, sortAccessObjects } from "@/lib/panel/access-objects";
import { PEOPLE_VIEWS, responsibilityBadges, viewAllowsRoleFilter } from "@/lib/panel/people-views";
import type { PeopleDirectory, PeopleDirectoryUser } from "@/lib/panel/people-directory-server";
import type { PersonDetail } from "@/lib/panel/person-detail-server";
import type { SignupProfileSummary } from "@/lib/panel/signup-profile-server";
import { STAFF_PRODUCT_LABEL, STAFF_ROLE_LABEL, STAFF_ROLE_OPTIONS } from "@/lib/panel/staff-role-vocabulary";
import { USER_STATUS_PRESENTATION } from "@/lib/panel/status-vocabulary";
import { ROLE_FILTERS, STATUS_FILTERS } from "@/lib/panel/user-filters";

/**
 * KİŞİLER mobil projeksiyonları (Faz 2.2). Web tablolarındaki sütunlar
 * görünüme göre tek bir `detail` satırına indirgenir (aynı alanlar, aynı
 * sıra); iş kuralı yeniden hesaplanmaz.
 */

const name = (user: { fullName: string | null; email: string }) => user.fullName || user.email;
const PRODUCTS = ["OD", "OK", "ODK"] as const satisfies readonly ProductCode[];

type PendingReset = { id: string; targetUserId: string; requestedById: string; reason: string; createdAt: Date; expiresAt: Date; target: { fullName: string | null; email: string }; requestedBy: { fullName: string | null; email: string } };

export function toMobilePendingResets(rows: PendingReset[], viewerId: string): MobilePeopleDirectory["pendingMfaResets"] {
  return rows.map((row) => ({
    id: row.id,
    targetId: row.targetUserId,
    targetName: name(row.target),
    requestedByName: name(row.requestedBy),
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    // Sunum kolaylığı; kural sunucuda (`/api/panel/mfa-resets/[id]/approve`).
    canApprove: row.requestedById !== viewerId && row.targetUserId !== viewerId,
  }));
}

function personDetailLine(view: PeopleDirectory["view"], user: PeopleDirectoryUser): string {
  const products = user.productMemberships.flatMap((m) => (m.product ? [productLabel(m.product)] : [])).join(", ");
  if (view === "ogrenciler") {
    const profile = user.studentProfile;
    const group = profile?.enrollments[0]?.group;
    const teachers = [...(group ? [`${group.name}: ${name(group.teacher)}`] : []), ...(profile?.teacherAssignments.map((link) => `${link.subject} → ${name(link.teacher)}`) ?? [])];
    const coach = profile?.coachAssignments[0]?.coach.user;
    return [
      [profile?.classLevel, profile?.examType].filter(Boolean).join(" · "),
      products,
      teachers.slice(0, 2).join(" · "),
      coach ? `Koç: ${name(coach)}` : "",
      profile?.parents.length ? `Veli: ${profile.parents.map((link) => name(link.parent)).join(", ")}` : "",
    ].filter(Boolean).join(" · ");
  }
  if (view === "ogretmenler") {
    const students = user.taughtGroups.reduce((sum, group) => sum + group._count.enrollments, 0) + user.studentTeacherAssignments.length;
    return [user.teacherProfile?.subjects.join(", "), `${students} öğrenci`, `${user.taughtGroups.length} grup`, `bugün ${user.taughtLessons.length} ders`].filter(Boolean).join(" · ");
  }
  if (view === "veliler") {
    return [user.parentStudents.map((link) => name(link.student.user)).join(", "), user.phone].filter(Boolean).join(" · ");
  }
  if (view === "koclar") {
    const load = user.teacherProfile?._count.coachAssignments ?? 0;
    const capacity = user.teacherProfile?.coachCapacity ?? null;
    return `${load} aktif öğrenci · kapasite ${capacity ?? "sınırsız"}`;
  }
  return [roleLabel(user.role), products].filter(Boolean).join(" · ");
}

export function toMobilePeopleDirectory(directory: PeopleDirectory, pendingResets: PendingReset[], viewerId: string, studentsAwaitingAccess = 0): MobilePeopleDirectory {
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    view: directory.view,
    views: PEOPLE_VIEWS.map((item) => ({ id: item.id, label: item.label })),
    roleFilterAllowed: viewAllowsRoleFilter(directory.view),
    filters: {
      roles: ROLE_FILTERS,
      products: [{ value: "", label: "Tümü" }, ...PRODUCTS.map((code) => ({ value: code, label: productLabel(code) }))],
      statuses: STATUS_FILTERS,
    },
    query: { q: directory.query.q, rol: directory.query.rol, urun: directory.query.urun, durum: directory.query.durum },
    page: directory.page,
    pages: directory.pages,
    total: directory.total,
    people: directory.users.map((user) => ({
      id: user.id,
      name: name(user),
      email: user.email,
      role: user.role,
      roleLabel: roleLabel(user.role),
      status: user.status,
      statusLabel: USER_STATUS_PRESENTATION[user.status].label,
      statusTone: USER_STATUS_PRESENTATION[user.status].tone,
      invitePending: !user.inviteAcceptedAt,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      detail: personDetailLine(directory.view, user),
      badges: responsibilityBadges(user.productStaffAssignments.map((row) => row.role)),
      studentProfileId: user.role === "STUDENT" ? (user.studentProfile?.id ?? null) : null,
    })),
    pendingMfaResets: toMobilePendingResets(pendingResets, viewerId),
    studentsAwaitingAccess,
  };
}

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

/** Sunucu şeması (`/api/panel/users/[id]/accessibility`): ek süre yüzdesi seçenekleri. */
const ACCESSIBILITY_EXTRA_OPTIONS = [0, 25, 50, 100];

export function toMobilePersonDetail(detail: PersonDetail, viewerId: string, extra: { signup: SignupProfileSummary | null; accessibilityEnabled: boolean }): MobilePersonDetail {
  const { user, student, now, teacherLifecycle: lifecycle } = detail;
  const status = USER_STATUS_PRESENTATION[user.status];
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    id: user.id,
    name: name(user),
    email: user.email,
    phone: user.phone,
    role: user.role,
    roleLabel: roleLabel(user.role),
    status: user.status,
    statusLabel: status.label,
    statusTone: status.tone,
    invitePending: !user.inviteAcceptedAt,
    isSelf: user.id === viewerId,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    blockedOrder: detail.blocked ? { id: detail.blocked.id, packageName: detail.blocked.packageName, createdAt: detail.blocked.createdAt.toISOString(), error: detail.blocked.provisioningError } : null,
    profile: {
      fullName: user.fullName || "",
      phone: user.phone || "",
      classLevel: student?.classLevel || "",
      schoolName: student?.schoolName || "",
      targetGoal: student?.targetGoal || "",
      subjects: user.teacherProfile?.subjects || [],
      bio: user.teacherProfile?.bio || "",
    },
    memberships: sortAccessObjects(user.productMemberships, now).map((membership) => {
      const state = accessState(membership, now);
      return {
        id: membership.id,
        productLabel: membership.product ? productLabel(membership.product) : membership.productRef?.name || "Ürün",
        sourceLabel: ACCESS_SOURCE_LABEL[membership.source],
        startsAt: membership.startsAt.toISOString(),
        expiresAt: membership.expiresAt ? membership.expiresAt.toISOString() : null,
        revokedAt: membership.revokedAt ? membership.revokedAt.toISOString() : null,
        grantedBy: membership.grantedBy ? name(membership.grantedBy) : null,
        orderPackage: membership.sourceOdOrder?.packageName ?? null,
        stateLabel: state.label,
        stateTone: state.tone,
      };
    }),
    productAccess: {
      // Web ile aynı: yönetici ve öğretmen üç ürüne zaten erişir (sunucu da reddeder).
      editable: user.role === "STUDENT" || user.role === "PARENT",
      active: PRODUCTS.filter((code) => detail.activeProducts.has(code)),
      options: PRODUCTS.map((code) => ({ value: code, label: productLabel(code) })),
    },
    orders: user.odOrders.map((order) => ({
      id: order.id,
      packageName: order.packageName,
      createdAt: order.createdAt.toISOString(),
      statusText: order.status === "PAID" ? (order.provisioningStatus === "SUCCEEDED" ? "Ödendi · erişim açık" : "Ödendi · erişim bekliyor") : order.status,
    })),
    staff:
      user.role === "TEACHER"
        ? {
            history: detail.staffHistory.map((row) => ({
              id: row.id,
              productLabel: STAFF_PRODUCT_LABEL[row.productCode] ?? row.productCode,
              roleLabel: STAFF_ROLE_LABEL[row.role] ?? row.role,
              grantedAt: row.grantedAt,
              grantedBy: row.grantedBy,
              grantReason: row.grantReason,
              revokedAt: row.revokedAt,
              revokedBy: row.revokedBy,
              revokeReason: row.revokeReason,
              lastHolder: row.lastHolder,
            })),
            options: STAFF_ROLE_OPTIONS.map((option) => ({ ...option, label: `${STAFF_PRODUCT_LABEL[option.product]} · ${STAFF_ROLE_LABEL[option.role]}` })),
            coachCapacity: user.teacherProfile?.coachCapacity ?? null,
            mfaPending: detail.staffMfaPending,
          }
        : null,
    relations: {
      groups: (student?.enrollments ?? []).map((enrollment) => ({ id: enrollment.group.id, label: `${enrollment.group.name} · ${enrollment.group.subject}`, detail: name(enrollment.group.teacher) })),
      parents: (student?.parents ?? []).map((link) => ({ id: link.parent.id, name: name(link.parent), relationship: link.relationship || "Veli" })),
      children: user.parentStudents.map((link) => ({ id: link.student.user.id, name: name(link.student.user), relationship: link.relationship || "Veli" })),
      coach: detail.coach ? `${name(detail.coach.coach.user)}${detail.coach.cadenceDays ? ` · ${detail.coach.cadenceDays} günde bir` : ""}` : null,
      attendance: student ? (detail.attendance.length ? `%${Math.round((detail.attended / detail.attendance.length) * 100)} · ${detail.attended}/${detail.attendance.length}` : "Kayıt yok") : null,
      notes: (student?.notes ?? []).map((note) => ({ id: note.id, title: `${note.lesson.group.subject} · ${DATE.format(note.updatedAt)}`, body: note.note || note.nextGoal || note.homework || "Not içeriği yok" })),
      teacher: lifecycle
        ? {
            subjects: lifecycle.teacher.subjects.join(", ") || "Tanımlı değil",
            coach: lifecycle.teacher.isCoach ? `Evet${lifecycle.teacher.coachCapacity ? ` · kapasite ${lifecycle.teacher.coachCapacity}` : ""}` : "Hayır",
            groupsAndStudents: `${lifecycle.counts.activeGroups} / ${lifecycle.counts.activeStudents}`,
            upcomingLessons: lifecycle.counts.upcomingLessons,
            pendingClosures: lifecycle.counts.pendingLessonClosures,
            openHelp: lifecycle.activeResponsibilities.openHelpRequests,
            openInterventionsAndCoaching: lifecycle.activeResponsibilities.openInterventions + lifecycle.activeResponsibilities.coachAssignments,
          }
        : null,
      branchStudents: detail.teacherStudentLinks.map((link) => ({ id: link.id, studentId: link.studentId, name: link.studentName, subject: link.subject })),
      recentLessons: user.taughtLessons.map((lesson) => ({ id: lesson.id, title: lesson.title, detail: `${lesson.group.name} · ${DATE.format(lesson.startsAt)}` })),
    },
    security: {
      mfaLabel: detail.hasMfa === null ? "Bu rol için gerekmiyor" : detail.hasMfa ? "Kurulu" : detail.staffMfaPending ? "MFA kurulumu bekleniyor" : "Kurulu değil",
      pendingResets: detail.pendingResets.map((request) => ({
        id: request.id,
        targetId: user.id,
        targetName: name(user),
        requestedByName: name(request.requestedBy),
        reason: request.reason,
        createdAt: request.createdAt.toISOString(),
        expiresAt: request.expiresAt.toISOString(),
        canApprove: request.requestedById !== viewerId && user.id !== viewerId,
      })),
      // Web ile aynı: yalnız başka bir yöneticinin MFA'sı sıfırlanabilir.
      canRequestReset: user.role === "ADMIN" && user.id !== viewerId,
    },
    history: detail.auditRows.map((row) => ({
      id: row.id,
      action: row.action,
      summary: row.summary ?? "",
      createdAt: row.createdAt.toISOString(),
      actorName: row.actorUserId ? detail.auditActors.get(row.actorUserId) ?? "Bilinmeyen" : "Sistem",
    })),
    accessibility:
      user.role === "STUDENT" && extra.accessibilityEnabled
        ? {
            version: user.accessibilityPreference?.version || 0,
            assessmentExtraPercent: user.accessibilityPreference?.assessmentExtraPercent || 0,
            breaksAllowed: user.accessibilityPreference?.breaksAllowed || false,
            options: ACCESSIBILITY_EXTRA_OPTIONS,
          }
        : null,
    signup: extra.signup,
    linkableStudents: detail.linkableStudents,
  };
}
