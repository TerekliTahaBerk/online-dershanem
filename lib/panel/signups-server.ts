import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * YENİ KAYITLAR verisi (`/panel/yonetim/basvurular`). Web sayfası ve mobil
 * yönetim ucu (`/api/panel/admin/signups`) AYNI süzgeç, sayfalama, eşleşen
 * ödeme işareti ve bekleyen çocuk sıralamasını kullanır (sayfadan taşındı).
 */
const PAGE_SIZE = 40;

export type SignupFilter = "tumu" | "yeni" | "satin-aldi" | "form-yok" | "veli" | "ogrenci";

export const SIGNUP_FILTERS: Array<{ value: SignupFilter; label: string }> = [
  { value: "tumu", label: "Tümü" },
  { value: "yeni", label: "Aranmadı" },
  { value: "satin-aldi", label: "Satın aldığını belirtti" },
  { value: "form-yok", label: "Form doldurulmadı" },
  { value: "ogrenci", label: "Öğrenciler" },
  { value: "veli", label: "Veliler" },
];

function filterWhere(filter: SignupFilter): Prisma.UserWhereInput {
  switch (filter) {
    case "yeni":
      return { OR: [{ signupProfile: { contactStatus: "NEW" } }, { signupProfile: null }] };
    case "satin-aldi":
      return { signupProfile: { purchaseStatus: "ALREADY_PURCHASED" } };
    case "form-yok":
      return { contactFormSubmittedAt: null };
    case "ogrenci":
      return { role: "STUDENT" };
    case "veli":
      return { role: "PARENT" };
    default:
      return {};
  }
}


export async function loadSignupCounts() {
  const [pendingCount, newCount] = await Promise.all([
    prisma.pendingChild.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { registrationSource: "SELF_SIGNUP", OR: [{ signupProfile: { contactStatus: "NEW" } }, { signupProfile: null }] } }),
  ]);
  return { pendingCount, newCount };
}

export async function loadSignupList(filter: SignupFilter, page: number) {
  const where: Prisma.UserWhereInput = { registrationSource: "SELF_SIGNUP", ...filterWhere(filter) };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        contactFormSubmittedAt: true,
        marketingConsentAt: true,
        signupProfile: true,
        studentProfile: { select: { classLevel: true, examType: true, schoolName: true } },
        pendingChildren: { where: { status: "PENDING" }, select: { id: true, fullName: true } },
        productMemberships: { where: { revokedAt: null, product: { in: ["OD", "OK", "ODK"] } }, select: { product: true } },
        _count: { select: { paidOdOrders: { where: { status: "PAID" } }, paidOdkOrders: { where: { status: "PAID" } }, contactFormSubmissions: true } },
      },
    }),
  ]);

  // "Zaten satın aldım" diyen ya da e-postası ödenmiş bir siparişle eşleşen
  // kayıtları işaretle: ekip önce bunları arar.
  const emails = users.map((user) => user.email);
  const matchedOrders = emails.length
    ? await prisma.odOrder.findMany({
        where: { status: "PAID", OR: emails.map((email) => ({ buyerInfo: { path: ["email"], equals: email } })) },
        select: { id: true, buyerInfo: true },
      })
    : [];
  const matchedEmails = new Set(
    matchedOrders.map((order) => String((order.buyerInfo as Record<string, unknown> | null)?.email ?? "").toLowerCase()),
  );

  return { total, users, matchedEmails };
}

export async function loadPendingChildren() {
  const children = await prisma.pendingChild.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      fullName: true,
      classLevel: true,
      schoolName: true,
      examType: true,
      email: true,
      phone: true,
      relationship: true,
      createdAt: true,
      parent: { select: { id: true, fullName: true, email: true, phone: true } },
      odOrders: { where: { status: "PAID" }, select: { id: true, packageName: true } },
      odkOrders: { where: { status: "PAID" }, select: { id: true, package: { select: { title: true } } } },
    },
  });
  // Ödemesi alınmış çocuklar önce: hem velinin hem öğrencinin beklediği iş.
  const sorted = [...children].sort((a, b) => Number(b.odOrders.length + b.odkOrders.length > 0) - Number(a.odOrders.length + a.odkOrders.length > 0));
  return sorted;
}

export const SIGNUP_PAGE_SIZE = PAGE_SIZE;
