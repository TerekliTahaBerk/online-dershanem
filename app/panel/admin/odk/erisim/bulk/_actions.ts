"use server";

import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { logAudit, logAuditMany } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type BulkRow = {
  line: number;
  email: string | null;
  phone: string | null;
  accessTagKey: string;
  expiresAt: string | null;
};

export type BulkValidationItem = {
  line: number;
  email: string | null;
  phone: string | null;
  accessTagKey: string;
  expiresAt: Date | null;
  userId: string | null;
  userLabel: string | null;
  accessTagId: string | null;
  accessTagLabel: string | null;
  warnings: string[];
  errors: string[];
  willGrant: boolean;
};

export type BulkValidationResult = {
  rows: BulkValidationItem[];
  totalRows: number;
  validCount: number;
  errorCount: number;
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQ = false; continue; }
      cur += ch;
    } else {
      if (ch === '"') { inQ = true; continue; }
      if (ch === ",") { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): { header: string[]; rows: BulkRow[] } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    email: header.indexOf("email"),
    phone: header.indexOf("phone"),
    accessTagKey: header.indexOf("accesstagkey"),
    expiresAt: header.indexOf("expiresat"),
  };
  const rows: BulkRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    rows.push({
      line: i + 1,
      email: idx.email >= 0 ? (cells[idx.email] || "").toLowerCase() || null : null,
      phone: idx.phone >= 0 ? (cells[idx.phone] || "") || null : null,
      accessTagKey: (idx.accessTagKey >= 0 ? (cells[idx.accessTagKey] || "") : "").toLowerCase(),
      expiresAt: idx.expiresAt >= 0 ? (cells[idx.expiresAt] || "") || null : null,
    });
  }
  return { header, rows };
}

async function validateRows(rows: BulkRow[]): Promise<BulkValidationItem[]> {
  const emails = Array.from(new Set(rows.map((r) => r.email).filter((e): e is string => !!e)));
  const phones = Array.from(new Set(rows.map((r) => r.phone).filter((p): p is string => !!p)));
  const tagKeys = Array.from(new Set(rows.map((r) => r.accessTagKey).filter(Boolean)));

  const [usersByEmail, studentsByPhone, tags] = await Promise.all([
    emails.length
      ? prisma.user.findMany({
          where: { email: { in: emails } },
          select: { id: true, email: true, name: true },
        })
      : Promise.resolve([] as { id: string; email: string; name: string | null }[]),
    phones.length
      ? prisma.student.findMany({
          where: { phone: { in: phones } },
          select: { userId: true, fullName: true, phone: true },
        })
      : Promise.resolve([] as { userId: string | null; fullName: string; phone: string | null }[]),
    tagKeys.length
      ? prisma.odkAccessTag.findMany({
          where: { key: { in: tagKeys } },
          select: { id: true, key: true, title: true, isActive: true },
        })
      : Promise.resolve([] as { id: string; key: string; title: string; isActive: boolean }[]),
  ]);

  const emailMap = new Map(usersByEmail.map((u) => [u.email, u]));
  const phoneMap = new Map<string, { userId: string; label: string }>();
  for (const s of studentsByPhone) {
    if (s.userId && s.phone) phoneMap.set(s.phone, { userId: s.userId, label: s.fullName });
  }
  const tagMap = new Map(tags.map((t) => [t.key, t]));

  return rows.map<BulkValidationItem>((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!r.email && !r.phone) errors.push("email veya phone gerekli");
    if (!r.accessTagKey) errors.push("accessTagKey gerekli");

    let userId: string | null = null;
    let userLabel: string | null = null;
    if (r.email) {
      const u = emailMap.get(r.email);
      if (u) { userId = u.id; userLabel = u.name ?? u.email; }
    }
    if (!userId && r.phone) {
      const ph = phoneMap.get(r.phone);
      if (ph) { userId = ph.userId; userLabel = ph.label; }
    }
    if (!userId) errors.push("kullanıcı bulunamadı");

    let accessTagId: string | null = null;
    let accessTagLabel: string | null = null;
    if (r.accessTagKey) {
      const t = tagMap.get(r.accessTagKey);
      if (!t) errors.push(`tag "${r.accessTagKey}" bulunamadı`);
      else if (!t.isActive) errors.push(`tag "${r.accessTagKey}" pasif`);
      else { accessTagId = t.id; accessTagLabel = t.title; }
    }

    let expiresAt: Date | null = null;
    if (r.expiresAt) {
      const d = new Date(r.expiresAt);
      if (Number.isNaN(d.getTime())) errors.push("expiresAt geçersiz tarih");
      else expiresAt = d;
    }

    return {
      line: r.line,
      email: r.email,
      phone: r.phone,
      accessTagKey: r.accessTagKey,
      expiresAt,
      userId,
      userLabel,
      accessTagId,
      accessTagLabel,
      warnings,
      errors,
      willGrant: errors.length === 0,
    };
  });
}

/**
 * Bulk grant validate / apply.
 * `mode = "dry-run"` (default) → sadece doğrulama; DB değişmez.
 * `mode = "apply"` → her geçerli satır için upsert OdkUserAccessTag.
 */
export async function bulkGrantOdkAccessAction(fd: FormData): Promise<BulkValidationResult & { applied?: number }> {
  const ctx = await requirePanelRole("admin");
  const mode = String(fd.get("mode") ?? "dry-run") === "apply" ? "apply" : "dry-run";
  const csvText = String(fd.get("csv") ?? "");

  if (!csvText.trim()) {
    return { rows: [], totalRows: 0, validCount: 0, errorCount: 0 };
  }

  const { rows } = parseCsv(csvText);
  const items = await validateRows(rows);
  const validCount = items.filter((i) => i.willGrant).length;
  const errorCount = items.length - validCount;

  let applied = 0;
  const appliedRows: { userId: string; accessTagId: string }[] = [];
  if (mode === "apply" && validCount > 0) {
    for (const it of items) {
      if (!it.willGrant || !it.userId || !it.accessTagId) continue;
      try {
        await prisma.odkUserAccessTag.upsert({
          where: { userId_accessTagId: { userId: it.userId, accessTagId: it.accessTagId } },
          create: {
            userId: it.userId,
            accessTagId: it.accessTagId,
            source: "MANUAL",
            grantedById: ctx.userId,
            expiresAt: it.expiresAt,
            revokedAt: null,
          },
          update: {
            revokedAt: null,
            expiresAt: it.expiresAt,
            grantedById: ctx.userId,
            source: "MANUAL",
          },
        });
        applied++;
        appliedRows.push({ userId: it.userId, accessTagId: it.accessTagId });
      } catch (err) {
        console.warn("[bulkGrant] row failed", it.line, err);
        it.errors.push("upsert hatası");
        it.willGrant = false;
      }
    }
    revalidatePath("/panel/admin/odk/erisim");
    revalidatePath("/panel/admin/odk/erisim/kullanicilar");

    if (applied > 0) {
      await logAudit({
        actorUserId: ctx.userId,
        entityType: "OdkUserAccessTag",
        entityId: "BULK",
        action: "BULK_GRANT_APPLIED",
        summary: `CSV bulk grant: ${applied} satır uygulandı, ${errorCount} hata`,
        payload: { applied, errors: errorCount, total: items.length },
      });
      // Per-row audit (max 200 satır — limit aşımı için head bırak)
      await logAuditMany(
        appliedRows.slice(0, 200).map((r) => ({
          actorUserId: ctx.userId,
          entityType: "OdkUserAccessTag",
          entityId: `${r.userId}:${r.accessTagId}`,
          action: "ACCESS_GRANT_BULK",
          summary: `bulk row`,
          payload: r,
        })),
      );
    }
  }

  return { rows: items, totalRows: items.length, validCount, errorCount, applied };
}
