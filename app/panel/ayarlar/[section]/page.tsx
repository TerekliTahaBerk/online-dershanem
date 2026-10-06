import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/guards";
import { CONTACT_FORM_PATH } from "@/lib/auth/roles";
import { loadAccountStatus } from "@/lib/account/account-status";
import {
  CLASS_LEVEL_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_TIME_OPTIONS,
  EXAM_TYPE_OPTIONS,
  FIELD_TRACK_OPTIONS,
  RELATIONSHIP_OPTIONS,
  SCHOOL_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
  optionLabel,
} from "@/lib/account/dictionaries";
import {
  SettingsFrame,
  settingsSectionLabel,
  settingsSectionsFor,
  type SettingsSection,
} from "@/components/account/settings/settings-frame";
import { SettingsField, SettingsForm, settingsInputClass } from "@/components/account/settings/settings-form";
import { PanelCard, PanelCardTitle } from "@/components/panel/ui";
import {
  addPendingChild,
  cancelPendingChild,
  saveBillingSettings,
  saveConsentSettings,
  saveContactSettings,
  saveEducationSettings,
  saveProfileSettings,
} from "../actions";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

function Options({ options, placeholder }: { options: readonly { value: string; label: string }[]; placeholder?: string }) {
  return (
    <>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}

/**
 * HESAP AYARLARI · BÖLÜM.
 *
 * Bölüm listesi role göre `settingsSectionsFor` ile sınırlıdır; rolün
 * görmediği bölüm 404 olur. Kaydetme işleri `../actions.ts` içindeki server
 * action'larla yapılır ve hep oturumdaki kullanıcının kendi kaydını yazar.
 */
export default async function AccountSettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const session = await requireActiveUser();
  const { section: raw } = await params;
  const allowed = settingsSectionsFor(session.role);
  if (!allowed.includes(raw as SettingsSection)) notFound();
  const section = raw as SettingsSection;

  const [status, user] = await Promise.all([
    loadAccountStatus(session.userId, session.role),
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: {
        fullName: true,
        email: true,
        phone: true,
        kvkkAcceptedAt: true,
        kvkkVersion: true,
        marketingConsentAt: true,
        signupProfile: true,
        studentProfile: {
          select: {
            classLevel: true,
            examType: true,
            fieldTrack: true,
            schoolName: true,
            schoolType: true,
            targetRank: true,
            weeklyStudyHours: true,
            weakSubjects: true,
            birthDate: true,
          },
        },
      },
    }),
  ]);
  const profile = user.signupProfile;
  const student = user.studentProfile;

  return (
    <SettingsFrame session={session} status={status} active={section}>
      <PanelCard>
        <PanelCardTitle>{settingsSectionLabel(section)}</PanelCardTitle>
        <div className="mt-4">
          {section === "profil" ? (
            <SettingsForm action={saveProfileSettings}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField id="fullName" label="Ad soyad">
                  <input id="fullName" name="fullName" defaultValue={user.fullName ?? ""} autoComplete="name" className={settingsInputClass} />
                </SettingsField>
                <SettingsField id="email" label="E-posta" hint="E-posta değişikliği için bizimle iletişime geçin.">
                  <input id="email" value={user.email} readOnly className={`${settingsInputClass} bg-dc-surface-muted`} />
                </SettingsField>
                <SettingsField id="phone" label="Cep telefonu">
                  <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="5xx xxx xx xx" autoComplete="tel" className={settingsInputClass} />
                </SettingsField>
                {session.role === "STUDENT" ? (
                  <SettingsField id="birthDate" label="Doğum tarihi">
                    <input
                      id="birthDate"
                      name="birthDate"
                      type="date"
                      defaultValue={student?.birthDate ? student.birthDate.toISOString().slice(0, 10) : ""}
                      className={settingsInputClass}
                    />
                  </SettingsField>
                ) : null}
                {session.role === "PARENT" ? (
                  <SettingsField id="relationship" label="Öğrenciye yakınlığınız">
                    <select id="relationship" name="relationship" defaultValue={profile?.relationship ?? ""} className={settingsInputClass}>
                      <Options options={RELATIONSHIP_OPTIONS} placeholder="Seçin" />
                    </select>
                  </SettingsField>
                ) : null}
                {session.role === "STUDENT" || session.role === "PARENT" ? (
                  <>
                    <SettingsField id="city" label="İl">
                      <input id="city" name="city" defaultValue={profile?.city ?? ""} autoComplete="address-level1" className={settingsInputClass} />
                    </SettingsField>
                    <SettingsField id="district" label="İlçe">
                      <input id="district" name="district" defaultValue={profile?.district ?? ""} autoComplete="address-level2" className={settingsInputClass} />
                    </SettingsField>
                  </>
                ) : null}
              </div>
            </SettingsForm>
          ) : null}

          {section === "egitim" ? (
            <SettingsForm action={saveEducationSettings}>
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsField id="classLevel" label="Sınıf">
                  <select id="classLevel" name="classLevel" defaultValue={student?.classLevel ?? ""} className={settingsInputClass}>
                    <Options options={CLASS_LEVEL_OPTIONS} placeholder="Seçin" />
                  </select>
                </SettingsField>
                <SettingsField id="examType" label="Hedef sınav">
                  <select id="examType" name="examType" defaultValue={student?.examType ?? ""} className={settingsInputClass}>
                    <Options options={EXAM_TYPE_OPTIONS} placeholder="Seçin" />
                  </select>
                </SettingsField>
                <SettingsField id="fieldTrack" label="Alan" hint="Yalnız AYT hedefleyenler için.">
                  <select id="fieldTrack" name="fieldTrack" defaultValue={student?.fieldTrack ?? ""} className={settingsInputClass}>
                    <Options options={FIELD_TRACK_OPTIONS} placeholder="Seçin" />
                  </select>
                </SettingsField>
                <SettingsField id="schoolType" label="Okul türü">
                  <select id="schoolType" name="schoolType" defaultValue={student?.schoolType ?? ""} className={settingsInputClass}>
                    <Options options={SCHOOL_TYPE_OPTIONS} placeholder="Seçin" />
                  </select>
                </SettingsField>
                <SettingsField id="schoolName" label="Okul adı">
                  <input id="schoolName" name="schoolName" defaultValue={student?.schoolName ?? ""} className={settingsInputClass} />
                </SettingsField>
                <SettingsField id="targetRank" label="Hedef sıralama">
                  <input id="targetRank" name="targetRank" type="number" min={1} defaultValue={student?.targetRank ?? ""} className={settingsInputClass} />
                </SettingsField>
                <SettingsField id="weeklyStudyHours" label="Haftalık çalışma (saat)">
                  <input
                    id="weeklyStudyHours"
                    name="weeklyStudyHours"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={student?.weeklyStudyHours ?? ""}
                    className={settingsInputClass}
                  />
                </SettingsField>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-[12.5px] font-semibold text-dc-ink">Zorlandığın dersler</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {SUBJECT_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-[13.5px] text-dc-ink">
                      <input type="checkbox" name="weakSubjects" value={option.value} defaultChecked={student?.weakSubjects.includes(option.value)} className="h-4 w-4" />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="rounded-xl border border-dc-line-soft bg-dc-surface-soft p-4">
                <p className="text-[13.5px] font-bold text-dc-ink">Veli bilgisi</p>
                <p className="mt-1 text-[12.5px] text-dc-ink-muted">Velinin hesabını seninkine bağlayabilmemiz için.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <SettingsField id="guardianName" label="Ad soyad">
                    <input id="guardianName" name="guardianName" defaultValue={profile?.guardianName ?? ""} className={settingsInputClass} />
                  </SettingsField>
                  <SettingsField id="guardianPhone" label="Telefon">
                    <input id="guardianPhone" name="guardianPhone" type="tel" defaultValue={profile?.guardianPhone ?? ""} className={settingsInputClass} />
                  </SettingsField>
                  <SettingsField id="guardianEmail" label="E-posta">
                    <input id="guardianEmail" name="guardianEmail" type="email" defaultValue={profile?.guardianEmail ?? ""} className={settingsInputClass} />
                  </SettingsField>
                </div>
              </div>
            </SettingsForm>
          ) : null}

          {section === "cocuklarim" ? <ChildrenSection parentUserId={session.userId} /> : null}

          {section === "iletisim" ? (
            <>
              <SettingsForm action={saveContactSettings}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsField id="preferredChannel" label="Size nasıl ulaşalım?">
                    <select id="preferredChannel" name="preferredChannel" defaultValue={profile?.preferredChannel ?? "PHONE"} className={settingsInputClass}>
                      <Options options={CONTACT_CHANNEL_OPTIONS} />
                    </select>
                  </SettingsField>
                  <SettingsField id="preferredContactTime" label="Uygun saat">
                    <select id="preferredContactTime" name="preferredContactTime" defaultValue={profile?.preferredContactTime ?? "ANY"} className={settingsInputClass}>
                      <Options options={CONTACT_TIME_OPTIONS} />
                    </select>
                  </SettingsField>
                </div>
                <SettingsField id="note" label="Ekibimize notun" hint="En fazla 500 karakter.">
                  <textarea id="note" name="note" rows={3} maxLength={500} defaultValue={profile?.note ?? ""} className={settingsInputClass} />
                </SettingsField>
              </SettingsForm>
              <p className="mt-5 text-[13px] text-dc-ink-muted">
                İletişim formunu {status?.contactFormSubmitted ? "doldurdun" : "henüz doldurmadın"}.{" "}
                <Link href={`${CONTACT_FORM_PATH}?tekrar=1`} className="font-semibold text-dc-brand-strong underline">
                  {status?.contactFormSubmitted ? "Formu güncelle" : "Formu doldur"}
                </Link>
              </p>
            </>
          ) : null}

          {section === "fatura" ? (
            <SettingsForm action={saveBillingSettings}>
              <SettingsField id="billingAddress" label="Fatura adresi" hint="Ödeme ekranında otomatik doldurulur.">
                <textarea id="billingAddress" name="billingAddress" rows={3} maxLength={500} defaultValue={profile?.billingAddress ?? ""} className={settingsInputClass} />
              </SettingsField>
              <p className="text-[12.5px] leading-[1.6] text-dc-ink-faint">
                T.C. kimlik numaran profilinde saklanmaz; yalnız fatura için ödeme sırasında istenir.
              </p>
            </SettingsForm>
          ) : null}

          {section === "onaylar" ? (
            <SettingsForm action={saveConsentSettings}>
              <label className="flex items-start gap-2.5 text-[13.5px] leading-[1.6] text-dc-ink">
                <input
                  type="checkbox"
                  name="kvkkConsent"
                  defaultChecked={Boolean(user.kvkkAcceptedAt)}
                  disabled={Boolean(user.kvkkAcceptedAt)}
                  className="mt-1 h-4 w-4"
                />
                {user.kvkkAcceptedAt ? <input type="hidden" name="kvkkConsent" value="on" /> : null}
                <span>
                  <Link href="/kvkk" target="_blank" className="font-semibold text-dc-brand-strong underline">
                    KVKK aydınlatma metnini
                  </Link>{" "}
                  okudum ve kabul ediyorum.
                  {user.kvkkAcceptedAt ? (
                    <span className="block text-[12px] text-dc-ink-faint">
                      {DATE.format(user.kvkkAcceptedAt)} tarihinde onaylandı{user.kvkkVersion ? ` (sürüm ${user.kvkkVersion})` : ""}.
                    </span>
                  ) : null}
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-[13.5px] leading-[1.6] text-dc-ink">
                <input type="checkbox" name="marketingConsent" defaultChecked={Boolean(user.marketingConsentAt)} className="mt-1 h-4 w-4" />
                <span>Kampanya ve duyurular için ticari elektronik ileti almak istiyorum.</span>
              </label>
            </SettingsForm>
          ) : null}

          {section === "guvenlik" ? (
            <div className="flex flex-wrap gap-2.5">
              <Link href="/panel/parola" className="rounded-lg bg-dc-brand-strong px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-dc-brand-hover">
                Parolanı değiştir
              </Link>
              <Link href="/panel/oturumlar" className="rounded-lg border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-dc-ink-muted">
                Aktif oturumlar
              </Link>
              <Link href="/panel/bildirimler" className="rounded-lg border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-dc-ink-muted">
                Bildirim tercihleri
              </Link>
              {session.role === "ADMIN" || session.role === "TEACHER" ? (
                <Link href="/panel/guvenlik" className="rounded-lg border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-dc-ink-muted">
                  İki adımlı doğrulama
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </PanelCard>
    </SettingsFrame>
  );
}

/** Veli: bağlı çocuklar + bekleyen çocuk kayıtları + yeni çocuk ekleme. */
async function ChildrenSection({ parentUserId }: { parentUserId: string }) {
  const [linked, pending] = await Promise.all([
    prisma.parentStudent.findMany({
      where: { parentId: parentUserId, active: true, endedAt: null },
      select: { student: { select: { classLevel: true, examType: true, user: { select: { fullName: true, email: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pendingChild.findMany({
      where: { parentUserId, status: "PENDING" },
      select: {
        id: true,
        fullName: true,
        classLevel: true,
        examType: true,
        _count: { select: { odOrders: { where: { status: "PAID" } }, odkOrders: { where: { status: "PAID" } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-dc-ink-ghost">Bağlı öğrenciler</p>
        {linked.length ? (
          <ul className="mt-2 flex flex-col gap-2">
            {linked.map((link, index) => (
              <li key={index} className="rounded-xl border border-dc-line bg-white px-4 py-3 text-[14px] text-dc-ink">
                <span className="font-semibold">{link.student.user.fullName || link.student.user.email}</span>
                <span className="text-dc-ink-muted">
                  {" "}
                  · {optionLabel(CLASS_LEVEL_OPTIONS, link.student.classLevel) ?? "Sınıf yok"} ·{" "}
                  {optionLabel(EXAM_TYPE_OPTIONS, link.student.examType) ?? "Sınav yok"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13.5px] text-dc-ink-muted">Henüz hesabınıza bağlı bir öğrenci yok.</p>
        )}
      </div>

      {pending.length ? (
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-dc-ink-ghost">Hesabı açılmayı bekleyenler</p>
          <ul className="mt-2 flex flex-col gap-2">
            {pending.map((child) => {
              const paid = child._count.odOrders + child._count.odkOrders > 0;
              return (
                <li key={child.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-dc-line bg-white px-4 py-3">
                  <div className="text-[14px] text-dc-ink">
                    <span className="font-semibold">{child.fullName}</span>
                    <span className="text-dc-ink-muted">
                      {" "}
                      · {optionLabel(CLASS_LEVEL_OPTIONS, child.classLevel) ?? "—"} · {optionLabel(EXAM_TYPE_OPTIONS, child.examType) ?? "—"}
                    </span>
                    <p className="text-[12.5px] text-amber-800">
                      {paid ? "Ödeme alındı — ekibimiz öğrenci hesabını açıyor." : "Ekibimiz öğrenci hesabını açıp size bağlayacak."}
                    </p>
                  </div>
                  {!paid ? (
                    <SettingsForm action={cancelPendingChild} submitLabel="Kaldır" variant="danger">
                      <input type="hidden" name="childId" value={child.id} />
                    </SettingsForm>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-dc-line-soft bg-dc-surface-soft p-4">
        <p className="text-[14px] font-bold text-dc-ink">Çocuk ekle</p>
        <div className="mt-3">
          <SettingsForm action={addPendingChild} submitLabel="Çocuğu ekle">
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField id="child-fullName" label="Ad soyad">
                <input id="child-fullName" name="fullName" className={settingsInputClass} />
              </SettingsField>
              <SettingsField id="child-classLevel" label="Sınıf">
                <select id="child-classLevel" name="classLevel" defaultValue="" className={settingsInputClass}>
                  <Options options={CLASS_LEVEL_OPTIONS} placeholder="Seçin" />
                </select>
              </SettingsField>
              <SettingsField id="child-examType" label="Hedef sınav">
                <select id="child-examType" name="examType" defaultValue="" className={settingsInputClass}>
                  <Options options={EXAM_TYPE_OPTIONS} placeholder="Seçin" />
                </select>
              </SettingsField>
              <SettingsField id="child-fieldTrack" label="Alan" hint="Yalnız AYT için.">
                <select id="child-fieldTrack" name="fieldTrack" defaultValue="" className={settingsInputClass}>
                  <Options options={FIELD_TRACK_OPTIONS} placeholder="Seçin" />
                </select>
              </SettingsField>
              <SettingsField id="child-schoolName" label="Okul" hint="İsteğe bağlı">
                <input id="child-schoolName" name="schoolName" className={settingsInputClass} />
              </SettingsField>
              <SettingsField id="child-birthYear" label="Doğum yılı" hint="İsteğe bağlı">
                <input id="child-birthYear" name="birthYear" type="number" className={settingsInputClass} />
              </SettingsField>
              <SettingsField id="child-email" label="Çocuğun e-postası" hint="Varsa; hesabı bu adresle açarız.">
                <input id="child-email" name="email" type="email" className={settingsInputClass} />
              </SettingsField>
              <SettingsField id="child-phone" label="Çocuğun telefonu" hint="İsteğe bağlı">
                <input id="child-phone" name="phone" type="tel" className={settingsInputClass} />
              </SettingsField>
            </div>
          </SettingsForm>
        </div>
      </div>
    </div>
  );
}
