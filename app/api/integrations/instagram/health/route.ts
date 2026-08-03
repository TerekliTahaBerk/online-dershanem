import { NextResponse } from "next/server";
import { authorizeBusinessRequest } from "@/lib/business/permissions";
import { getInstagramProvider } from "@/lib/business/instagram";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const access = await authorizeBusinessRequest("integration:write");
  if (!access) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const [provider, pendingJobs] = await Promise.all([getInstagramProvider().health(), prisma.backgroundJob.count({ where: { status: { in: ["PENDING", "FAILED"] } } })]);
  return NextResponse.json({ configured: provider.ok, code: provider.code, webhookSecret: Boolean(process.env.META_APP_SECRET || process.env.META_WEBHOOK_SECRET), verifyToken: Boolean(process.env.META_VERIFY_TOKEN), pendingJobs });
}

