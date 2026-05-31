"use client";

import { useActionState, useTransition } from "react";
import { useBulk } from "@/components/panel/ui/smart-table";
import { BulkOperationResultPanel } from "@/components/panel/bulk/bulk-result";
import {
  bulkTeacherGenerateInvitesAction,
  bulkTeacherForcePasswordChangeAction,
  bulkTeacherDisableAction,
  bulkTeacherEnableAction,
} from "@/app/panel/admin/ogretmenler/_bulk-actions";
import type { BulkOperationResult } from "@/lib/panel/bulk-operations";

const initialState: BulkOperationResult | null = null;

export function TeacherBulkActions() {
  const { selected, clear } = useBulk();
  const ids = Array.from(selected);

  const [generateState, generateAction, generatePending] = useActionState(bulkTeacherGenerateInvitesAction, initialState);
  const [forcePwState, forcePwAction, forcePwPending] = useActionState(bulkTeacherForcePasswordChangeAction, initialState);
  const [disableState, disableAction, disablePending] = useActionState(bulkTeacherDisableAction, initialState);
  const [enableState, enableAction, enablePending] = useActionState(bulkTeacherEnableAction, initialState);

  const lastResult = generateState ?? forcePwState ?? disableState ?? enableState;
  const anyPending = generatePending || forcePwPending || disablePending || enablePending;

  const [exportPending, startExport] = useTransition();
  function exportSelected() {
    if (ids.length === 0) return;
    const params = new URLSearchParams();
    params.set("ids", ids.join(","));
    startExport(() => {
      window.location.href = `/api/panel/export/ogretmenler?${params.toString()}`;
    });
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <form action={generateAction}>
          <HiddenIds ids={ids} />
          <button type="submit" className="od-btn od-btn-sm" disabled={ids.length === 0 || anyPending}>
            ✉️ Davet üret
          </button>
        </form>
        <form action={forcePwAction}>
          <HiddenIds ids={ids} />
          <button type="submit" className="od-btn od-btn-sm" disabled={ids.length === 0 || anyPending}>
            🔑 Şifre değişimini zorla
          </button>
        </form>
        <form action={enableAction}>
          <HiddenIds ids={ids} />
          <button type="submit" className="od-btn od-btn-sm" disabled={ids.length === 0 || anyPending}>
            ✅ Aktifleştir
          </button>
        </form>
        <form action={disableAction} style={{ display: "flex", gap: 4 }}>
          <HiddenIds ids={ids} />
          <input type="text" name="reason" placeholder="Sebep (opsiyonel)" className="od-input od-input-sm" style={{ width: 160 }} />
          <button type="submit" className="od-btn od-btn-sm od-btn-danger" disabled={ids.length === 0 || anyPending}>
            ⛔ Devre dışı bırak
          </button>
        </form>
        <span className="od-muted" style={{ fontSize: 11, alignSelf: "center" }}>
          (Ücret kuralları ve sınıf ataması toplu olarak yapılamaz — tekil sayfadan)
        </span>
        <button
          type="button"
          className="od-btn od-btn-ghost od-btn-sm"
          onClick={exportSelected}
          disabled={ids.length === 0 || exportPending}
        >
          ⬇ Seçilenleri indir
        </button>
      </div>
      {lastResult ? (
        <BulkOperationResultPanel result={lastResult} onDismiss={() => clear()} />
      ) : null}
    </>
  );
}

function HiddenIds({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
    </>
  );
}
