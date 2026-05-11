"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { archiveMessages, markAllRead, markRead, unarchiveMessages } from "@/lib/inbox";

async function uid() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");
  return session.user.id;
}

function ids(formData: FormData): string[] {
  return formData.getAll("ids").map(String).filter(Boolean);
}

export async function adminMarkRead(formData: FormData) {
  const u = await uid(); await markRead(u, ids(formData));
  revalidatePath("/admin/inbox"); revalidatePath("/admin", "layout");
}
export async function adminArchive(formData: FormData) {
  const u = await uid(); await archiveMessages(u, ids(formData));
  revalidatePath("/admin/inbox");
}
export async function adminUnarchive(formData: FormData) {
  const u = await uid(); await unarchiveMessages(u, ids(formData));
  revalidatePath("/admin/inbox");
}
export async function adminMarkAllRead(_formData: FormData) {
  const u = await uid(); await markAllRead(u);
  revalidatePath("/admin/inbox"); revalidatePath("/admin", "layout");
}

export async function studentMarkRead(formData: FormData) {
  const u = await uid(); await markRead(u, ids(formData));
  revalidatePath("/panel/inbox"); revalidatePath("/panel", "layout");
}
export async function studentArchive(formData: FormData) {
  const u = await uid(); await archiveMessages(u, ids(formData));
  revalidatePath("/panel/inbox");
}
export async function studentUnarchive(formData: FormData) {
  const u = await uid(); await unarchiveMessages(u, ids(formData));
  revalidatePath("/panel/inbox");
}
export async function studentMarkAllRead(_formData: FormData) {
  const u = await uid(); await markAllRead(u);
  revalidatePath("/panel/inbox"); revalidatePath("/panel", "layout");
}

export async function teacherMarkRead(formData: FormData) {
  const u = await uid(); await markRead(u, ids(formData));
  revalidatePath("/ogretmen/inbox"); revalidatePath("/ogretmen", "layout");
}
export async function teacherArchive(formData: FormData) {
  const u = await uid(); await archiveMessages(u, ids(formData));
  revalidatePath("/ogretmen/inbox");
}
export async function teacherUnarchive(formData: FormData) {
  const u = await uid(); await unarchiveMessages(u, ids(formData));
  revalidatePath("/ogretmen/inbox");
}
export async function teacherMarkAllRead(_formData: FormData) {
  const u = await uid(); await markAllRead(u);
  revalidatePath("/ogretmen/inbox"); revalidatePath("/ogretmen", "layout");
}

export async function parentMarkRead(formData: FormData) {
  const u = await uid(); await markRead(u, ids(formData));
  revalidatePath("/veli/inbox"); revalidatePath("/veli", "layout");
}
export async function parentArchive(formData: FormData) {
  const u = await uid(); await archiveMessages(u, ids(formData));
  revalidatePath("/veli/inbox");
}
export async function parentUnarchive(formData: FormData) {
  const u = await uid(); await unarchiveMessages(u, ids(formData));
  revalidatePath("/veli/inbox");
}
export async function parentMarkAllRead(_formData: FormData) {
  const u = await uid(); await markAllRead(u);
  revalidatePath("/veli/inbox"); revalidatePath("/veli", "layout");
}
