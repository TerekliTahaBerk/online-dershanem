import { MOBILE_ADMIN_CONTRACT_VERSION, type MobileEducators, type MobileParentsPage, type MobileSignups } from "@/lib/mobile-contracts/admin";
import { productLabel } from "@/lib/auth/roles";
import {
  CLASS_LEVEL_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  CONTACT_TIME_OPTIONS,
  EXAM_TYPE_OPTIONS,
  HEARD_FROM_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  optionLabel,
} from "@/lib/account/dictionaries";
import { whatsAppLink } from "@/lib/phone";
import type { Educator } from "@/lib/panel/educators-server";
import { PARENT_STATUS_FILTERS, PARENTS_PAGE_SIZE, type ParentsPage } from "@/lib/panel/parents-server";
import { SIGNUP_FILTERS, SIGNUP_PAGE_SIZE, type loadPendingChildren, type loadSignupList } from "@/lib/panel/signups-server";

/**
 * Faz 2.2 kalan kişi ekranlarının mobil projeksiyonları (Veliler,
 * Öğretmenler ve doluluk, Yeni kayıtlar). Web sayfasının gösterdiği alanlar ve
 * etiketler; iş kuralı yeniden hesaplanmaz.
 */

const name = (user: { fullName: string | null; email: string }) => user.fullName || user.email;
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const ACTION_LABEL: Record<string, string> = { LINKED: "Bağlantı eklendi", UPDATED: "Yakınlık güncellendi" };

export function toMobileParentsPage(data: ParentsPage): MobileParentsPage {
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    query: { q: data.q, durum: data.durum },
    statuses: PARENT_STATUS_FILTERS,
    page: data.page,
    pages: Math.max(1, Math.ceil(data.total / PARENTS_PAGE_SIZE)),
    total: data.total,
    withoutRelationshipCount: data.withoutRelationshipCount,
    parents: data.parents.map((parent) => {
      // Web tablosundaki durum sırası ile aynı.
      const statusLabel =
        parent.status === "SUSPENDED" ? "Askıda" : parent.status === "ARCHIVED" ? "Arşivde" : !parent.inviteAcceptedAt ? "Davet bekliyor" : parent.mustChangePassword ? "Parola bekliyor" : parent.parentStudents.length === 0 ? "Öğrenci bağlantısı yok" : "Aktif";
      return {
        id: parent.id,
        name: name(parent),
        email: parent.email,
        statusLabel,
        attention: statusLabel !== "Aktif",
        studentCount: parent.parentStudents.length,
        students: parent.parentStudents.map((link) => (link.relationship ? `${name(link.student.user)} (${link.relationship})` : name(link.student.user))).join(" · "),
      };
    }),
    relationships: data.activeRelationships.map((relationship) => ({
      id: relationship.id,
      parentId: relationship.parentId,
      parentName: name(relationship.parent),
      studentName: name(relationship.student.user),
      relationship: relationship.relationship,
    })),
    history: data.relationshipHistory.map((item) => ({
      id: item.id,
      title: `${name(item.parent)} · ${name(item.student.user)}`,
      actionLabel: `${ACTION_LABEL[item.action] ?? "Bağlantı kaldırıldı"}${item.relationship ? ` · ${item.relationship}` : ""}`,
      detail: `${DATE_TIME.format(item.createdAt)} · ${item.actor ? name(item.actor) : "Sistem"}`,
    })),
    parentOptions: data.parentOptions.map((parent) => ({ id: parent.id, name: name(parent) })),
    studentOptions: data.studentOptions.map((student) => ({ id: student.id, name: name(student.user) })),
  };
}

export function toMobileEducators(teachers: Educator[]): MobileEducators {
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    overCapacity: teachers.filter((teacher) => teacher.taughtGroups.some((group) => group._count.enrollments > group.capacity)).length,
    teachers: teachers.map((teacher) => {
      const groups = teacher.taughtGroups;
      const seats = groups.reduce((sum, group) => sum + group.capacity, 0);
      const filled = groups.reduce((sum, group) => sum + group._count.enrollments, 0);
      const pct = seats ? Math.round((filled / seats) * 100) : null;
      const over = groups.some((group) => group._count.enrollments > group.capacity);
      const levels = [...new Set(groups.map((group) => group.level).filter(Boolean))];
      return {
        id: teacher.id,
        name: name(teacher),
        active: teacher.status === "ACTIVE",
        statusLabel: teacher.status === "ACTIVE" ? "Aktif" : "Askıda",
        subjects: teacher.teacherProfile?.subjects.join(", ") || "—",
        levels: levels.join(" · ") || "—",
        fill: groups.length === 0 ? "Aktif grup yok" : `${filled} / ${seats} kontenjan${pct === null ? "" : ` · %${pct}`}${over ? " · aşıldı" : ""}`,
        over,
      };
    }),
  };
}

type SignupList = Awaited<ReturnType<typeof loadSignupList>>;
type PendingChildren = Awaited<ReturnType<typeof loadPendingChildren>>;

export function toMobileSignups(input: {
  tab: "kayitlar" | "cocuklar";
  filter: string;
  page: number;
  counts: { newCount: number; pendingCount: number };
  list: SignupList | null;
  children: PendingChildren | null;
}): MobileSignups {
  const list = input.list;
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    tab: input.tab,
    counts: input.counts,
    filters: SIGNUP_FILTERS,
    filter: input.filter,
    contactStatuses: CONTACT_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    page: input.page,
    pages: list ? Math.max(1, Math.ceil(list.total / SIGNUP_PAGE_SIZE)) : 1,
    total: list?.total ?? 0,
    signups: (list?.users ?? []).map((user) => {
      const profile = user.signupProfile;
      const paid = user._count.paidOdOrders + user._count.paidOdkOrders;
      const matched = list!.matchedEmails.has(user.email.toLowerCase());
      // Web tablosu ile aynı öncelik: ödeme → eşleşen sipariş → beyan → durum.
      const purchase = paid
        ? { label: `${paid} ödeme`, tone: "success" as const }
        : matched
          ? { label: "Ödenmiş sipariş eşleşti", tone: "warning" as const }
          : profile?.purchaseStatus === "ALREADY_PURCHASED"
            ? { label: "Satın aldığını belirtti", tone: "warning" as const }
            : { label: optionLabel(PURCHASE_STATUS_OPTIONS, profile?.purchaseStatus) ?? "—", tone: "neutral" as const };
      const interested = profile?.interestedProducts.length ? profile.interestedProducts.map(productLabel).join(", ") : "—";
      const details: { label: string; value: string }[] = [
        { label: "İletişim", value: [user.email, user.phone].filter(Boolean).join(" · ") },
        { label: "İlgilendiği", value: interested },
        { label: "Satın alma", value: optionLabel(PURCHASE_STATUS_OPTIONS, profile?.purchaseStatus) ?? "—" },
        ...(profile?.existingOrderRef ? [{ label: "Sipariş referansı", value: profile.existingOrderRef }] : []),
        { label: "Ulaşım", value: `${optionLabel(CONTACT_CHANNEL_OPTIONS, profile?.preferredChannel) ?? "—"} · ${optionLabel(CONTACT_TIME_OPTIONS, profile?.preferredContactTime) ?? "—"}` },
        { label: "Konum", value: [profile?.city, profile?.district].filter(Boolean).join(" / ") || "—" },
        user.role === "STUDENT"
          ? { label: "Eğitim", value: `${optionLabel(CLASS_LEVEL_OPTIONS, user.studentProfile?.classLevel) ?? "—"} · ${optionLabel(EXAM_TYPE_OPTIONS, user.studentProfile?.examType) ?? "—"}${user.studentProfile?.schoolName ? ` · ${user.studentProfile.schoolName}` : ""}` }
          : { label: "Çocuklar", value: user.pendingChildren.length ? `${user.pendingChildren.map((child) => child.fullName).join(", ")} (hesap bekliyor)` : "—" },
        ...(user.role === "STUDENT" && profile?.guardianName ? [{ label: "Veli", value: `${profile.guardianName}${profile.guardianPhone ? ` · ${profile.guardianPhone}` : ""}` }] : []),
        { label: "Aktif ürün", value: user.productMemberships.length ? user.productMemberships.map((membership) => productLabel(membership.product!)).join(", ") : "Yok" },
        ...(profile?.heardFrom ? [{ label: "Kaynak", value: optionLabel(HEARD_FROM_OPTIONS, profile.heardFrom) ?? "—" }] : []),
      ];
      return {
        id: user.id,
        name: user.fullName || user.email,
        roleLabel: user.role === "PARENT" ? "Veli" : "Öğrenci",
        email: user.email,
        phone: user.phone,
        whatsAppUrl: user.phone ? whatsAppLink(user.phone, `Merhaba ${user.fullName ?? ""}, onlinedershanem.'den ulaşıyoruz.`) : null,
        createdAt: user.createdAt.toISOString(),
        interested,
        purchase,
        formDone: Boolean(user.contactFormSubmittedAt || user._count.contactFormSubmissions),
        contactStatus: profile?.contactStatus ?? "NEW",
        contactStatusLabel: optionLabel(CONTACT_STATUS_OPTIONS, profile?.contactStatus ?? "NEW") ?? "—",
        contactNote: profile?.contactNote ?? null,
        contactedAt: profile?.contactedAt ? profile.contactedAt.toISOString() : null,
        details,
      };
    }),
    children: (input.children ?? []).map((child) => {
      const packages = [...child.odOrders.map((order) => order.packageName), ...child.odkOrders.map((order) => order.package.title)];
      return {
        id: child.id,
        name: child.fullName,
        detail: `${optionLabel(CLASS_LEVEL_OPTIONS, child.classLevel) ?? "—"} · ${optionLabel(EXAM_TYPE_OPTIONS, child.examType) ?? "—"}${child.schoolName ? ` · ${child.schoolName}` : ""} · bildirildi ${DATE_TIME.format(child.createdAt)}`,
        paid: packages.length > 0,
        packages: packages.join(", "),
        parentId: child.parent.id,
        parentName: name(child.parent),
        parentContact: `${child.parent.phone ?? "telefon yok"} · ${child.parent.email}`,
        parentPhone: child.parent.phone,
        childContact: child.email || child.phone ? [child.email, child.phone].filter(Boolean).join(" · ") : null,
        defaultEmail: child.email,
      };
    }),
  };
}
