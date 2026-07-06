/**
 * POST /api/coupons/validate
 * Body: { code, service: "OD"|"ODK", subtotalCents, email }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/lib/discount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  code: z.string().min(2).max(60),
  service: z.enum(["OD", "ODK"]),
  subtotalCents: z.number().int().positive().max(1_000_000_00),
  email: z.string().email(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Eksik bilgi." }, { status: 400 });
  }

  const res = await validateCoupon({
    code: parsed.data.code,
    customerKey: parsed.data.email.trim().toLowerCase(),
    service: parsed.data.service,
    subtotalCents: parsed.data.subtotalCents,
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.userMessage }, { status: 200 });
  }
  return NextResponse.json({
    ok: true,
    code: res.code,
    description: res.description,
    discountCents: res.discountCents,
    kindLabel: res.kindLabel,
  });
}
