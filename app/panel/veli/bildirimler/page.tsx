import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function ParentNotificationsPage() {
  await requireRole("PARENT");
  redirect("/panel/bildirimler");
}
