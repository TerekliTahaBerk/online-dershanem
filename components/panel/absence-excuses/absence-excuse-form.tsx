"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { createAbsenceExcuseAction } from "@/app/panel/veli/mazeret/_actions";
import { ABSENCE_REASON_OPTIONS } from "@/lib/panel/absence-excuses-display";

type ChildOption = {
  studentId: string;
  fullName: string;
};

type Props = {
  childOptions: ChildOption[];
  defaultStudentId?: string;
};

function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function AbsenceExcuseForm({ childOptions, defaultStudentId }: Props) {
  const [state, formAction, pending] = useActionState(createAbsenceExcuseAction, { ok: true });
  const [reason, setReason] = useState<string>("ILLNESS");

  if (childOptions.length === 0) {
    return (
      <div className="od-empty">
        <div className="od-empty-title">Bağlı çocuk bulunamadı</div>
        <div className="od-empty-desc">
          Mazeret bildirebilmek için hesabınıza en az bir öğrenci bağlanmış olmalı.
          Lütfen okul yöneticinize ulaşın.
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {state.error ? (
        <div className="od-alert od-alert-bad" role="alert">{state.error}</div>
      ) : null}

      <div className="od-field">
        <label className="od-label" htmlFor="studentId">Çocuk *</label>
        <select
          id="studentId"
          name="studentId"
          defaultValue={defaultStudentId ?? childOptions[0].studentId}
          required
          className="od-input"
        >
          {childOptions.map((c) => (
            <option key={c.studentId} value={c.studentId}>{c.fullName}</option>
          ))}
        </select>
        {state.fieldErrors?.studentId ? <div className="od-error">{state.fieldErrors.studentId}</div> : null}
      </div>

      <div className="od-row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div className="od-field" style={{ flex: 1, minWidth: 200 }}>
          <label className="od-label" htmlFor="startsAt">Başlangıç tarihi *</label>
          <input
            id="startsAt"
            name="startsAt"
            type="date"
            defaultValue={todayStr()}
            required
            className="od-input"
          />
          {state.fieldErrors?.startsAt ? <div className="od-error">{state.fieldErrors.startsAt}</div> : null}
        </div>
        <div className="od-field" style={{ flex: 1, minWidth: 200 }}>
          <label className="od-label" htmlFor="endsAt">Bitiş tarihi *</label>
          <input
            id="endsAt"
            name="endsAt"
            type="date"
            defaultValue={todayStr()}
            required
            className="od-input"
          />
          {state.fieldErrors?.endsAt ? <div className="od-error">{state.fieldErrors.endsAt}</div> : null}
        </div>
      </div>

      <div className="od-field">
        <label className="od-label" htmlFor="reason">Sebep *</label>
        <select
          id="reason"
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          className="od-input"
        >
          {ABSENCE_REASON_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="od-field">
        <label className="od-label" htmlFor="note">
          {reason === "OTHER" ? "Açıklama * (Diğer için zorunlu)" : "Açıklama"}
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={1000}
          className="od-input"
          placeholder="Kısa açıklama (opsiyonel)"
          required={reason === "OTHER"}
        />
        {state.fieldErrors?.note ? <div className="od-error">{state.fieldErrors.note}</div> : null}
      </div>

      <div className="od-field">
        <label className="od-label" htmlFor="attachmentUrl">Belge bağlantısı (opsiyonel)</label>
        <input
          id="attachmentUrl"
          name="attachmentUrl"
          type="url"
          inputMode="url"
          placeholder="Rapor / belge için URL (Drive, Dropbox, vb.)"
          className="od-input"
        />
        <div className="od-muted" style={{ fontSize: 12, marginTop: 4 }}>
          Bu sürümde dosya yükleme yok. Belgeniz varsa paylaşılabilir bir bağlantı yapıştırabilirsiniz.
        </div>
      </div>

      <div className="od-row" style={{ gap: 8, justifyContent: "flex-end" }}>
        <Link href="/panel/veli" className="od-btn od-btn-ghost od-btn-sm">İptal</Link>
        <button type="submit" className="od-btn od-btn-primary od-btn-sm" disabled={pending}>
          {pending ? "Gönderiliyor…" : "Mazeret bildir"}
        </button>
      </div>
    </form>
  );
}
