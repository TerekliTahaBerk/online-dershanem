"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTag, type TagFormState } from "../actions";

export function TagFormCreate() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<TagFormState, FormData>(createTag, null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="pd-card" style={{ padding: 14, display: "grid", gap: 10 }}>
      <label className="pd-field">
        <span className="pd-field-label">Anahtar (key) *</span>
        <input name="key" required maxLength={40} className="pd-input" placeholder="vip / riskli / yeni-kayit" />
      </label>
      <label className="pd-field">
        <span className="pd-field-label">Etiket *</span>
        <input name="label" required maxLength={80} className="pd-input" placeholder="VIP" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="pd-field">
          <span className="pd-field-label">Renk</span>
          <select name="color" defaultValue="GRAY" className="pd-input">
            <option value="GRAY">Gri</option>
            <option value="BLUE">Mavi</option>
            <option value="GREEN">Yeşil</option>
            <option value="YELLOW">Sarı</option>
            <option value="ORANGE">Turuncu</option>
            <option value="RED">Kırmızı</option>
            <option value="PURPLE">Mor</option>
            <option value="PINK">Pembe</option>
          </select>
        </label>
        <label className="pd-field">
          <span className="pd-field-label">Kapsam</span>
          <select name="scope" defaultValue="STUDENT" className="pd-input">
            <option value="STUDENT">Öğrenci</option>
            <option value="TEACHER">Öğretmen</option>
            <option value="PARENT">Veli</option>
            <option value="GENERAL">Genel</option>
          </select>
        </label>
      </div>
      <label className="pd-field">
        <span className="pd-field-label">Açıklama</span>
        <textarea name="description" rows={2} className="pd-input" maxLength={500} />
      </label>
      {state && !state.ok && (
        <div style={{ color: "#ef4444", fontSize: 12 }}>{state.error}</div>
      )}
      <button type="submit" disabled={pending} className="pd-btn-accent">
        {pending ? "Kaydediliyor..." : "Etiket oluştur"}
      </button>
    </form>
  );
}
