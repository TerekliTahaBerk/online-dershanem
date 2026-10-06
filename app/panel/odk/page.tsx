import { notFound, redirect } from "next/navigation";
import { requireProductRole } from "@/lib/auth/guards";
import { resolveProductEntryPath } from "@/lib/products/product-entry";

export const dynamic = "force-dynamic";

/** Deneme Ligi kökü: kullanıcıyı rolüne ve (personelse) izinlerine göre çalışma alanına yollar. */
export default async function OdkRouterPage() {
  const session = await requireProductRole(
    "ODK",
    "ADMIN",
    "TEACHER",
    "STUDENT",
    "PARENT",
  );
  const entry = await resolveProductEntryPath(session, "ODK");
  if (!entry) notFound();
  redirect(entry);
}
