import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { hasAdminPreviewPermission } from "@/lib/auth/admin-preview";
import { isPreviewableRole } from "@/lib/panel/preview-context";
import { previewErrorMessage, searchPreviewCandidates } from "@/lib/panel/preview-resolution";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  role: z.enum(["STUDENT", "PARENT", "TEACHER"]),
  q: z.string().trim().max(80).default(""),
});

export async function GET(request: Request) {
  const auth = await requireApiAccountRole("ADMIN");
  if (!auth.ok) return auth.response;
  if (!hasAdminPreviewPermission(auth.session)) {
    return NextResponse.json({ error: previewErrorMessage("FORBIDDEN") }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    role: url.searchParams.get("role"),
    q: url.searchParams.get("q") ?? "",
  });
  if (!parsed.success || !isPreviewableRole(parsed.data.role)) {
    return NextResponse.json({ candidates: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const candidates = await searchPreviewCandidates({
    role: parsed.data.role,
    query: parsed.data.q,
  });

  return NextResponse.json(
    { candidates },
    { headers: { "Cache-Control": "no-store" } },
  );
}
