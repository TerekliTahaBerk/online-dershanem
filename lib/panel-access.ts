import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getServerAuthSession } from "@/lib/auth";

/**
 * Panel rol & yonlendirme yardimcilari.
 *
 * - 4 rol vardir: ADMIN, TEACHER, STUDENT, PARENT.
 * - Her rolun kendi `/panel/<segment>/...` agaci vardir.
 * - ADMIN istedigi rolun panelini "view-as" cookie\'siyle gezebilir.
 * - Diger roller cookie set etse bile yetkisi olmadigi panellere giremez
 *   (middleware bunu engeller).
 */

export const PANEL_VIEW_COOKIE = "od-view-as" as const;

export type PanelRole = "admin" | "ogretmen" | "ogrenci" | "veli";

const ROLE_TO_SEGMENT: Record<UserRole, PanelRole> = {
  ADMIN: "admin",
  TEACHER: "ogretmen",
  STUDENT: "ogrenci",
  PARENT: "veli",
};

const SEGMENT_TO_ROLE: Record<PanelRole, UserRole> = {
  admin: "ADMIN",
  ogretmen: "TEACHER",
  ogrenci: "STUDENT",
  veli: "PARENT",
};

export const PANEL_ROLES: ReadonlyArray<PanelRole> = [
  "admin",
  "ogretmen",
  "ogrenci",
  "veli",
];

export function roleToSegment(role: UserRole): PanelRole {
  return ROLE_TO_SEGMENT[role];
}

export function segmentToRole(segment: PanelRole): UserRole {
  return SEGMENT_TO_ROLE[segment];
}

export function isPanelSegment(value: string): value is PanelRole {
  return value === "admin" || value === "ogretmen" || value === "ogrenci" || value === "veli";
}

/**
 * Giris yapan kullaniciyi rolune gore dogru panel dashboard\'una yonlendiren
 * destination URL\'i uretir. callbackUrl varsa once o degerlendirilir.
 */
export function getPanelDestination(
  user: { role?: UserRole | null } | null | undefined,
  callbackUrl?: string | null,
): string {
  if (callbackUrl && callbackUrl.startsWith("/")) return callbackUrl;
  const role = user?.role ?? "STUDENT";
  return `/panel/${roleToSegment(role)}`;
}

export type EffectiveRole = {
  /** Login\'de gercek rol (DB). */
  actualRole: UserRole;
  /** Sayfada efektif rol (admin view-as yapmissa farkli olabilir). */
  role: UserRole;
  /** Admin baska bir rolun panelini izliyor mu? */
  isViewingAs: boolean;
  /** Segment karsiligi (URL). */
  segment: PanelRole;
};

/**
 * Server component\'lerde cagrilir. Session\'i okur, view-as cookie\'sini
 * dikkate alir, panel rolunun segmentini birlikte dondurur. Login yoksa
 * /giris\'e yonlendirir.
 */
export async function requirePanelSession(): Promise<EffectiveRole & { userId: string; email: string; name: string | null }> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const actualRole = (session.user.role ?? "STUDENT") as UserRole;
  let effective: UserRole = actualRole;
  let isViewingAs = false;

  if (actualRole === "ADMIN") {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(PANEL_VIEW_COOKIE)?.value;
    if (cookieValue && isPanelSegment(cookieValue)) {
      const targetRole = segmentToRole(cookieValue);
      if (targetRole !== "ADMIN") {
        effective = targetRole;
        isViewingAs = true;
      }
    }
  }

  return {
    actualRole,
    role: effective,
    isViewingAs,
    segment: roleToSegment(effective),
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
  };
}

/**
 * Belirli bir rolun URL\'ine erisim icin sayfa-level guard.
 * Admin her zaman gecer. Diger roller sadece kendi paneline erisir.
 */
export async function requirePanelRole(allowedSegment: PanelRole) {
  const ctx = await requirePanelSession();
  if (ctx.actualRole === "ADMIN") return ctx;
  if (ctx.segment !== allowedSegment) {
    redirect(`/panel/${ctx.segment}`);
  }
  return ctx;
}
