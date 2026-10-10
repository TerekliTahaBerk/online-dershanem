import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAccountRole, type ApiAuth } from "@/lib/auth/api-guards";
import { listParentVisibleChildren, type ParentChild } from "@/lib/panel/parent-product-policy";

/**
 * VELİ JSON UÇLARININ ORTAK KAPISI (M6).
 *
 * `resolveParentScope` ile AYNI kural, ama `notFound()` yerine JSON 404:
 *  1. Kimlik + PARENT rolü + parola / MFA kapıları (`requireApiAccountRole`).
 *  2. `studentId` (StudentProfile.id) ZORUNLU ve biçimi doğrulanır → 400.
 *  3. Çocuk velinin `listParentVisibleChildren(parentId, "academic")`
 *     sonucunda ARANIR: aktif + bitmemiş + `canViewAcademic` bağlantı ve
 *     veliye görünür ürün (yalnız KPSS → yok). Bulunmazsa 404
 *     `CHILD_NOT_FOUND` — başka ailenin çocuğu ile var olmayan kimlik ayırt
 *     edilmez; ilk çocuğa SESSİZCE düşülmez.
 *  Ürün / bayrak / kaynak kontrolleri her uçta ayrıca yapılır.
 *
 * İstemcinin çocuk seçicisi yetki sınırı DEĞİLDİR.
 */
export const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" } as const;

const query = z.object({ studentId: z.string().trim().min(1).max(191) });

export type ParentChildAuth =
  | { ok: true; auth: Extract<ApiAuth, { ok: true }>; child: ParentChild }
  | { ok: false; response: Response };

export function childNotFound(): Response {
  return NextResponse.json({ error: "Öğrenci bulunamadı veya bu öğrenci için erişiminiz yok.", code: "CHILD_NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
}

export function featureDisabled(message: string): Response {
  return NextResponse.json({ error: message, code: "FEATURE_DISABLED" }, { status: 404, headers: PRIVATE_NO_STORE });
}

export function parentJson(body: unknown): Response {
  return NextResponse.json(body, { headers: PRIVATE_NO_STORE });
}

export async function requireParentChild(request: Request): Promise<ParentChildAuth> {
  const auth = await requireApiAccountRole("PARENT");
  if (!auth.ok) return auth;
  const parsed = query.safeParse({ studentId: new URL(request.url).searchParams.get("studentId") ?? undefined });
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: "Öğrenci seçimi geçersiz.", code: "VALIDATION" }, { status: 400, headers: PRIVATE_NO_STORE }) };
  }
  const children = await listParentVisibleChildren(auth.session.userId, "academic");
  const child = children.find((item) => item.id === parsed.data.studentId);
  if (!child) return { ok: false, response: childNotFound() };
  return { ok: true, auth, child };
}
