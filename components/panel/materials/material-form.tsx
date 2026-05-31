"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { createMaterialAction } from "@/app/panel/ogretmen/materyaller/_actions";
import type {
  TeacherClassroomOption,
  TeacherCourseOption,
} from "@/lib/panel/materials";

type Props = {
  classrooms: TeacherClassroomOption[];
  courses: TeacherCourseOption[];
};

const TYPES = [
  { value: "LINK", label: "Bağlantı (URL)" },
  { value: "VIDEO", label: "Video (URL)" },
  { value: "PDF", label: "PDF (URL)" },
  { value: "FILE", label: "Dosya (URL)" },
  { value: "NOTE", label: "Not (metin)" },
] as const;

const VIS = [
  { value: "CLASSROOM", label: "Sınıf · Sınıfa bağlı herkes (öğrenci + öğretmen)" },
  { value: "STUDENTS", label: "Öğrenciler · Sadece öğrencilere açık" },
  { value: "TEACHERS", label: "Öğretmenler · Sadece öğretmenlere açık" },
  { value: "PRIVATE", label: "Özel · Sadece ben görürüm" },
] as const;

export function MaterialForm({ classrooms, courses }: Props) {
  const [type, setType] = useState<string>("LINK");
  const [state, formAction, pending] = useActionState(createMaterialAction, { ok: true });

  const isNote = type === "NOTE";

  return (
    <form action={formAction} className="od-stack" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {state.error ? (
        <div className="od-alert od-alert-bad" role="alert">
          {state.error}
        </div>
      ) : null}

      <div className="od-field">
        <label className="od-label" htmlFor="title">Başlık *</label>
        <input
          id="title"
          name="title"
          required
          minLength={2}
          maxLength={160}
          className="od-input"
          placeholder="Örn. Türev — Konu Anlatımı"
        />
        {state.fieldErrors?.title ? <div className="od-error">{state.fieldErrors.title}</div> : null}
      </div>

      <div className="od-row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="od-field" style={{ flex: 1, minWidth: 200 }}>
          <label className="od-label" htmlFor="type">Tür *</label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="od-input"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="od-field" style={{ flex: 1, minWidth: 240 }}>
          <label className="od-label" htmlFor="visibility">Görünürlük</label>
          <select id="visibility" name="visibility" defaultValue="CLASSROOM" className="od-input">
            {VIS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!isNote ? (
        <div className="od-field">
          <label className="od-label" htmlFor="url">URL *</label>
          <input
            id="url"
            name="url"
            type="url"
            inputMode="url"
            placeholder="https://…"
            className="od-input"
            required={!isNote}
          />
          <div className="od-muted" style={{ fontSize: 12, marginTop: 4 }}>
            Drive, Dropbox, YouTube veya kendi sunucunuzdaki dosya bağlantısı.
            Yükleme bu sürümde devre dışı.
          </div>
          {state.fieldErrors?.url ? <div className="od-error">{state.fieldErrors.url}</div> : null}
        </div>
      ) : null}

      <div className="od-field">
        <label className="od-label" htmlFor="description">
          {isNote ? "İçerik *" : "Açıklama"}
        </label>
        <textarea
          id="description"
          name="description"
          rows={isNote ? 8 : 3}
          maxLength={2000}
          className="od-input"
          placeholder={isNote ? "Notunuzu buraya yazın…" : "Kısa açıklama (opsiyonel)"}
          required={isNote}
        />
        {state.fieldErrors?.description ? <div className="od-error">{state.fieldErrors.description}</div> : null}
      </div>

      <div className="od-row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="od-field" style={{ flex: 1, minWidth: 220 }}>
          <label className="od-label" htmlFor="classroomId">Sınıf</label>
          <select id="classroomId" name="classroomId" defaultValue="" className="od-input">
            <option value="">— Sınıf seçilmedi —</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.branch ? ` · ${c.branch}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="od-field" style={{ flex: 1, minWidth: 220 }}>
          <label className="od-label" htmlFor="courseId">Ders</label>
          <select id="courseId" name="courseId" defaultValue="" className="od-input">
            <option value="">— Ders seçilmedi —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="od-field" style={{ flex: 1, minWidth: 160 }}>
          <label className="od-label" htmlFor="subject">Konu / Etiket</label>
          <input
            id="subject"
            name="subject"
            maxLength={80}
            className="od-input"
            placeholder="Örn. Türev"
          />
        </div>
      </div>

      <div className="od-field">
        <label className="od-row" style={{ gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="isPublished" defaultChecked value="on" />
          <span>Hemen yayınla</span>
        </label>
        <div className="od-muted" style={{ fontSize: 12, marginTop: 4 }}>
          Kapatırsanız taslak olarak kaydedilir; öğrenciler göremez.
        </div>
      </div>

      <div className="od-row" style={{ gap: 8, justifyContent: "flex-end" }}>
        <Link href="/panel/ogretmen/materyaller" className="od-btn od-btn-ghost od-btn-sm">
          Vazgeç
        </Link>
        <button type="submit" className="od-btn od-btn-primary od-btn-sm" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
