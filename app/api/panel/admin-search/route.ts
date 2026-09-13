import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { runGlobalSearch } from "@/lib/panel/global-search-server";

const querySchema = z.object({
  q: z.string().trim().max(80).default(""),
});

/**
 * Panel global search + command palette.
 *
 * ADMIN: öğrenci, veli, öğretmen, kullanıcı, grup, ders, sipariş, lead, deneme
 * TEACHER: yalnız kendi grubu / koçluğundaki öğrenci + kendi grup/dersleri
 *
 * Permission filtresi sunucuda uygulanır; istemciye yetkisiz kayıt dönmez.
 */
export async function GET(request: Request) {
  const auth = await requireApiAccountRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ query: "", commands: [], results: [] });
  }

  const payload = await runGlobalSearch(auth.session, parsed.data.q);
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
