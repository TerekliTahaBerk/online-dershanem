import { redirect } from "next/navigation";
import { requireProductRole } from "@/lib/auth/guards";
import { productRolePath } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function OdkRouterPage() {
  const session = await requireProductRole("ODK", "ADMIN", "TEACHER", "STUDENT", "PARENT");
  redirect(productRolePath("ODK", session.role));
}
