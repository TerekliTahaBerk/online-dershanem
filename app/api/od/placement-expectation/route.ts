import { NextResponse } from "next/server";
import { z } from "zod";
import { getOdPlacementExpectation } from "@/lib/od/placement-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ category: z.enum(["LGS", "YKS", "TYT", "AYT"]).optional() });

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz kategori." }, { status: 400 });
  const expectation = await getOdPlacementExpectation(parsed.data.category ?? null);
  return NextResponse.json(expectation, { headers: { "cache-control": "private, no-store" } });
}
