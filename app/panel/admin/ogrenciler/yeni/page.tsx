/**
 * Phase 3 / Session 1 — Student creation wizard (sectioned single-page form).
 */
import Link from "next/link";
import { requirePanelRole } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { ToastForm } from "@/components/ui/toast-form";
import { createStudentAction } from "../_actions";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "kimlik", title: "1. Kimlik" },
  { id: "egitim", title: "2. Eğitim ve hedef" },
  { id: "hesap",  title: "3. Hesap erişimi" },
  { id: "veli",   title: "4. Veli bağlantısı" },
  { id: "sinif",  title: "5. Sınıf ataması" },
  { id: "paket",  title: "6. Paket / kayıt" },
  { id: "etiket", title: "7. Etiketler & not" },
] as const;

export default async function NewStudent() {
  await requirePanelRole("admin");
  const [classrooms, parents, packages, tags] = await Promise.all([
    prisma.classroom.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, branch: true },
    }),
    prisma.parent.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, phone: true },
      take: 500,
    }),
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, price: true },
    }),
    prisma.tag.findMany({
      orderBy: { label: "asc" },
      select: { id: true, label: true },
      take: 200,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Yeni öğrenci"
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğrenciler", href: "/panel/admin/ogrenciler" },
          { label: "Yeni" },
        ]}
        subtitle="Onboarding tamamlandığında: hesap, veli, sınıf, paket ve etiketler tek seferde kurulur."
      />

      <div className="od-wizard-shell">
        <aside className="od-wizard-rail">
          <div className="od-wizard-rail-title">Bölümler</div>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Link href={"#" + s.id}>{s.title}</Link>
              </li>
            ))}
          </ul>
        </aside>

        <ToastForm action={createStudentAction} className="od-wizard-main">
          <Card><CardBody>
            <h3 id="kimlik" style={{ marginTop: 0 }}>1. Kimlik</h3>
            <p style={{ marginTop: 0, color: "var(--od-muted)", fontSize: 13 }}>
              Telefon zorunlu. Aynı telefon başka bir öğrenci/veli kaydında varsa kaydetme engellenir.
            </p>
            <div className="od-grid g-2" style={{ gap: 12 }}>
              <Field label="Ad Soyad *"><Input name="fullName" required autoComplete="off" /></Field>
              <Field label="Telefon *"><Input name="phone" required placeholder="+90 5xx xxx xx xx" /></Field>
              <Field label="Email" hint="Hesap oluşturulacaksa zorunludur."><Input name="email" type="email" autoComplete="off" /></Field>
              <Field label="Şehir"><Input name="city" /></Field>
              <Field label="İlçe"><Input name="district" /></Field>
              <Field label="Okul"><Input name="schoolName" /></Field>
            </div>
          </CardBody></Card>

          <Card><CardBody>
            <h3 id="egitim" style={{ marginTop: 0 }}>2. Eğitim ve hedef</h3>
            <div className="od-grid g-2" style={{ gap: 12 }}>
              <Field label="Sınıf"><Input name="classLevel" placeholder="11" /></Field>
              <Field label="Sınav türü">
                <Select name="examType" defaultValue="">
                  <option value="">— Seçilmedi —</option>
                  <option value="TYT">TYT</option>
                  <option value="AYT">AYT</option>
                  <option value="LGS">LGS</option>
                  <option value="YKS">YKS</option>
                </Select>
              </Field>
              <Field label="Bölüm">
                <Select name="department" defaultValue="">
                  <option value="">— Seçilmedi —</option>
                  <option value="SAY">Sayısal</option>
                  <option value="EA">Eşit Ağırlık</option>
                  <option value="SOZ">Sözel</option>
                  <option value="DIL">Dil</option>
                </Select>
              </Field>
              <Field label="Mevcut seviye"><Input name="currentLevel" placeholder="Net / sıralama" /></Field>
              <Field label="Hedef"><Input name="targetGoal" placeholder="Tıp / Mühendislik" /></Field>
              <Field label="Hedef okul"><Input name="targetSchool" placeholder="Boğaziçi" /></Field>
              <Field label="Hedef sıralama"><Input name="targetRanking" placeholder="20.000" /></Field>
              <Field label="Durum">
                <Select name="status" defaultValue="NEW">
                  <option value="NEW">Yeni</option>
                  <option value="FOLLOW_UP">Takipte</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="AT_RISK">Risk</option>
                  <option value="COMPLETED">Tamamlandı</option>
                  <option value="INACTIVE">Pasif</option>
                </Select>
              </Field>
            </div>
          </CardBody></Card>

          <Card><CardBody>
            <h3 id="hesap" style={{ marginTop: 0 }}>3. Hesap erişimi</h3>
            <p style={{ marginTop: 0, color: "var(--od-muted)", fontSize: 13 }}>
              Öğrencinin panele girebilmesi için kullanıcı hesabı gerekir. Davet
              modunda link üretilir; geçici şifre modunda ilk girişte şifre değişimi zorunlu olur.
            </p>
            <Field label="Hesap modu">
              <Select name="accountMode" defaultValue="invite">
                <option value="none">Hesap oluşturma (yalnızca CRM kaydı)</option>
                <option value="invite">Davet linki üret (önerilen)</option>
                <option value="tempPassword">Geçici şifre oluştur</option>
              </Select>
            </Field>
          </CardBody></Card>

          <Card><CardBody>
            <h3 id="veli" style={{ marginTop: 0 }}>4. Veli bağlantısı</h3>
            <p style={{ marginTop: 0, color: "var(--od-muted)", fontSize: 13 }}>
              Mevcut veli listesinden seçim yapın. Yeni veli oluşturmak için önce
              öğrenciyi kaydedin, ardından detay sayfasından &quot;+ Veli ekle&quot; butonunu kullanın.
            </p>
            <div className="od-grid g-2" style={{ gap: 12 }}>
              <Field label="Veli kaydı (opsiyonel)">
                <Select name="parentId" defaultValue="">
                  <option value="">— Şimdilik bağlama —</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}{p.phone ? " · " + p.phone : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Yakınlık">
                <Select name="relationshipType" defaultValue="">
                  <option value="">— Seçilmedi —</option>
                  <option value="MOTHER">Anne</option>
                  <option value="FATHER">Baba</option>
                  <option value="GUARDIAN">Vasi</option>
                  <option value="SIBLING">Kardeş</option>
                  <option value="OTHER">Diğer</option>
                </Select>
              </Field>
              <Field label="Serbest yakınlık (ops.)"><Input name="relationship" placeholder="Dede / Hala" /></Field>
              <Field label="Birincil veli">
                <label style={{ fontSize: 13 }}>
                  <input type="checkbox" name="parentIsPrimary" /> Birincil iletişim
                </label>
              </Field>
            </div>
          </CardBody></Card>

          <Card><CardBody>
            <h3 id="sinif" style={{ marginTop: 0 }}>5. Sınıf ataması</h3>
            <Field label="Sınıf (opsiyonel)">
              <Select name="classroomId" defaultValue="">
                <option value="">— Şimdilik atama —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.branch ? " · " + c.branch : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody></Card>

          <Card><CardBody>
            <h3 id="paket" style={{ marginTop: 0 }}>6. Paket / kayıt</h3>
            <Field label="Paket (opsiyonel)" hint="Aktif paketler listelenir.">
              <Select name="packageId" defaultValue="">
                <option value="">— Atanmadı —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.type} · ₺{p.price.toLocaleString("tr-TR")}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody></Card>

          <Card><CardBody>
            <h3 id="etiket" style={{ marginTop: 0 }}>7. Etiketler & not</h3>
            <div className="od-grid g-2" style={{ gap: 12 }}>
              <Field label="Etiket (opsiyonel)">
                <Select name="tagId" defaultValue="">
                  <option value="">— Atanmadı —</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Kaynak (lead source)"><Input name="source" placeholder="Instagram / WhatsApp / Referans" /></Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="İç not (admin gözüne özel)">
                <Textarea name="notes" rows={3} placeholder="İlk görüşmede konuşulanlar, hassas bilgiler…" />
              </Field>
            </div>
          </CardBody></Card>

          <Card><CardBody>
            <FormActions>
              <Link href="/panel/admin/ogrenciler" className="od-btn od-btn-ghost">İptal</Link>
              <button className="od-btn od-btn-primary" type="submit">Öğrenciyi kaydet</button>
            </FormActions>
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--od-muted)" }}>
              Bütün adımlar tek bir işlem olarak kaydedilir; bir adım hata verirse hiçbir şey yazılmaz.
            </p>
          </CardBody></Card>
        </ToastForm>
      </div>
    </>
  );
}
