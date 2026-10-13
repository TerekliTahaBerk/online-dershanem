import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { releasePreviewSchema } from "@/lib/odk/admin-schemas";
import { previewOdkRelease } from "@/lib/odk/exam-results-commands";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:result:score"); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsed = releasePreviewSchema.safeParse(await request.json().catch(() => ({})));
  return previewOdkRelease(id, parsed.success ? Boolean(parsed.data.excludeReviewRequired) : false);
}
