/**
 * Phase 3 / Session 10 — Safe CSV import wizard library.
 *
 * Pure(-ish) server-only helpers for parsing, validating and committing
 * student / parent / teacher CSV imports. **No side effects** in parse +
 * validate paths; only `commitImport*` writes to the DB.
 *
 * Design constraints (see Session 10 spec):
 *   - admin-only entry point (caller enforces; we re-check by calling
 *     `requirePanelRole("admin")` in the actions layer)
 *   - dry-run preview is mandatory before commit
 *   - server re-parses + re-validates the CSV on commit (never trust
 *     client status)
 *   - rows with status=ERROR are never committed
 *   - WARNING rows committed only when `allowWarnings=true`
 *   - SKIPPED_DUPLICATE rows are never committed (idempotent re-runs)
 *   - no password hashes / invite tokens are ever read from CSV
 *   - account creation is opt-in via `accountMode` column; defaults to "none"
 *   - we cap rows at MAX_IMPORT_ROWS to keep validation/commit bounded
 */
import "server-only";
import type { Prisma, ParentRelationship, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/auth-utils";
import {
  findStudentDuplicates,
  findParentDuplicates,
  findTeacherDuplicates,
  generateUserInviteToken,
  defaultUserInviteExpiresAt,
  type DuplicateMatch,
} from "@/lib/panel/account-onboarding";
import {
  MAX_IMPORT_ROWS,
  normalizeHeader,
  getImportRowStatusLabel,
  getImportRowStatusTone,
  type ImportEntity,
  type ImportRowStatus,
  type ImportRowMessage,
  type WouldCreateFlags,
  type ParsedRow,
  type ValidatedRow,
  type DryRunSummary,
  type DryRunResult,
  type CommitOptions,
  type CommittedRow,
  type CommitSummary,
  type CommitResult,
  type ImportColumnSpec,
} from "@/lib/panel/imports-shared";

// Re-export so existing call sites that imported from `@/lib/panel/imports`
// keep working without churn.
export {
  MAX_IMPORT_ROWS,
  normalizeHeader,
  getImportRowStatusLabel,
  getImportRowStatusTone,
};
export type {
  ImportEntity,
  ImportRowStatus,
  ImportRowMessage,
  WouldCreateFlags,
  ParsedRow,
  ValidatedRow,
  DryRunSummary,
  DryRunResult,
  CommitOptions,
  CommittedRow,
  CommitSummary,
  CommitResult,
  ImportColumnSpec,
};


// ─── Column specs (must stay in sync with /api/panel/import-templates/[entity])
// ────────────────────────────────────────────────────────────────────────────

const STUDENT_COLUMNS: ImportColumnSpec[] = [
  { header: "Ad Soyad", key: "fullName", required: true },
  { header: "Telefon", key: "phone", required: true, description: "Telefon zorunlu (DB phoneKey unique)" },
  { header: "Email", key: "email", required: false },
  { header: "Sınıf", key: "classroomName", required: false, description: "Sınıf adı (varsa) — opsiyonel" },
  { header: "Sınav", key: "examType", required: false },
  { header: "Şehir", key: "city", required: false },
  { header: "İlçe", key: "district", required: false },
  { header: "Okul", key: "schoolName", required: false },
  { header: "Hedef", key: "targetGoal", required: false },
  { header: "Notlar", key: "notes", required: false },
  // Hidden / opt-in extension columns. The template route does not include
  // these by default, but admins who edit the CSV can set them.
  { header: "Hesap Modu", key: "accountMode", required: false, description: "none | invite | disabled (varsayılan: none)" },
];

const PARENT_COLUMNS: ImportColumnSpec[] = [
  { header: "Ad Soyad", key: "fullName", required: true },
  { header: "Telefon", key: "phone", required: false, description: "Telefon veya Email zorunlu" },
  { header: "Email", key: "email", required: false },
  { header: "Yakınlık (MOTHER|FATHER|GUARDIAN|SIBLING|OTHER)", key: "relationshipType", required: false },
  { header: "Notlar", key: "notes", required: false },
  { header: "Çocuk Email", key: "childEmail", required: false, description: "Mevcut öğrenciye link (opsiyonel)" },
  { header: "Çocuk Telefon", key: "childPhone", required: false, description: "Mevcut öğrenciye link (opsiyonel)" },
  { header: "Hesap Modu", key: "accountMode", required: false, description: "none | invite | disabled" },
];

const TEACHER_COLUMNS: ImportColumnSpec[] = [
  { header: "Ad Soyad", key: "fullName", required: true },
  { header: "Email", key: "email", required: true },
  { header: "Telefon", key: "phone", required: false },
  { header: "Branş", key: "subjects", required: true },
  { header: "Bio", key: "bio", required: false },
  { header: "Hesap Modu", key: "accountMode", required: false, description: "none | invite | disabled" },
];

export function getImportTemplateColumns(entity: ImportEntity): ImportColumnSpec[] {
  switch (entity) {
    case "students": return STUDENT_COLUMNS;
    case "parents":  return PARENT_COLUMNS;
    case "teachers": return TEACHER_COLUMNS;
  }
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

type ParseOk = { ok: true; headers: string[]; rows: ParsedRow[]; delimiter: string };
type ParseErr = { ok: false; error: string };

/**
 * Parses a CSV string. Supports:
 *   - UTF-8 BOM
 *   - quoted values with embedded commas / semicolons / newlines / `""` escape
 *   - both `,` and `;` delimiters (auto-detected from header line)
 *   - trims whitespace per cell
 *   - rejects empty input or rows beyond `MAX_IMPORT_ROWS`
 */
export function parseCsvImport(input: string): ParseOk | ParseErr {
  if (typeof input !== "string") return { ok: false, error: "Geçersiz CSV girdisi" };
  let text = input.replace(/^\uFEFF/, "");
  if (text.trim() === "") return { ok: false, error: "CSV boş" };

  // Pick delimiter from header line: whichever appears more outside quotes.
  const headerLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commaCount = countOutsideQuotes(headerLine, ",");
  const semiCount = countOutsideQuotes(headerLine, ";");
  const delimiter = semiCount > commaCount ? ";" : ",";

  // Tokenize the full text into records using a small state machine.
  const records: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuote = true;
      continue;
    }
    if (ch === delimiter) {
      cur.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      // close cell + record
      cur.push(cell);
      cell = "";
      // skip \r\n combo
      if (ch === "\r" && text[i + 1] === "\n") i++;
      // skip trailing empty record
      if (cur.length === 1 && cur[0] === "") {
        cur = [];
        continue;
      }
      records.push(cur);
      cur = [];
      continue;
    }
    cell += ch;
  }
  // flush trailing
  if (cell !== "" || cur.length > 0) {
    cur.push(cell);
    if (!(cur.length === 1 && cur[0] === "")) records.push(cur);
  }

  if (records.length === 0) return { ok: false, error: "CSV başlığı bulunamadı" };
  const headerRaw = (records.shift() ?? []).map((c) => c.trim());
  if (headerRaw.length === 0 || headerRaw.every((c) => c === "")) {
    return { ok: false, error: "CSV başlığı boş" };
  }

  // Drop comment rows (template hint row prefixed with `#`).
  const dataRecords = records.filter((r) => {
    if (r.length === 0) return false;
    const first = (r[0] ?? "").trim();
    if (first.startsWith("#")) return false;
    // skip fully blank rows
    return r.some((c) => (c ?? "").trim() !== "");
  });

  if (dataRecords.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `Çok fazla satır: en fazla ${MAX_IMPORT_ROWS} satır içe aktarabilirsiniz` };
  }

  const rows: ParsedRow[] = dataRecords.map((cells, idx) => {
    const raw: Record<string, string> = {};
    for (let i = 0; i < headerRaw.length; i++) {
      raw[headerRaw[i] ?? ""] = (cells[i] ?? "").trim();
    }
    return { rowNumber: idx + 1, raw };
  });

  return { ok: true, headers: headerRaw, rows, delimiter };
}

function countOutsideQuotes(s: string, ch: string): number {
  let n = 0;
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      if (inQ && s[i + 1] === '"') { i++; continue; }
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === ch) n++;
  }
  return n;
}

// ─── Header → canonical key mapping ──────────────────────────────────────────

function buildHeaderMap(headers: string[], spec: ImportColumnSpec[]): {
  byKey: Record<string, string | undefined>;
  unknown: string[];
} {
  const normalized = headers.map((h) => normalizeHeader(h));
  const byKey: Record<string, string | undefined> = {};
  for (const col of spec) {
    const target = normalizeHeader(col.header);
    const idx = normalized.indexOf(target);
    if (idx >= 0) byKey[col.key] = headers[idx];
  }
  const knownNorms = new Set(spec.map((c) => normalizeHeader(c.header)));
  const unknown = headers.filter((h) => h && !knownNorms.has(normalizeHeader(h)));
  return { byKey, unknown };
}

function pick(row: ParsedRow, headerMap: Record<string, string | undefined>, key: string): string {
  const header = headerMap[key];
  if (!header) return "";
  return (row.raw[header] ?? "").trim();
}

const VALID_RELATIONSHIP = new Set<ParentRelationship>(["MOTHER", "FATHER", "GUARDIAN", "SIBLING", "OTHER"]);
type ImportAccountMode = "none" | "invite" | "disabled";
function parseAccountMode(raw: string): ImportAccountMode | { invalid: true } {
  if (!raw) return "none";
  const v = raw.trim().toLowerCase();
  if (v === "none" || v === "invite" || v === "disabled") return v;
  if (v === "temppassword" || v === "temp_password" || v === "temp-password") {
    return { invalid: true };
  }
  return { invalid: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyFlags(): WouldCreateFlags {
  return {
    user: false,
    student: false,
    parent: false,
    teacher: false,
    classroomLink: false,
    parentLink: false,
    invite: false,
  };
}

// ─── Validators ──────────────────────────────────────────────────────────────

export async function validateStudentImportRows(parsed: ParsedRow[], headers: string[]): Promise<ValidatedRow[]> {
  const { byKey } = buildHeaderMap(headers, STUDENT_COLUMNS);

  // Pre-scan for in-batch duplicates (so two rows with the same email/phone
  // aren't both reported as "READY" and then the second blows up at commit).
  const seenEmails = new Map<string, number>(); // email → first rowNumber
  const seenPhones = new Map<string, number>();

  // Pre-load classroom names that appear in the batch (case-insensitive) to
  // resolve them to ids and surface a single warning per row.
  const classroomNames = new Set<string>();
  for (const r of parsed) {
    const cn = pick(r, byKey, "classroomName").trim();
    if (cn) classroomNames.add(cn.toLocaleLowerCase("tr-TR"));
  }
  const classrooms = classroomNames.size
    ? await prisma.classroom.findMany({
        where: { isActive: true },
        select: { id: true, name: true, branch: true },
        take: 500,
      })
    : [];

  function findClassroomId(name: string): string | null {
    const n = name.trim().toLocaleLowerCase("tr-TR");
    const hit = classrooms.find((c) => c.name.toLocaleLowerCase("tr-TR") === n);
    return hit?.id ?? null;
  }

  const out: ValidatedRow[] = [];
  for (const row of parsed) {
    const fullName = pick(row, byKey, "fullName");
    const phoneRaw = pick(row, byKey, "phone");
    const emailRaw = pick(row, byKey, "email");
    const classroomName = pick(row, byKey, "classroomName");
    const accountModeRaw = pick(row, byKey, "accountMode");

    const errors: ImportRowMessage[] = [];
    const warnings: ImportRowMessage[] = [];
    const duplicates: DuplicateMatch[] = [];
    const flags = emptyFlags();

    if (!fullName) errors.push({ field: "fullName", message: "Ad Soyad zorunlu" });
    if (!phoneRaw) {
      errors.push({ field: "phone", message: "Telefon zorunlu" });
    }

    let phoneKey: string | null = null;
    if (phoneRaw) {
      try {
        phoneKey = normalizePhone(phoneRaw);
      } catch {
        errors.push({ field: "phone", message: "Telefon formatı geçersiz" });
      }
    }

    let emailLower: string | null = null;
    if (emailRaw) {
      const lower = emailRaw.toLowerCase();
      if (!EMAIL_RE.test(lower)) {
        errors.push({ field: "email", message: "Email formatı geçersiz" });
      } else {
        emailLower = lower;
      }
    }

    // In-batch duplicate detection
    if (emailLower) {
      const prev = seenEmails.get(emailLower);
      if (prev != null) {
        errors.push({ field: "email", message: `Bu email aynı dosyada satır ${prev}'de zaten var` });
      } else {
        seenEmails.set(emailLower, row.rowNumber);
      }
    }
    if (phoneKey) {
      const prev = seenPhones.get(phoneKey);
      if (prev != null) {
        errors.push({ field: "phone", message: `Bu telefon aynı dosyada satır ${prev}'de zaten var` });
      } else {
        seenPhones.set(phoneKey, row.rowNumber);
      }
    }

    // Account mode (must be safe set: none | invite | disabled)
    const accountMode = parseAccountMode(accountModeRaw);
    let mode: ImportAccountMode = "none";
    if (typeof accountMode === "object") {
      errors.push({
        field: "accountMode",
        message: "Hesap Modu sadece 'none', 'invite' veya 'disabled' olabilir. Geçici şifre içe aktarma desteklenmez.",
      });
    } else {
      mode = accountMode;
    }
    if ((mode === "invite" || mode === "disabled") && !emailLower) {
      errors.push({
        field: "accountMode",
        message: "Hesap oluşturmak için Email zorunlu",
      });
      mode = "none";
    }

    // Existing-record duplicate detection (outside batch)
    if (errors.length === 0 && (phoneKey || emailLower)) {
      const dups = await findStudentDuplicates({ phoneKey, email: emailLower });
      duplicates.push(...dups);
      for (const d of dups) {
        if (d.entity === "User" && d.field === "user.email") {
          if (mode === "invite" || mode === "disabled") {
            errors.push({ field: "email", message: `Aynı emaille User zaten var (${d.existingLabel})` });
          } else {
            warnings.push({ field: "email", message: `Aynı emaille User zaten var (hesap oluşturulmayacak)` });
          }
        } else if (d.entity === "Student") {
          warnings.push({ field: d.field, message: `Aynı ${d.field === "phoneKey" ? "telefonla" : "alanla"} öğrenci var: ${d.existingLabel}` });
        } else if (d.entity === "Parent") {
          warnings.push({ field: d.field, message: `Aynı telefonla veli var: ${d.existingLabel}` });
        }
      }
    }

    // Classroom resolution
    let classroomId: string | null = null;
    if (classroomName) {
      classroomId = findClassroomId(classroomName);
      if (!classroomId) {
        warnings.push({ field: "classroomName", message: `Sınıf bulunamadı: ${classroomName} (atama yapılmayacak)` });
      } else {
        flags.classroomLink = true;
      }
    }

    flags.student = errors.length === 0;
    flags.user = flags.student && (mode === "invite" || mode === "disabled");
    flags.invite = flags.student && mode === "invite";

    let status: ImportRowStatus = errors.length > 0
      ? "ERROR"
      : warnings.length > 0
        ? "WARNING"
        : "READY";

    // If a real Student already matches by phoneKey, default to SKIPPED (idempotent re-runs)
    const studentDup = duplicates.find((d) => d.entity === "Student" && d.field === "phoneKey");
    if (studentDup && status !== "ERROR") status = "SKIPPED_DUPLICATE";

    out.push({
      rowNumber: row.rowNumber,
      raw: row.raw,
      normalized: {
        fullName: fullName || null,
        phone: phoneRaw || null,
        phoneKey,
        email: emailLower,
        classroomId,
        accountMode: mode,
      },
      status,
      errors,
      warnings,
      duplicates,
      wouldCreate: flags,
    });
  }
  return out;
}

export async function validateParentImportRows(parsed: ParsedRow[], headers: string[]): Promise<ValidatedRow[]> {
  const { byKey } = buildHeaderMap(headers, PARENT_COLUMNS);

  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();

  const out: ValidatedRow[] = [];
  for (const row of parsed) {
    const fullName = pick(row, byKey, "fullName");
    const phoneRaw = pick(row, byKey, "phone");
    const emailRaw = pick(row, byKey, "email");
    const relationshipRaw = pick(row, byKey, "relationshipType");
    const childEmail = pick(row, byKey, "childEmail");
    const childPhone = pick(row, byKey, "childPhone");
    const accountModeRaw = pick(row, byKey, "accountMode");

    const errors: ImportRowMessage[] = [];
    const warnings: ImportRowMessage[] = [];
    const duplicates: DuplicateMatch[] = [];
    const flags = emptyFlags();

    if (!fullName) errors.push({ field: "fullName", message: "Ad Soyad zorunlu" });
    if (!phoneRaw && !emailRaw) {
      errors.push({ message: "Telefon veya Email zorunlu" });
    }

    let phoneKey: string | null = null;
    if (phoneRaw) {
      try { phoneKey = normalizePhone(phoneRaw); }
      catch { errors.push({ field: "phone", message: "Telefon formatı geçersiz" }); }
    }
    let emailLower: string | null = null;
    if (emailRaw) {
      const lower = emailRaw.toLowerCase();
      if (!EMAIL_RE.test(lower)) errors.push({ field: "email", message: "Email formatı geçersiz" });
      else emailLower = lower;
    }

    if (emailLower) {
      const prev = seenEmails.get(emailLower);
      if (prev != null) errors.push({ field: "email", message: `Bu email aynı dosyada satır ${prev}'de zaten var` });
      else seenEmails.set(emailLower, row.rowNumber);
    }
    if (phoneKey) {
      const prev = seenPhones.get(phoneKey);
      if (prev != null) errors.push({ field: "phone", message: `Bu telefon aynı dosyada satır ${prev}'de zaten var` });
      else seenPhones.set(phoneKey, row.rowNumber);
    }

    let relationshipType: ParentRelationship | null = null;
    if (relationshipRaw) {
      const upper = relationshipRaw.trim().toUpperCase() as ParentRelationship;
      if (VALID_RELATIONSHIP.has(upper)) relationshipType = upper;
      else warnings.push({ field: "relationshipType", message: `Bilinmeyen yakınlık: ${relationshipRaw}` });
    }

    const accountMode = parseAccountMode(accountModeRaw);
    let mode: ImportAccountMode = "none";
    if (typeof accountMode === "object") {
      errors.push({ field: "accountMode", message: "Hesap Modu sadece 'none', 'invite' veya 'disabled' olabilir" });
    } else {
      mode = accountMode;
    }
    if ((mode === "invite" || mode === "disabled") && !emailLower) {
      errors.push({ field: "accountMode", message: "Hesap oluşturmak için Email zorunlu" });
      mode = "none";
    }

    if (errors.length === 0 && (phoneKey || emailLower)) {
      const dups = await findParentDuplicates({ phoneKey, email: emailLower });
      duplicates.push(...dups);
      for (const d of dups) {
        if (d.entity === "User" && d.field === "user.email") {
          if (mode === "invite" || mode === "disabled") {
            errors.push({ field: "email", message: `Aynı emaille User zaten var (${d.existingLabel})` });
          } else {
            warnings.push({ field: "email", message: "Aynı emaille User zaten var (hesap oluşturulmayacak)" });
          }
        } else if (d.entity === "Parent") {
          warnings.push({ field: d.field, message: `Aynı veli zaten var: ${d.existingLabel}` });
        } else if (d.entity === "Student") {
          warnings.push({ field: d.field, message: `Aynı telefonla öğrenci kaydı var: ${d.existingLabel}` });
        }
      }
    }

    // Child resolution (optional)
    let childStudentId: string | null = null;
    if (childEmail || childPhone) {
      const childPhoneKey = childPhone ? safeNormalizePhone(childPhone) : null;
      const childEmailLower = childEmail ? childEmail.toLowerCase() : null;
      if (childEmailLower || childPhoneKey) {
        const child = await prisma.student.findFirst({
          where: {
            OR: [
              ...(childEmailLower ? [{ email: childEmailLower } satisfies Prisma.StudentWhereInput] : []),
              ...(childPhoneKey ? [{ phoneKey: childPhoneKey } satisfies Prisma.StudentWhereInput] : []),
            ],
          },
          select: { id: true, fullName: true },
        });
        if (child) {
          childStudentId = child.id;
          flags.parentLink = true;
        } else {
          warnings.push({ message: `Çocuk bulunamadı (link atlanacak)` });
        }
      }
    }

    flags.parent = errors.length === 0;
    flags.user = flags.parent && (mode === "invite" || mode === "disabled");
    flags.invite = flags.parent && mode === "invite";

    let status: ImportRowStatus = errors.length > 0
      ? "ERROR"
      : warnings.length > 0
        ? "WARNING"
        : "READY";
    const parentDup = duplicates.find((d) => d.entity === "Parent" && (d.field === "phoneKey" || d.field === "email"));
    if (parentDup && status !== "ERROR") status = "SKIPPED_DUPLICATE";

    out.push({
      rowNumber: row.rowNumber,
      raw: row.raw,
      normalized: {
        fullName: fullName || null,
        phone: phoneRaw || null,
        phoneKey,
        email: emailLower,
        relationshipType,
        childStudentId,
        accountMode: mode,
      },
      status,
      errors,
      warnings,
      duplicates,
      wouldCreate: flags,
    });
  }
  return out;
}

export async function validateTeacherImportRows(parsed: ParsedRow[], headers: string[]): Promise<ValidatedRow[]> {
  const { byKey } = buildHeaderMap(headers, TEACHER_COLUMNS);
  const seenEmails = new Map<string, number>();

  const out: ValidatedRow[] = [];
  for (const row of parsed) {
    const fullName = pick(row, byKey, "fullName");
    const emailRaw = pick(row, byKey, "email");
    const phoneRaw = pick(row, byKey, "phone");
    const subjects = pick(row, byKey, "subjects");
    const bio = pick(row, byKey, "bio");
    const accountModeRaw = pick(row, byKey, "accountMode");

    const errors: ImportRowMessage[] = [];
    const warnings: ImportRowMessage[] = [];
    const duplicates: DuplicateMatch[] = [];
    const flags = emptyFlags();

    if (!fullName) errors.push({ field: "fullName", message: "Ad Soyad zorunlu" });
    if (!emailRaw) errors.push({ field: "email", message: "Email zorunlu" });
    if (!subjects) errors.push({ field: "subjects", message: "Branş zorunlu" });

    let emailLower: string | null = null;
    if (emailRaw) {
      const lower = emailRaw.toLowerCase();
      if (!EMAIL_RE.test(lower)) errors.push({ field: "email", message: "Email formatı geçersiz" });
      else emailLower = lower;
    }
    if (emailLower) {
      const prev = seenEmails.get(emailLower);
      if (prev != null) errors.push({ field: "email", message: `Bu email aynı dosyada satır ${prev}'de zaten var` });
      else seenEmails.set(emailLower, row.rowNumber);
    }

    const accountMode = parseAccountMode(accountModeRaw);
    let mode: ImportAccountMode = "none";
    if (typeof accountMode === "object") {
      errors.push({ field: "accountMode", message: "Hesap Modu sadece 'none', 'invite' veya 'disabled' olabilir" });
    } else {
      mode = accountMode;
    }
    if ((mode === "invite" || mode === "disabled") && !emailLower) {
      errors.push({ field: "accountMode", message: "Hesap oluşturmak için Email zorunlu" });
      mode = "none";
    }

    if (errors.length === 0 && (emailLower || phoneRaw || fullName)) {
      const dups = await findTeacherDuplicates({
        phone: phoneRaw || null,
        email: emailLower,
        fullName: fullName || null,
      });
      duplicates.push(...dups);
      for (const d of dups) {
        if (d.entity === "User" && d.field === "user.email") {
          errors.push({ field: "email", message: `Aynı emaille User zaten var (${d.existingLabel})` });
        } else if (d.entity === "Teacher" && d.field === "email") {
          errors.push({ field: "email", message: `Aynı emaille öğretmen var: ${d.existingLabel}` });
        } else if (d.entity === "Teacher") {
          warnings.push({ field: d.field, message: `Olası eşleşen öğretmen: ${d.existingLabel}` });
        }
      }
    }

    flags.teacher = errors.length === 0;
    flags.user = flags.teacher && (mode === "invite" || mode === "disabled");
    flags.invite = flags.teacher && mode === "invite";

    let status: ImportRowStatus = errors.length > 0
      ? "ERROR"
      : warnings.length > 0
        ? "WARNING"
        : "READY";
    const teacherDup = duplicates.find((d) => d.entity === "Teacher" && d.field === "email");
    if (teacherDup && status !== "ERROR") status = "SKIPPED_DUPLICATE";

    out.push({
      rowNumber: row.rowNumber,
      raw: row.raw,
      normalized: {
        fullName: fullName || null,
        email: emailLower,
        phone: phoneRaw || null,
        subjects: subjects || null,
        bio: bio || null,
        accountMode: mode,
      },
      status,
      errors,
      warnings,
      duplicates,
      wouldCreate: flags,
    });
  }
  return out;
}

function safeNormalizePhone(raw: string): string | null {
  try { return normalizePhone(raw); } catch { return null; }
}

// ─── Dry-run orchestrator ────────────────────────────────────────────────────

export async function dryRunImport(entity: ImportEntity, csv: string): Promise<DryRunResult> {
  const columns = getImportTemplateColumns(entity);
  const parsed = parseCsvImport(csv);
  if (!parsed.ok) {
    return {
      entity,
      columns,
      rows: [],
      summary: { total: 0, ready: 0, warning: 0, error: 0, skipped: 0 },
      fatalErrors: [parsed.error],
    };
  }

  const { byKey } = buildHeaderMap(parsed.headers, columns);
  const fatalErrors: string[] = [];
  for (const col of columns) {
    if (col.required && !byKey[col.key]) {
      fatalErrors.push(`Zorunlu sütun eksik: "${col.header}"`);
    }
  }
  if (fatalErrors.length > 0) {
    return {
      entity,
      columns,
      rows: [],
      summary: { total: parsed.rows.length, ready: 0, warning: 0, error: 0, skipped: 0 },
      fatalErrors,
    };
  }

  let rows: ValidatedRow[];
  if (entity === "students") rows = await validateStudentImportRows(parsed.rows, parsed.headers);
  else if (entity === "parents") rows = await validateParentImportRows(parsed.rows, parsed.headers);
  else rows = await validateTeacherImportRows(parsed.rows, parsed.headers);

  const summary: DryRunSummary = {
    total: rows.length,
    ready: rows.filter((r) => r.status === "READY").length,
    warning: rows.filter((r) => r.status === "WARNING").length,
    error: rows.filter((r) => r.status === "ERROR").length,
    skipped: rows.filter((r) => r.status === "SKIPPED_DUPLICATE").length,
  };

  return { entity, columns, rows, summary, fatalErrors: [] };
}

// ─── Commit ──────────────────────────────────────────────────────────────────

function shouldCommit(row: ValidatedRow, opts: CommitOptions): boolean {
  if (row.status === "ERROR") return false;
  if (row.status === "SKIPPED_DUPLICATE") return false;
  if (row.status === "WARNING") return opts.allowWarnings;
  return true;
}

async function createUserForImportedEntity(args: {
  entityKind: "student" | "parent" | "teacher";
  email: string;
  fullName: string;
  mode: ImportAccountMode;
  studentId?: string;
  parentId?: string;
  teacherId?: string;
}): Promise<{ userId: string | null; inviteUrl?: string }> {
  if (args.mode === "none") return { userId: null };

  const role: UserRole =
    args.entityKind === "student" ? "STUDENT"
    : args.entityKind === "parent" ? "PARENT"
    : "TEACHER";

  if (args.mode === "invite") {
    const token = generateUserInviteToken();
    const expiresAt = defaultUserInviteExpiresAt();
    const user = await prisma.user.create({
      data: {
        email: args.email,
        name: args.fullName,
        role,
        userInviteToken: token,
        userInviteTokenExpiresAt: expiresAt,
        userInviteSentAt: new Date(),
        mustChangePassword: false,
      },
      select: { id: true },
    });
    if (args.studentId) await prisma.student.update({ where: { id: args.studentId }, data: { userId: user.id } });
    if (args.parentId) await prisma.parent.update({ where: { id: args.parentId }, data: { userId: user.id } });
    if (args.teacherId) await prisma.teacher.update({ where: { id: args.teacherId }, data: { userId: user.id } });
    return { userId: user.id, inviteUrl: `/davet/${token}` };
  }

  // disabled
  const user = await prisma.user.create({
    data: {
      email: args.email,
      name: args.fullName,
      role,
      accountDisabledAt: new Date(),
      mustChangePassword: false,
    },
    select: { id: true },
  });
  if (args.studentId) await prisma.student.update({ where: { id: args.studentId }, data: { userId: user.id } });
  if (args.parentId) await prisma.parent.update({ where: { id: args.parentId }, data: { userId: user.id } });
  if (args.teacherId) await prisma.teacher.update({ where: { id: args.teacherId }, data: { userId: user.id } });
  return { userId: user.id };
}

export async function commitImport(
  entity: ImportEntity,
  csv: string,
  opts: CommitOptions,
): Promise<CommitResult> {
  // Re-run validation server-side: never trust client classification.
  const dry = await dryRunImport(entity, csv);
  if (dry.fatalErrors.length > 0) {
    return {
      entity,
      rows: [],
      summary: { attempted: 0, created: 0, skipped: 0, failed: 0 },
    };
  }

  const out: CommittedRow[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;

  for (const row of dry.rows) {
    if (!shouldCommit(row, opts)) {
      skipped += 1;
      continue;
    }
    attempted += 1;
    try {
      if (entity === "students") {
        const r = await commitStudentRow(row);
        out.push(r);
      } else if (entity === "parents") {
        const r = await commitParentRow(row);
        out.push(r);
      } else {
        const r = await commitTeacherRow(row);
        out.push(r);
      }
      const last = out[out.length - 1];
      if (last?.ok) created += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      out.push({
        rowNumber: row.rowNumber,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    entity,
    rows: out,
    summary: { attempted, created, skipped, failed },
  };
}

async function commitStudentRow(row: ValidatedRow): Promise<CommittedRow> {
  const fullName = (row.normalized.fullName ?? "").trim();
  const phoneRaw = row.normalized.phone ?? null;
  const phoneKey = row.normalized.phoneKey ?? null;
  const email = row.normalized.email ?? null;
  const classroomId = row.normalized.classroomId ?? null;
  const mode = (row.normalized.accountMode ?? "none") as ImportAccountMode;

  if (!fullName) return { rowNumber: row.rowNumber, ok: false, error: "Ad Soyad eksik" };
  if (!phoneRaw || !phoneKey) {
    return { rowNumber: row.rowNumber, ok: false, error: "Telefon eksik" };
  }

  // Last-mile duplicate guard against unique constraints
  {
    const dup = await prisma.student.findUnique({ where: { phoneKey }, select: { id: true } });
    if (dup) return { rowNumber: row.rowNumber, ok: false, error: "Aynı telefonla öğrenci zaten var" };
  }
  if (email) {
    const dup = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (dup && (mode === "invite" || mode === "disabled")) {
      return { rowNumber: row.rowNumber, ok: false, error: "Aynı emaille User zaten var" };
    }
  }

  const student = await prisma.student.create({
    data: {
      fullName,
      phone: phoneRaw,
      phoneKey,
      email,
      city: row.raw["Şehir"] || null,
      district: row.raw["İlçe"] || null,
      schoolName: row.raw["Okul"] || null,
      examType: row.raw["Sınav"] || null,
      targetGoal: row.raw["Hedef"] || null,
      notes: row.raw["Notlar"] || null,
      status: "NEW",
    },
    select: { id: true },
  });

  let userId: string | null = null;
  let inviteUrl: string | undefined;
  if (mode !== "none" && email) {
    const acc = await createUserForImportedEntity({
      entityKind: "student",
      email,
      fullName,
      mode,
      studentId: student.id,
    });
    userId = acc.userId;
    inviteUrl = acc.inviteUrl;
  }

  if (classroomId) {
    await prisma.classroomStudent.create({
      data: { classroomId, studentId: student.id },
    }).catch(() => { /* idempotent — ignore conflicts */ });
  }

  return {
    rowNumber: row.rowNumber,
    ok: true,
    entityId: student.id,
    userId: userId ?? undefined,
    inviteUrl,
  };
}

async function commitParentRow(row: ValidatedRow): Promise<CommittedRow> {
  const fullName = (row.normalized.fullName ?? "").trim();
  const phoneRaw = row.normalized.phone ?? null;
  const phoneKey = row.normalized.phoneKey ?? null;
  const email = row.normalized.email ?? null;
  const childStudentId = (row.normalized.childStudentId ?? null) as string | null;
  const relationshipType = (row.normalized.relationshipType ?? null) as ParentRelationship | null;
  const mode = (row.normalized.accountMode ?? "none") as ImportAccountMode;

  if (!fullName) return { rowNumber: row.rowNumber, ok: false, error: "Ad Soyad eksik" };
  if (phoneKey) {
    const dup = await prisma.parent.findUnique({ where: { phoneKey }, select: { id: true } });
    if (dup) return { rowNumber: row.rowNumber, ok: false, error: "Aynı telefonla veli zaten var" };
  }
  if (email) {
    const dupParent = await prisma.parent.findUnique({ where: { email }, select: { id: true } });
    if (dupParent) return { rowNumber: row.rowNumber, ok: false, error: "Aynı emaille veli zaten var" };
    if (mode === "invite" || mode === "disabled") {
      const dupUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (dupUser) return { rowNumber: row.rowNumber, ok: false, error: "Aynı emaille User zaten var" };
    }
  }

  const parent = await prisma.parent.create({
    data: {
      fullName,
      phone: phoneRaw,
      phoneKey,
      email,
      notes: row.raw["Notlar"] || null,
    },
    select: { id: true },
  });

  let userId: string | null = null;
  let inviteUrl: string | undefined;
  if (mode !== "none" && email) {
    const acc = await createUserForImportedEntity({
      entityKind: "parent",
      email,
      fullName,
      mode,
      parentId: parent.id,
    });
    userId = acc.userId;
    inviteUrl = acc.inviteUrl;
  }

  if (childStudentId) {
    await prisma.parentStudent.create({
      data: {
        parentId: parent.id,
        studentId: childStudentId,
        relationshipType,
        relationship: null,
      },
    }).catch(() => { /* idempotent */ });
  }

  return {
    rowNumber: row.rowNumber,
    ok: true,
    entityId: parent.id,
    userId: userId ?? undefined,
    inviteUrl,
  };
}

async function commitTeacherRow(row: ValidatedRow): Promise<CommittedRow> {
  const fullName = (row.normalized.fullName ?? "").trim();
  const email = row.normalized.email ?? null;
  const phoneRaw = row.normalized.phone ?? null;
  const subjects = row.normalized.subjects ?? null;
  const bio = row.normalized.bio ?? null;
  const mode = (row.normalized.accountMode ?? "none") as ImportAccountMode;

  if (!fullName || !email || !subjects) {
    return { rowNumber: row.rowNumber, ok: false, error: "Eksik alan" };
  }
  const dupT = await prisma.teacher.findUnique({ where: { email }, select: { id: true } });
  if (dupT) return { rowNumber: row.rowNumber, ok: false, error: "Aynı emaille öğretmen zaten var" };
  if (mode === "invite" || mode === "disabled") {
    const dupU = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (dupU) return { rowNumber: row.rowNumber, ok: false, error: "Aynı emaille User zaten var" };
  }

  const teacher = await prisma.teacher.create({
    data: {
      fullName,
      email,
      phone: phoneRaw,
      subjects,
      bio,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  let userId: string | null = null;
  let inviteUrl: string | undefined;
  if (mode !== "none" && email) {
    const acc = await createUserForImportedEntity({
      entityKind: "teacher",
      email,
      fullName,
      mode,
      teacherId: teacher.id,
    });
    userId = acc.userId;
    inviteUrl = acc.inviteUrl;
  }

  return {
    rowNumber: row.rowNumber,
    ok: true,
    entityId: teacher.id,
    userId: userId ?? undefined,
    inviteUrl,
  };
}
