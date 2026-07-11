import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deneme Kulübü satışları durduruldu. Tarihî ödeme callback ve sonuç rotaları
 * çalışmaya devam ederken yeni sipariş oluşturulmasına izin verilmez.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Deneme Kulübü şu anda satışta değildir. Güncel matematik ders paketleri için Ders Paketleri sayfasını inceleyebilirsiniz.",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
