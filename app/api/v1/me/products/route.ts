import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getUserAccessFlags } from "@/lib/access/odk";
import type { UserRole } from "@prisma/client";

/**
 * GET /api/v1/me/products
 *
 * Returns the current user's product access matrix for OD and ODK.
 * Used by:
 *  - Mobile app to decide which tabs to show
 *  - Product switcher disabled-state UI
 *  - Server-side redirects (e.g. require purchase before panel access)
 *
 * Response shape:
 * {
 *   ok: true,
 *   userId: string,
 *   role: UserRole,
 *   products: {
 *     od: { hasAccess: boolean, panelUrl: string, purchaseUrl: string },
 *     odk: { hasAccess: boolean, panelUrl: string, purchaseUrl: string }
 *   }
 * }
 */
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const role = (session.user.role as UserRole) || "STUDENT";
  const flags = await getUserAccessFlags(session.user.id, role);

  // Role'a göre panel kök URL'i
  const roleSeg =
    role === "ADMIN" ? "admin" :
    role === "TEACHER" ? "ogretmen" :
    role === "PARENT" ? "veli" :
    "ogrenci";

  return NextResponse.json(
    {
      ok: true,
      userId: session.user.id,
      role,
      products: {
        od: {
          hasAccess: flags.hasOD,
          panelUrl: `/panel/${roleSeg}`,
          purchaseUrl: "/paketler?from=panel",
        },
        odk: {
          hasAccess: flags.hasODK,
          panelUrl: `/panel/${roleSeg}/odk`,
          purchaseUrl: "/odk-paketleri?from=panel",
        },
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=30" },
    },
  );
}
