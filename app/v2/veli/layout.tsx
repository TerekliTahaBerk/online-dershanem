import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { AppShell } from "@/components/od/shell/app-shell";

export default async function ParentV2Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris?callbackUrl=/v2/veli");
  if (!session.user.hasParentAccess) redirect("/panel-secimi");

  return <AppShell panel="parent">{children}</AppShell>;
}
