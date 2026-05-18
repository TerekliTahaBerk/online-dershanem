/**
 * Geriye dönük uyumluluk için tutulan eski ODK callback rotası.
 * Yeni unified endpoint /api/paytr/callback'tir; PayTR mağaza panelinde
 * bu URL kullanılabilir ama önerilen unified URL'dir.
 */
export { POST } from "@/app/api/paytr/callback/route";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
