"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const TagSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/, "küçük harf/sayı/tire"),
  label: z.string().trim().min(1).max(80),
  color: z.enum(["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PURPLE", "PINK"]).default("GRAY"),
  scope: z.enum(["STUDENT", "TEACHER", "PARENT", "GENERAL"]).default("STUDENT"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export type TagFormState = { ok: true } | { ok: false; error: string } | null;

export async function createTag(_prev: TagFormState, formData: FormData): Promise<TagFormState> {
  const session = await requireAdmin();
  const parsed = TagSchema.safeParse({
    key: formData.get("key"),
    label: formData.get("label"),
    color: formData.get("color") || "GRAY",
    scope: formData.get("scope") || "STUDENT",
    description: formData.get("description") || "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form" };

  try {
    const t = await prisma.tag.create({
      data: { ...parsed.data, description: parsed.data.description || null },
    });
    await auditLog({
      actorUserId: session.user!.id,
      action: "TAG_CREATE",
      entityType: "Tag",
      entityId: t.id,
      summary: `Etiket oluşturuldu: ${t.label}`,
    });
    revalidatePath("/admin/etiketler");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") return { ok: false, error: "Bu anahtar zaten kullanılıyor." };
    return { ok: false, error: "Etiket oluşturulamadı." };
  }
}

export async function updateTag(id: string, _prev: TagFormState, formData: FormData): Promise<TagFormState> {
  const session = await requireAdmin();
  const parsed = TagSchema.safeParse({
    key: formData.get("key"),
    label: formData.get("label"),
    color: formData.get("color") || "GRAY",
    scope: formData.get("scope") || "STUDENT",
    description: formData.get("description") || "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  try {
    await prisma.tag.update({
      where: { id },
      data: { ...parsed.data, description: parsed.data.description || null },
    });
    await auditLog({
      actorUserId: session.user!.id,
      action: "TAG_UPDATE",
      entityType: "Tag",
      entityId: id,
    });
    revalidatePath("/admin/etiketler");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") return { ok: false, error: "Bu anahtar zaten kullanılıyor." };
    return { ok: false, error: "Etiket güncellenemedi." };
  }
}

export async function deleteTag(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag || tag.isSystem) return;
  await prisma.tag.delete({ where: { id } });
  await auditLog({
    actorUserId: session.user!.id,
    action: "TAG_DELETE",
    entityType: "Tag",
    entityId: id,
  });
  revalidatePath("/admin/etiketler");
}

// ── Student tag assignment ─────────────────────────────────

export async function assignTagToStudent(formData: FormData) {
  const session = await requireAdmin();
  const studentId = String(formData.get("studentId") || "");
  const tagId = String(formData.get("tagId") || "");
  const note = (formData.get("note") || "").toString().trim() || null;
  if (!studentId || !tagId) return;
  await prisma.studentTag.upsert({
    where: { studentId_tagId: { studentId, tagId } },
    create: { studentId, tagId, assignedById: session.user!.id, note },
    update: { note, assignedById: session.user!.id },
  });
  revalidatePath(`/admin/ogrenciler/${studentId}`);
}

export async function removeTagFromStudent(formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") || "");
  const tagId = String(formData.get("tagId") || "");
  if (!studentId || !tagId) return;
  await prisma.studentTag.delete({
    where: { studentId_tagId: { studentId, tagId } },
  });
  revalidatePath(`/admin/ogrenciler/${studentId}`);
}
