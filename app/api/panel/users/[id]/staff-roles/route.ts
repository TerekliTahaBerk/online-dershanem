import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAccountRole, requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema } from "@/lib/api/input-validation";
import { STAFF_PRODUCT_CODES, STAFF_ROLE_NAMES } from "@/lib/products/staff-permission-matrix";
import {
  StaffAssignmentError,
  grantStaffRole,
  listStaffAssignmentHistory,
  revokeStaffRole,
} from "@/lib/products/staff-assignment-server";

/**
 * Yönetim · ürün personel sorumlulukları (Erişim Merkezi).
 *
 * GET    → aktif + geçmiş atamalar (yalnız ADMIN)
 * POST   → rol ver   (ADMIN + taze step-up; gerekçe zorunlu)
 * DELETE → rol iptal (ADMIN + taze step-up; gerekçe zorunlu)
 *
 * Satırlar silinmez; her işlem audit kaydı üretir. Platform rolü değişmez.
 */

const grantSchema = z.object({
  product: z.enum(STAFF_PRODUCT_CODES),
  role: z.enum(STAFF_ROLE_NAMES),
  reason: z.string().trim().min(3).max(500),
});
const revokeSchema = z.object({
  assignmentId: z.string().min(1).max(64),
  reason: z.string().trim().min(3).max(500),
});

function errorResponse(error: unknown) {
  if (error instanceof StaffAssignmentError) return NextResponse.json({ error: error.message }, { status: error.status });
  throw error;
}

async function mutationGuard(request: Request, actorUserId: string) {
  return guardMutation({
    action: "panel.users.staff_roles",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:users:staff-roles:${actorUserId}`,
    rateLimit: { max: 60, windowMs: 15 * 60 * 1000 },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return NextResponse.json({ error: "Geçersiz kullanıcı." }, { status: 400 });
  return NextResponse.json({ assignments: await listStaffAssignmentHistory(params.data.id) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await mutationGuard(request, auth.session.userId);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  const body = grantSchema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) return NextResponse.json({ error: "Ürün, rol ve gerekçe gerekli." }, { status: 400 });
  try {
    const result = await grantStaffRole({
      userId: params.data.id,
      productCode: body.data.product,
      role: body.data.role,
      actorUserId: auth.session.userId,
      reason: body.data.reason,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await mutationGuard(request, auth.session.userId);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  const body = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) return NextResponse.json({ error: "Atama ve gerekçe gerekli." }, { status: 400 });
  try {
    return NextResponse.json(
      await revokeStaffRole({
        assignmentId: body.data.assignmentId,
        userId: params.data.id,
        actorUserId: auth.session.userId,
        reason: body.data.reason,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
