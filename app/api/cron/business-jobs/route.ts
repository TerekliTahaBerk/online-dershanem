import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processBackgroundJobs, scheduleBusinessMaintenanceJobs } from "@/lib/business/jobs";
function valid(request: Request) {
  const expected = process.env.JOB_PROCESSOR_SECRET || process.env.CRON_SECRET || "";
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const a = Buffer.from(expected); const b = Buffer.from(actual);
  return expected.length > 15 && a.length === b.length && timingSafeEqual(a, b);
}
export async function GET(request: Request) {
  if (!valid(request)) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  await scheduleBusinessMaintenanceJobs();
  return NextResponse.json({ processed: await processBackgroundJobs(20) });
}
export const POST = GET;
