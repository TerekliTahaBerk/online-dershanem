import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { resolveEffectivePermissions } from "@/lib/services/permissions/queries";
import { defaultPermissionsFor } from "@/lib/rbac/enforce";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ permissions: [] }, { status: 401 });
  }
  try {
    const permissions = await resolveEffectivePermissions(
      session.user.id,
      session.user.role,
    );
    return NextResponse.json({ permissions, role: session.user.role });
  } catch {
    return NextResponse.json({
      permissions: defaultPermissionsFor(session.user.role),
      role: session.user.role,
      fallback: true,
    });
  }
}
