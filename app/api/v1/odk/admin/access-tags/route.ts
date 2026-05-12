import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk } from "@/lib/odk/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const tags = await prisma.odkAccessTag.findMany({
    where: { isActive: true },
    orderBy: [{ service: "asc" }, { title: "asc" }],
    select: { id: true, key: true, title: true, service: true, description: true },
  });
  return apiOk({ tags });
}
