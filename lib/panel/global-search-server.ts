import "server-only";

import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getBusinessAccess } from "@/lib/business/permissions";
import {
  GLOBAL_SEARCH_PER_KIND_LIMIT,
  commandsToResults,
  looksLikeRecordId,
  matchCommands,
  phoneDigits,
  searchNeedleVariants,
  typoRelaxedNeedles,
  visibleGlobalSearchCommands,
  type GlobalSearchResult,
  type GlobalSearchViewer,
} from "@/lib/panel/global-search";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

function textOrClauses(
  fields: Array<"fullName" | "email" | "phone" | "name" | "subject" | "title" | "packageName">,
  needles: string[],
): Prisma.UserWhereInput[] {
  const clauses: Prisma.UserWhereInput[] = [];
  for (const needle of needles) {
    for (const field of fields) {
      if (field === "phone") {
        clauses.push({ phone: { contains: needle } });
      } else if (field === "fullName" || field === "email") {
        clauses.push({ [field]: { contains: needle, mode: "insensitive" } });
      }
    }
  }
  return clauses;
}

function teacherStudentScope(teacherUserId: string): Prisma.StudentProfileWhereInput {
  return {
    OR: [
      {
        enrollments: {
          some: { endedAt: null, group: { isActive: true, teacherId: teacherUserId } },
        },
      },
      {
        coachAssignments: {
          some: { endedAt: null, coach: { userId: teacherUserId } },
        },
      },
    ],
  };
}

async function buildViewer(session: SessionUser): Promise<GlobalSearchViewer> {
  const flags = getPanelFeatureFlags();
  const businessUnits =
    session.role === "ADMIN" ? await getBusinessAccess(session, "lead:read") : [];
  return {
    role: session.role,
    flags,
    businessPermissions: businessUnits.length ? (["lead:read"] as const) : [],
  };
}

function studentHref(role: UserRole, studentProfileId: string): string {
  return role === "TEACHER"
    ? `/panel/ogretmen/ogrenci/${studentProfileId}`
    : `/panel/yonetim/ogrenciler/${studentProfileId}`;
}

function lessonHref(role: UserRole, lesson: { id: string; groupId: string }): string {
  return role === "TEACHER"
    ? `/panel/ogretmen/ders/${lesson.id}`
    : `/panel/yonetim/gruplar/${lesson.groupId}`;
}

function groupHref(role: UserRole, groupId: string): string {
  return role === "TEACHER" ? `/panel/ogretmen/gruplar` : `/panel/yonetim/gruplar/${groupId}`;
}

async function searchStudents(
  role: UserRole,
  userId: string,
  needles: string[],
  digits: string,
): Promise<GlobalSearchResult[]> {
  const or: Prisma.StudentProfileWhereInput[] = [];
  for (const needle of needles) {
    or.push(
      { user: { fullName: { contains: needle, mode: "insensitive" } } },
      { user: { email: { contains: needle, mode: "insensitive" } } },
      { user: { phone: { contains: needle } } },
      { classLevel: { contains: needle, mode: "insensitive" } },
    );
    if (looksLikeRecordId(needle)) {
      or.push({ id: needle }, { userId: needle });
    }
  }
  if (digits.length >= 4) {
    or.push({ user: { phone: { contains: digits } } });
  }

  const rows = await prisma.studentProfile.findMany({
    where: {
      AND: [
        role === "TEACHER" ? teacherStudentScope(userId) : {},
        { OR: or },
      ],
    },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      classLevel: true,
      user: { select: { id: true, fullName: true, email: true } },
      enrollments: {
        where: {
          endedAt: null,
          ...(role === "TEACHER" ? { group: { teacherId: userId, isActive: true } } : { group: { isActive: true } }),
        },
        take: 2,
        select: { group: { select: { name: true } } },
      },
    },
  });

  return rows.map((row) => {
    const groups = row.enrollments.map((item) => item.group.name).filter(Boolean);
    const classPart = row.classLevel || "Sınıf yok";
    const groupPart = groups.length ? groups.join(", ") : "Grup yok";
    return {
      kind: "STUDENT" as const,
      id: row.id,
      label: row.user.fullName || row.user.email,
      detail: `${classPart} — ${groupPart}`,
      href: studentHref(role, row.id),
    };
  });
}

async function searchParents(needles: string[], digits: string): Promise<GlobalSearchResult[]> {
  const or: Prisma.UserWhereInput[] = [
    ...textOrClauses(["fullName", "email", "phone"], needles),
  ];
  if (digits.length >= 4) or.push({ phone: { contains: digits } });
  for (const needle of needles) {
    if (looksLikeRecordId(needle)) or.push({ id: needle });
    or.push({
      parentStudents: {
        some: {
          student: {
            user: {
              OR: [
                { fullName: { contains: needle, mode: "insensitive" } },
                { email: { contains: needle, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    });
  }

  const rows = await prisma.user.findMany({
    where: { role: "PARENT", OR: or },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      parentStudents: {
        take: 2,
        select: {
          student: { select: { user: { select: { fullName: true, email: true } } } },
        },
      },
    },
  });

  return rows.map((row) => {
    const children = row.parentStudents.map(
      (link) => link.student.user.fullName || link.student.user.email,
    );
    const detail = children.length
      ? `${children.join(", ")}'ın velisi`
      : `${row.email} · bağlantısız`;
    return {
      kind: "PARENT" as const,
      id: row.id,
      label: row.fullName || row.email,
      detail,
      href: `/panel/yonetim/kullanicilar/${row.id}`,
    };
  });
}

async function searchTeachers(needles: string[], digits: string): Promise<GlobalSearchResult[]> {
  const or: Prisma.UserWhereInput[] = [...textOrClauses(["fullName", "email", "phone"], needles)];
  if (digits.length >= 4) or.push({ phone: { contains: digits } });
  for (const needle of needles) {
    if (looksLikeRecordId(needle)) or.push({ id: needle });
  }

  const rows = await prisma.user.findMany({
    where: { role: "TEACHER", OR: or },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      taughtGroups: {
        where: { isActive: true },
        take: 2,
        select: { name: true },
      },
    },
  });

  return rows.map((row) => ({
    kind: "TEACHER" as const,
    id: row.id,
    label: row.fullName || row.email,
    detail: row.taughtGroups.length
      ? row.taughtGroups.map((group) => group.name).join(", ")
      : `${row.email} · aktif grup yok`,
    href: `/panel/yonetim/kullanicilar/${row.id}`,
  }));
}

async function searchUsers(needles: string[], digits: string): Promise<GlobalSearchResult[]> {
  const or: Prisma.UserWhereInput[] = [...textOrClauses(["fullName", "email", "phone"], needles)];
  if (digits.length >= 4) or.push({ phone: { contains: digits } });
  for (const needle of needles) {
    if (looksLikeRecordId(needle)) or.push({ id: needle });
  }

  const rows = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN"] },
      OR: or,
    },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: { createdAt: "desc" },
    select: { id: true, fullName: true, email: true, role: true, status: true },
  });

  return rows.map((row) => ({
    kind: "USER" as const,
    id: row.id,
    label: row.fullName || row.email,
    detail: `${row.email} · ${row.role} · ${row.status}`,
    href: `/panel/yonetim/kullanicilar/${row.id}`,
  }));
}

async function searchGroups(
  role: UserRole,
  userId: string,
  needles: string[],
): Promise<GlobalSearchResult[]> {
  const nameOr = needles.flatMap((needle) => [
    { name: { contains: needle, mode: "insensitive" as const } },
    { subject: { contains: needle, mode: "insensitive" as const } },
    ...(looksLikeRecordId(needle) ? [{ id: needle }] : []),
  ]);

  const rows = await prisma.group.findMany({
    where: {
      AND: [
        role === "TEACHER" ? { teacherId: userId } : {},
        { OR: nameOr },
      ],
    },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      subject: true,
      isActive: true,
      level: true,
      teacher: { select: { fullName: true, email: true } },
    },
  });

  return rows.map((row) => ({
    kind: "GROUP" as const,
    id: row.id,
    label: row.name,
    detail: `${row.subject}${row.level ? ` · ${row.level}` : ""} · ${row.teacher.fullName || row.teacher.email}${row.isActive ? "" : " · kapalı"}`,
    href: groupHref(role, row.id),
  }));
}

async function searchLessons(
  role: UserRole,
  userId: string,
  needles: string[],
): Promise<GlobalSearchResult[]> {
  const or = needles.flatMap((needle) => [
    { title: { contains: needle, mode: "insensitive" as const } },
    { group: { name: { contains: needle, mode: "insensitive" as const } } },
    ...(looksLikeRecordId(needle) ? [{ id: needle }] : []),
  ]);

  const rows = await prisma.lesson.findMany({
    where: {
      AND: [role === "TEACHER" ? { teacherId: userId } : {}, { OR: or }],
    },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      status: true,
      groupId: true,
      group: { select: { name: true } },
      teacher: { select: { fullName: true, email: true } },
    },
  });

  return rows.map((row) => ({
    kind: "LESSON" as const,
    id: row.id,
    label: row.title,
    detail: `${DATE.format(row.startsAt)} · ${row.group.name} · ${row.teacher.fullName || row.teacher.email}`,
    href: lessonHref(role, row),
  }));
}

async function searchOrders(needles: string[], digits: string): Promise<GlobalSearchResult[]> {
  const or: Prisma.OdOrderWhereInput[] = [];
  for (const needle of needles) {
    or.push(
      { id: { contains: needle } },
      { packageName: { contains: needle, mode: "insensitive" } },
      {
        user: {
          is: {
            OR: [
              { fullName: { contains: needle, mode: "insensitive" } },
              { email: { contains: needle, mode: "insensitive" } },
              { phone: { contains: needle } },
            ],
          },
        },
      },
    );
  }
  if (digits.length >= 4) {
    or.push({ user: { is: { phone: { contains: digits } } } });
  }

  const rows = await prisma.odOrder.findMany({
    where: { OR: or },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      packageName: true,
      status: true,
      provisioningStatus: true,
      user: { select: { fullName: true, email: true } },
    },
  });

  return rows.map((row) => {
    const who = row.user?.fullName || row.user?.email || "hesap bekleniyor";
    return {
      kind: "ORDER" as const,
      id: row.id,
      label: `#${row.id.slice(0, 8).toUpperCase()}`,
      detail: `${row.packageName} — ${who} · ${row.status}/${row.provisioningStatus}`,
      href: `/panel/yonetim/siparisler/${row.id}`,
    };
  });
}

async function searchLeads(
  unitIds: string[],
  needles: string[],
  digits: string,
): Promise<GlobalSearchResult[]> {
  if (!unitIds.length) return [];

  const or: Prisma.BusinessLeadWhereInput[] = [];
  for (const needle of needles) {
    or.push(
      { firstName: { contains: needle, mode: "insensitive" } },
      { lastName: { contains: needle, mode: "insensitive" } },
      { studentName: { contains: needle, mode: "insensitive" } },
      { parentName: { contains: needle, mode: "insensitive" } },
      { email: { contains: needle, mode: "insensitive" } },
      { normalizedEmail: { contains: needle.toLowerCase() } },
      { phone: { contains: needle } },
      { normalizedPhone: { contains: needle } },
    );
    if (looksLikeRecordId(needle)) or.push({ id: needle });
  }
  if (digits.length >= 4) {
    or.push({ phone: { contains: digits } }, { normalizedPhone: { contains: digits } });
  }

  const rows = await prisma.businessLead.findMany({
    where: {
      businessUnitId: { in: unitIds },
      anonymizedAt: null,
      OR: or,
    },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentName: true,
      parentName: true,
      email: true,
      phone: true,
      stage: true,
      conversationId: true,
    },
  });

  return rows.map((row) => {
    const name =
      [row.firstName, row.lastName].filter(Boolean).join(" ") ||
      row.studentName ||
      row.parentName ||
      row.email ||
      row.phone ||
      "Adsız aday";
    const href = row.conversationId
      ? `/panel/yonetim/isletme/mesaj-kutusu?conversation=${row.conversationId}`
      : `/panel/yonetim/isletme/adaylar`;
    return {
      kind: "LEAD" as const,
      id: row.id,
      label: name,
      detail: `${row.stage}${row.studentName ? ` · öğrenci: ${row.studentName}` : ""}`,
      href,
    };
  });
}

async function searchExams(needles: string[]): Promise<GlobalSearchResult[]> {
  const or = needles.flatMap((needle) => [
    { title: { contains: needle, mode: "insensitive" as const } },
    { slug: { contains: needle, mode: "insensitive" as const } },
    ...(looksLikeRecordId(needle) ? [{ id: needle }] : []),
  ]);

  const rows = await prisma.odkExam.findMany({
    where: { OR: or },
    take: GLOBAL_SEARCH_PER_KIND_LIMIT,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      family: true,
      status: true,
      startsAt: true,
    },
  });

  return rows.map((row) => ({
    kind: "EXAM" as const,
    id: row.id,
    label: row.title,
    detail: `${row.family} · ${row.status}${row.startsAt ? ` · ${DATE.format(row.startsAt)}` : ""}`,
    href: `/panel/odk/yonetim/sinavlar/${row.id}`,
  }));
}

export type GlobalSearchResponse = {
  query: string;
  commands: GlobalSearchResult[];
  results: GlobalSearchResult[];
};

/**
 * Yetkili global arama. Sonuçlar sunucuda permission filtrelenir —
 * istemciye tüm kayıtlar dökülmez.
 */
export async function runGlobalSearch(
  session: SessionUser,
  rawQuery: string,
): Promise<GlobalSearchResponse> {
  const query = rawQuery.trim().slice(0, 80);
  const viewer = await buildViewer(session);
  const allowedCommands = visibleGlobalSearchCommands(viewer);
  const commandResults = commandsToResults(matchCommands(allowedCommands, query));

  if (query.length < 2) {
    return { query, commands: commandResults, results: [] };
  }

  const primaryNeedles = searchNeedleVariants(query);
  const relaxed = typoRelaxedNeedles(query);
  // Typo varyantları yalnız birincil sonuç boş kalırsa ikinci turda kullanılır;
  // ilk sorguda OR patlamasın diye primary ile sınırlı tut.
  const needles = primaryNeedles;
  const digits = phoneDigits(query);
  const role = session.role;
  const userId = session.userId;

  if (role === "TEACHER") {
    const [students, groups, lessons] = await Promise.all([
      searchStudents(role, userId, needles, digits),
      searchGroups(role, userId, needles),
      searchLessons(role, userId, needles),
    ]);

    let results = [...students, ...groups, ...lessons];
    if (!results.length && relaxed.length) {
      const [students2, groups2, lessons2] = await Promise.all([
        searchStudents(role, userId, relaxed, digits),
        searchGroups(role, userId, relaxed),
        searchLessons(role, userId, relaxed),
      ]);
      results = [...students2, ...groups2, ...lessons2];
    }

    return { query, commands: commandResults, results };
  }

  if (role !== "ADMIN") {
    return { query, commands: [], results: [] };
  }

  const leadUnits = await getBusinessAccess(session, "lead:read");
  const unitIds = leadUnits.map((unit) => unit.id);

  const [students, parents, teachers, users, groups, lessons, orders, leads, exams] =
    await Promise.all([
      searchStudents(role, userId, needles, digits),
      searchParents(needles, digits),
      searchTeachers(needles, digits),
      searchUsers(needles, digits),
      searchGroups(role, userId, needles),
      searchLessons(role, userId, needles),
      searchOrders(needles, digits),
      searchLeads(unitIds, needles, digits),
      searchExams(needles),
    ]);

  let results = [
    ...students,
    ...parents,
    ...teachers,
    ...users,
    ...groups,
    ...lessons,
    ...orders,
    ...leads,
    ...exams,
  ];

  if (!results.length && relaxed.length) {
    const retry = await Promise.all([
      searchStudents(role, userId, relaxed, digits),
      searchParents(relaxed, digits),
      searchTeachers(relaxed, digits),
      searchUsers(relaxed, digits),
      searchGroups(role, userId, relaxed),
      searchLessons(role, userId, relaxed),
      searchOrders(relaxed, digits),
      searchLeads(unitIds, relaxed, digits),
      searchExams(relaxed),
    ]);
    results = retry.flat();
  }

  return { query, commands: commandResults, results };
}

/** Test/dokümantasyon: hangi entity'lerin hangi rolde indekslendiğini açıklar. */
export const GLOBAL_SEARCH_INDEXED_ENTITIES = {
  ADMIN: ["STUDENT", "PARENT", "TEACHER", "USER", "GROUP", "LESSON", "ORDER", "LEAD", "EXAM"] as const,
  TEACHER: ["STUDENT", "GROUP", "LESSON"] as const,
} as const;
