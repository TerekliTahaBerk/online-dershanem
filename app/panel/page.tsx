import { redirect } from "next/navigation";
import { requirePanelSession } from "@/lib/panel-access";

export const dynamic = "force-dynamic";

export default async function PanelEntry() {
  const ctx = await requirePanelSession();
  redirect(`/panel/${ctx.segment}`);
}
