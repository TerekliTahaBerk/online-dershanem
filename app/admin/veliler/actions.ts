"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { sendParentInvite } from "@/lib/email";
import { publishInboxMessage } from "@/lib/inbox";

const ParentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("90") ? digits : digits.startsWith("0") ? "9" + digits : digits;
}

function genTempPassword(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export type ParentFormState =
  | { ok: true; id: string; invited?: boolean }
  | { ok: false; error: string }
  | null;

export async function createParent(_prev: ParentFormState, formData: FormData): Promise<ParentFormState> {
  const session = await requireAdmin();
  const parsed = ParentSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form" };

  const phoneKey = normalizePhone(parsed.data.phone || null);
  const email = parsed.data.email || null;

  try {
    const p = await prisma.parent.create({
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || null,
        phoneKey,
        email,
        notes: parsed.data.notes || null,
      },
    });
    await auditLog({
      actorUserId: session.user!.id,
      action: "PARENT_CREATE",
      entityType: "Parent",
      entityId: p.id,
      summary: `Veli oluşturuldu: ${p.fullName}`,
    });
    revalidatePath("/admin/veliler");
    return { ok: true, id: p.id };
  } catch (err: any) {
    if (err?.code === "P2002") return { ok: false, error: "Bu e-posta veya telefon zaten kayıtlı." };
    return { ok: false, error: "Veli oluşturulamadı." };
  }
}

export async function updateParent(id: string, _prev: ParentFormState, formData: FormData): Promise<ParentFormState> {
  const session = await requireAdmin();
  const parsed = ParentSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form" };

  const phoneKey = normalizePhone(parsed.data.phone || null);
  try {
    await prisma.parent.update({
      where: { id },
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || null,
        phoneKey,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      },
    });
    await auditLog({
      actorUserId: session.user!.id,
      action: "PARENT_UPDATE",
      entityType: "Parent",
      entityId: id,
    });
    revalidatePath("/admin/veliler");
    revalidatePath(`/admin/veliler/${id}`);
    return { ok: true, id };
  } catch (err: any) {
    if (err?.code === "P2002") return { ok: false, error: "Bu e-posta veya telefon zaten kayıtlı." };
    return { ok: false, error: "Veli güncellenemedi." };
  }
}

export async function deleteParent(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.parent.delete({ where: { id } });
  await auditLog({
    actorUserId: session.user!.id,
    action: "PARENT_DELETE",
    entityType: "Parent",
    entityId: id,
  });
  revalidatePath("/admin/veliler");
}

// ── Parent ↔ Student bağları ────────────────────────────

export async function linkStudentToParent(formData: FormData) {
  await requireAdmin();
  const parentId = String(formData.get("parentId") || "");
  const studentId = String(formData.get("studentId") || "");
  const relationship = String(formData.get("relationship") || "") || null;
  const isPrimary = formData.get("isPrimary") === "on";
  if (!parentId || !studentId) return;
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    create: { parentId, studentId, relationship, isPrimary },
    update: { relationship, isPrimary },
  });
  revalidatePath(`/admin/veliler/${parentId}`);
}

export async function unlinkStudentFromParent(formData: FormData) {
  await requireAdmin();
  const parentId = String(formData.get("parentId") || "");
  const studentId = String(formData.get("studentId") || "");
  if (!parentId || !studentId) return;
  await prisma.parentStudent.delete({
    where: { parentId_studentId: { parentId, studentId } },
  });
  revalidatePath(`/admin/veliler/${parentId}`);
}

// ── Davet (panel hesabı oluştur + email) ─────────────────

export async function inviteParent(formData: FormData): Promise<{ ok: boolean; error?: string; password?: string }> {
  const session = await requireAdmin();
  const parentId = String(formData.get("parentId") || "");
  if (!parentId) return { ok: false, error: "Veli seçilmedi." };

  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    include: {
      students: { include: { student: { select: { fullName: true } } } },
    },
  });
  if (!parent) return { ok: false, error: "Veli bulunamadı." };
  if (!parent.email) return { ok: false, error: "Velinin e-posta adresi yok." };

  // Eğer User zaten varsa; bağla.
  let user = await prisma.user.findUnique({ where: { email: parent.email } });
  let tempPassword: string | null = null;

  if (!user) {
    tempPassword = genTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    user = await prisma.user.create({
      data: {
        email: parent.email,
        name: parent.fullName,
        role: "PARENT",
        passwordHash,
      },
    });
  } else if (user.role !== "PARENT" && user.role !== "ADMIN") {
    // Var olan kullanıcı farklı rolde — sadece parent ilişkisi kuruyoruz, role değiştirmiyoruz.
  }

  await prisma.parent.update({
    where: { id: parent.id },
    data: { userId: user.id },
  });

  // E-mail (en azından panele giriş yönlendirmesi)
  if (tempPassword) {
    try {
      await sendParentInvite({
        to: parent.email,
        parentName: parent.fullName,
        email: parent.email,
        password: tempPassword,
        childNames: parent.students.map((s: any) => s.student.fullName),
      });
    } catch (err) {
      console.error("[inviteParent] email failed:", err);
    }
  }

  // Inbox bildirimi (kullanıcı paneline ilk girince görsün)
  await publishInboxMessage({
    recipientUserId: user.id,
    category: "ANNOUNCEMENT",
    priority: "HIGH",
    title: "Veli paneliniz hazır",
    body: `Hoş geldiniz! Çocuğunuzun gelişimini /veli sayfasından takip edebilirsiniz.`,
    href: "/veli",
    createdById: session.user!.id,
  });

  await auditLog({
    actorUserId: session.user!.id,
    action: "PARENT_INVITE",
    entityType: "Parent",
    entityId: parent.id,
    payload: { tempPasswordIssued: Boolean(tempPassword) },
  });

  revalidatePath(`/admin/veliler/${parent.id}`);
  return { ok: true, password: tempPassword ?? undefined };
}
