import { NextResponse } from "next/server";
import { getOdPlacementExpectation } from "@/lib/od/placement-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category");
  const expectation = await getOdPlacementExpectation(category);
  return NextResponse.json(expectation, { headers: { "cache-control": "private, no-store" } });
}
