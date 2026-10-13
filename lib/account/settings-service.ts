import "server-only";

import type { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadAccountStatus } from "@/lib/account/account-status";
import {
  CLASS_LEVEL_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_TIME_OPTIONS,
  EXAM_TYPE_OPTIONS,
  FIELD_TRACK_OPTIONS,
  KVKK_TEXT_VERSION,
  RELATIONSHIP_OPTIONS,
  SCHOOL_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
  examNeedsFieldTrack,
} from "@/lib/account/dictionaries";
import { SETTINGS_COMMAND_SECTION, type SettingsCommand } from "@/lib/account/settings-commands";
import { SETTINGS_SECTION_LABEL, settingsSectionsFor } from "@/lib/account/settings-sections";
import { productLabel } from "@/lib/auth/roles";
import { notifyActiveAdmins } from "@/lib/leads/create-lead";
import { CommandError, runWithReceipt, type CommandExecution } from "@/lib/panel/command-receipt";
import { operationDigest } from "@/lib/panel/group-mutation-core";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

/**
 * HESAP AYARLARI SERVİSİ (P5.2) — web Server Action'ları ve
 * `/api/panel/me/settings` AYNI kuralı kullanır.
 *
 *  - Aktör yalnız kendi kaydını yazar; rolün görmediği bölüm 403.
 *  - Kayıt + audit makbuzu tek Serializable transaction
 *    (`account-settings:<aktör>:<anahtar>`); aynı anahtar ilk sonucu döndürür.
 *  - `expectedRevision` verilirse düzenlenebilir alanların özeti transaction
 *    içinde yeniden hesaplanır; farklıysa 409 `STALE_REVISION`.
 *  - Yönetici bildirimi (çocuk ekleme) commit sonrası, tekrarda çalışmaz.
 */
export type SettingsActor = { userId: string; role: UserRole; fullName: string | null; email: string };
export type SettingsResult = { ok: true; message: string; id?: string };

type Db = PrismaClient | Prisma.TransactionClient;

const options = <T extends readonly { value: string; label: string }[]>(list: T) => list.map(({ value, label }) => ({ value, label }));

async function settingsSnapshot(db: Db, userId: string) {
  const [user, pending] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
        phone: true,
        kvkkAcceptedAt: true,
        kvkkVersion: true,
        marketingConsentAt: true,
        signupProfile: {
          select: {
            city: true,
            district: true,
            relationship: true,
            preferredChannel: true,
            preferredContactTime: true,
            note: true,
            billingAddress: true,
            guardianName: true,
            guardianPhone: true,
            guardianEmail: true,
          },
        },
        studentProfile: {
          select: { classLevel: true, examType: true, fieldTrack: true, schoolName: true, schoolType: true, targetRank: true, weeklyStudyHours: true, weakSubjects: true, birthDate: true },
        },
      },
    }),
    db.pendingChild.findMany({
      where: { parentUserId: userId, status: "PENDING" },
      select: {
        id: true,
        fullName: true,
        classLevel: true,
        examType: true,
        _count: { select: { odOrders: { where: { status: "PAID" } }, odkOrders: { where: { status: "PAID" } } } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  return { user, pending };
}

/** Düzenlenebilir ayar alanlarının özeti (mobil `expectedRevision`). */
export function settingsRevision(snapshot: Awaited<ReturnType<typeof settingsSnapshot>>) {
  return operationDigest(snapshot);
}

export async function loadAccountSettings(actor: SettingsActor) {
  const flags = getPanelFeatureFlags();
  const isLearner = actor.role === "STUDENT" || actor.role === "PARENT";
  const now = new Date();
  const [snapshot, status, linked, memberships, accessibility, network] = await Promise.all([
    settingsSnapshot(prisma, actor.userId),
    loadAccountStatus(actor.userId, actor.role),
    actor.role === "PARENT"
      ? prisma.parentStudent.findMany({
          where: { parentId: actor.userId, active: true, endedAt: null },
          select: { student: { select: { classLevel: true, examType: true, user: { select: { fullName: true, email: true } } } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    isLearner
      ? prisma.productMembership.findMany({
          where: { userId: actor.userId, revokedAt: null, product: { in: ["OD", "OK", "ODK"] } },
          select: { product: true, expiresAt: true },
          orderBy: { product: "asc" },
        })
      : Promise.resolve([]),
    flags.accessibilityProfile ? prisma.accessibilityPreference.findUnique({ where: { userId: actor.userId } }) : Promise.resolve(null),
    flags.offlineMode ? prisma.networkPreference.findUnique({ where: { userId: actor.userId } }) : Promise.resolve(null),
  ]);
  const { user, pending } = snapshot;
  const profile = user.signupProfile;
  const student = user.studentProfile;
  const sections = settingsSectionsFor(actor.role);
  return {
    contractVersion: 1 as const,
    revision: settingsRevision(snapshot),
    role: actor.role,
    sections: sections.map((key) => ({ key, label: SETTINGS_SECTION_LABEL[key] })),
    completion: status
      ? {
          percent: status.completion.percent,
          complete: status.completion.complete,
          contactFormSubmitted: status.contactFormSubmitted,
          contactFormApplicable: status.registrationSource === "SELF_SIGNUP",
          requirements: status.completion.requirements.map((item) => ({ key: item.key, label: item.label, done: item.done, section: item.href.split("/").pop() ?? "profil" })),
        }
      : null,
    memberships: memberships
      .filter((item) => item.product && (!item.expiresAt || item.expiresAt > now))
      .map((item) => ({ product: item.product!, label: productLabel(item.product!), expiresAt: item.expiresAt?.toISOString() ?? null })),
    profile: {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      birthDate: actor.role === "STUDENT" && student?.birthDate ? student.birthDate.toISOString().slice(0, 10) : null,
      relationship: actor.role === "PARENT" ? profile?.relationship ?? null : null,
      city: isLearner ? profile?.city ?? null : null,
      district: isLearner ? profile?.district ?? null : null,
    },
    education:
      actor.role === "STUDENT"
        ? {
            classLevel: student?.classLevel ?? null,
            examType: student?.examType ?? null,
            fieldTrack: student?.fieldTrack ?? null,
            schoolName: student?.schoolName ?? null,
            schoolType: student?.schoolType ?? null,
            targetRank: student?.targetRank ?? null,
            weeklyStudyHours: student?.weeklyStudyHours ?? null,
            weakSubjects: student?.weakSubjects ?? [],
            guardianName: profile?.guardianName ?? null,
            guardianPhone: profile?.guardianPhone ?? null,
            guardianEmail: profile?.guardianEmail ?? null,
          }
        : null,
    contact: sections.includes("iletisim")
      ? { preferredChannel: profile?.preferredChannel ?? "PHONE", preferredContactTime: profile?.preferredContactTime ?? "ANY", note: profile?.note ?? null }
      : null,
    billing: sections.includes("fatura") ? { billingAddress: profile?.billingAddress ?? null } : null,
    consents: sections.includes("onaylar")
      ? { kvkkAcceptedAt: user.kvkkAcceptedAt?.toISOString() ?? null, kvkkVersion: user.kvkkVersion, marketingConsent: Boolean(user.marketingConsentAt) }
      : null,
    children:
      actor.role === "PARENT"
        ? {
            linked: linked.map((link) => ({ name: link.student.user.fullName || link.student.user.email, classLevel: link.student.classLevel, examType: link.student.examType })),
            pending: pending.map((child) => ({ id: child.id, fullName: child.fullName, classLevel: child.classLevel, examType: child.examType, paid: child._count.odOrders + child._count.odkOrders > 0 })),
          }
        : null,
    options: {
      classLevels: options(CLASS_LEVEL_OPTIONS),
      examTypes: options(EXAM_TYPE_OPTIONS),
      fieldTracks: options(FIELD_TRACK_OPTIONS),
      schoolTypes: options(SCHOOL_TYPE_OPTIONS),
      subjects: options(SUBJECT_OPTIONS),
      relationships: options(RELATIONSHIP_OPTIONS),
      contactChannels: options(CONTACT_CHANNEL_OPTIONS),
      contactTimes: options(CONTACT_TIME_OPTIONS),
      fieldTrackExams: EXAM_TYPE_OPTIONS.map((option) => option.value).filter((value) => examNeedsFieldTrack(value)),
    },
    preferences: {
      accessibility: flags.accessibilityProfile
        ? {
            version: accessibility?.version ?? 0,
            reducedMotion: accessibility?.reducedMotion ?? false,
            highContrast: accessibility?.highContrast ?? false,
            textScale: accessibility?.textScale ?? ("DEFAULT" as const),
            comfortableSpacing: accessibility?.comfortableSpacing ?? false,
            captionsPreferred: accessibility?.captionsPreferred ?? false,
            transcriptPreferred: accessibility?.transcriptPreferred ?? false,
          }
        : null,
      network: flags.offlineMode
        ? { version: network?.version ?? 0, lowDataMode: network?.lowDataMode ?? false, offlineWritesEnabled: network?.offlineWritesEnabled ?? false }
        : null,
    },
  };
}

export type AccountSettingsView = Awaited<ReturnType<typeof loadAccountSettings>>;

function signupProfileUpsert(db: Db, userId: string, data: Prisma.SignupProfileUncheckedUpdateInput) {
  return db.signupProfile.upsert({ where: { userId }, update: data, create: { ...(data as Prisma.SignupProfileUncheckedCreateInput), userId } });
}

function done(entityType: string, entityId: string, action: string, summary: string, message: string, extra: Partial<CommandExecution<SettingsResult>> = {}): CommandExecution<SettingsResult> {
  return { entityType, entityId, action, summary, result: { ok: true, message }, ...extra };
}

async function execute(tx: Prisma.TransactionClient, actor: SettingsActor, command: SettingsCommand): Promise<CommandExecution<SettingsResult>> {
  const userId = actor.userId;
  switch (command.type) {
    case "profile": {
      await tx.user.update({ where: { id: userId }, data: { fullName: command.fullName, phone: command.phone } });
      if (actor.role === "STUDENT" || actor.role === "PARENT") {
        const profile = { city: command.city ?? null, district: command.district ?? null, ...(actor.role === "PARENT" ? { relationship: command.relationship ?? null } : {}) };
        await tx.signupProfile.upsert({ where: { userId }, update: profile, create: { ...profile, userId } });
      }
      if (actor.role === "STUDENT") {
        const birthDate = command.birthDate ? new Date(`${command.birthDate}T00:00:00Z`) : null;
        await tx.studentProfile.upsert({ where: { userId }, update: { birthDate }, create: { userId, birthDate } });
      }
      return done("User", userId, "account.settings.profile", "Profil bilgileri güncellendi", "Profil bilgilerin kaydedildi.");
    }
    case "education": {
      const education = {
        classLevel: command.classLevel,
        examType: command.examType,
        fieldTrack: examNeedsFieldTrack(command.examType) ? command.fieldTrack ?? null : null,
        schoolName: command.schoolName ?? null,
        schoolType: command.schoolType ?? null,
        targetRank: command.targetRank ?? null,
        weeklyStudyHours: command.weeklyStudyHours ?? null,
        weakSubjects: command.weakSubjects,
      };
      await tx.studentProfile.upsert({ where: { userId }, update: education, create: { ...education, userId } });
      await signupProfileUpsert(tx, userId, { guardianName: command.guardianName ?? null, guardianPhone: command.guardianPhone ?? null, guardianEmail: command.guardianEmail ?? null });
      return done("StudentProfile", userId, "account.settings.education", "Eğitim bilgileri güncellendi", "Eğitim bilgilerin kaydedildi.");
    }
    case "contact":
      await signupProfileUpsert(tx, userId, { preferredChannel: command.preferredChannel, preferredContactTime: command.preferredContactTime, note: command.note ?? null });
      return done("SignupProfile", userId, "account.settings.contact", "İletişim tercihleri güncellendi", "İletişim tercihlerin kaydedildi.");
    case "billing":
      await signupProfileUpsert(tx, userId, { billingAddress: command.billingAddress ?? null });
      return done("SignupProfile", userId, "account.settings.billing", "Fatura adresi güncellendi", "Fatura bilgilerin kaydedildi.");
    case "consents": {
      const current = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { kvkkAcceptedAt: true, marketingConsentAt: true } });
      const now = new Date();
      const data: Prisma.UserUpdateInput = {};
      // KVKK onayı tek yönlüdür: geri çekme talebi hesap silme/veri talebi
      // sürecidir ve buradan yapılmaz (bkz. /kvkk başvuru kanalı).
      if (command.kvkkConsent && !current.kvkkAcceptedAt) Object.assign(data, { kvkkAcceptedAt: now, kvkkVersion: KVKK_TEXT_VERSION, termsAcceptedAt: now });
      if (command.marketingConsent && !current.marketingConsentAt) data.marketingConsentAt = now;
      if (!command.marketingConsent && current.marketingConsentAt) data.marketingConsentAt = null;
      if (Object.keys(data).length) await tx.user.update({ where: { id: userId }, data });
      return done("User", userId, "account.settings.consents", "Onay tercihleri güncellendi", "Onay tercihlerin kaydedildi.", {
        payload: { marketingConsent: command.marketingConsent, kvkkAccepted: Boolean(current.kvkkAcceptedAt || command.kvkkConsent), changed: Object.keys(data).length > 0 },
      });
    }
    case "addChild": {
      const pendingCount = await tx.pendingChild.count({ where: { parentUserId: userId, status: "PENDING" } });
      if (pendingCount >= 5) throw new CommandError(409, "PENDING_CHILD_LIMIT", "Aynı anda en fazla 5 bekleyen çocuk kaydı açılabilir. Ekibimiz sizi arayacak.");
      const relationship = await tx.signupProfile.findUnique({ where: { userId }, select: { relationship: true } });
      const created = await tx.pendingChild.create({
        data: {
          parentUserId: userId,
          fullName: command.fullName,
          classLevel: command.classLevel,
          schoolName: command.schoolName,
          examType: command.examType,
          fieldTrack: examNeedsFieldTrack(command.examType) ? command.fieldTrack ?? null : null,
          birthYear: command.birthYear ?? null,
          email: command.email,
          phone: command.phone,
          relationship: relationship?.relationship ?? null,
        },
        select: { id: true },
      });
      return {
        ...done("PendingChild", created.id, "account.settings.add_child", "Veli yeni çocuk bilgisi ekledi", `${command.fullName} eklendi. Öğrenci hesabını ekibimiz açıp hesabınıza bağlayacak.`),
        result: { ok: true, message: `${command.fullName} eklendi. Öğrenci hesabını ekibimiz açıp hesabınıza bağlayacak.`, id: created.id },
        after: async () => {
          await notifyActiveAdmins({ title: "Veli yeni çocuk ekledi", body: `${actor.fullName || actor.email} · ${command.fullName}`, href: "/panel/yonetim/basvurular?sekme=cocuklar" }).catch(() => undefined);
        },
      };
    }
    case "cancelChild": {
      // Ödemesi alınmış çocuk kaydı veliden iptal edilemez: yönetim hesabı
      // açmakla yükümlü, kaydın kaybolması siparişi sahipsiz bırakırdı.
      const result = await tx.pendingChild.updateMany({
        where: { id: command.childId, parentUserId: userId, status: "PENDING", odOrders: { none: { status: "PAID" } }, odkOrders: { none: { status: "PAID" } } },
        data: { status: "CANCELLED", resolvedAt: new Date() },
      });
      if (result.count === 0) throw new CommandError(409, "CHILD_NOT_CANCELLABLE", "Bu kayıt kaldırılamaz. Ödemesi alınmış bir kayıt için bizimle iletişime geçin.");
      return done("PendingChild", command.childId, "account.settings.cancel_child", "Veli bekleyen çocuk kaydını kaldırdı", "Kayıt kaldırıldı.");
    }
  }
}

const ROLE_ONLY: Partial<Record<SettingsCommand["type"], string>> = {
  education: "Bu bölüm yalnız öğrenci hesapları içindir.",
  addChild: "Bu bölüm yalnız veli hesapları içindir.",
  cancelChild: "Bu bölüm yalnız veli hesapları içindir.",
};

export async function runSettingsCommand(actor: SettingsActor, command: SettingsCommand, control: { idempotencyKey?: string; expectedRevision?: string } = {}) {
  if (!settingsSectionsFor(actor.role).includes(SETTINGS_COMMAND_SECTION[command.type])) {
    throw new CommandError(403, "SECTION_FORBIDDEN", ROLE_ONLY[command.type] ?? "Bu ayar bölümü hesabınız için açık değil.");
  }
  return runWithReceipt<SettingsResult>({
    actorUserId: actor.userId,
    namespace: "account-settings",
    idempotencyKey: control.idempotencyKey,
    digestOf: { command, expectedRevision: control.expectedRevision ?? null },
    transactional: async (tx) => {
      if (control.expectedRevision && settingsRevision(await settingsSnapshot(tx, actor.userId)) !== control.expectedRevision) {
        throw new CommandError(409, "STALE_REVISION", "Ayarların başka bir oturumda değişti. Güncel bilgileri kontrol edip yeniden kaydedin.");
      }
      return execute(tx, actor, command);
    },
  });
}
