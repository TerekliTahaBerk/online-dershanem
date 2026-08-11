/** Geriye uyumluluk: eski monitor URL'si readiness contract'ına yönelir. */
import { GET as readinessGET } from "./ready/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return readinessGET();
}
