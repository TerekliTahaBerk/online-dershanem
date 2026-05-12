"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { PANEL_VIEW_COOKIE, isPanelSegment } from "@/lib/panel-access";

/**
 * Admin\'in baska bir rolun panelini view-as etmesini saglar.
 * Admin olmayanlar her zaman 403 davranisi (cookie hic set edilmez).
 */
export async function setViewAsAction(target: string) {
  const session = await getServerAuthSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Yetki yok." };
  }

  const cookieStore = await cookies();

  if (!isPanelSegment(target) || target === "admin") {
    cookieStore.delete(PANEL_VIEW_COOKIE);
    redirect("/panel/admin");
  }

  cookieStore.set(PANEL_VIEW_COOKIE, target, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 saat
  });
  redirect(`/panel/${target}`);
}
