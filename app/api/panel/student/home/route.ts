import { NextResponse } from "next/server";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { getStudentHomeData } from "@/lib/panel/student-home-server";

/**
 * Mobil öğrenci ana sayfası. Ürün blokları ortak domain service'inden gelir;
 * entitlement'ı olmayan ürünün sorgusu çalışmaz ve DTO bloğu `null` olur.
 */
export async function GET() {
  const auth = await requireApiAccountRole("STUDENT");
  if (!auth.ok) return auth.response;

  const data = await getStudentHomeData({
    userId: auth.session.userId,
    role: auth.session.role,
  });

  return NextResponse.json({
    products: data.products,
    profile: data.profile,
    fullName: auth.session.fullName,
    productData: data.productData,
  });
}
