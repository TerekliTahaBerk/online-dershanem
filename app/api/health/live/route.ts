import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOT_AT = new Date().toISOString();

/** Yalnız process'in cevap verebildiğini ölçer; DB veya dış servis çağırmaz. */
export async function GET() {
  return NextResponse.json({
    status: "live",
    live: true,
    bootAt: BOOT_AT,
    now: new Date().toISOString(),
    uptimeMs: Math.round(process.uptime() * 1000),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
