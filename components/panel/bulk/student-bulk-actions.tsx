"use client";

/**
 * Phase 3 / Session 8 — Student bulk action bar.
 *
 * Renders inside `<BulkBar>` when ≥1 row is selected. Each button is a real
 * `<form>` posting to a server action; the most-recent action's result is
 * surfaced via <BulkOperationResultPanel/>.
 */

import { useActionState, useState, useTransition } from "react";
import { useBulk } from "@/components/panel/ui/smart-table";
import { BulkOperationResultPanel } from "@/components/panel/bulk/bulk-result";
import {
  bulkStudentGenerateInvitesAction,
  bulkStudentForcePasswordChangeAction,
  bulkStudentDisableAction,
  bulkStudentEnableAction,
  bulkStudentAssignClassroomAction,
  bulkStudentGrantAccessTagAction,
} from "@/app/panel/admin/ogrenciler/_bulk-actions";
import type { BulkOperationResult } from "@/lib/panel/bulk-operations";

type ClassroomOption = { id: string; name: string };
type AccessTagOption = { id: string; key: string; service: string };

type Props = {
  classrooms: ClassroomOption[];
  accessTags: AccessTagOption[];
};

const initialState: BulkOperationResult | null = null;

export function StudentBulkActions({ classrooms, accessTags }: Props) {
  const { selected, clear } = useBulk();
  const ids = Array.from(selected);

  // Each button has its own action state so the result panel reflects only
  // the latest invocation of any operation.
  const [generateState, generateAction, generatePending] = useActionState(bulkStudentGenerateInvitesAction, initialState);
  const [forcePwState, forcePwAction, forcePwPending] = useActionState(bulkStudentForcePasswordChangeAction, initialState);
  const [disableState, disableAction, disablePending] = useActionState(bulkStudentDisableAction, initialState);
  const [enableState, enableAction, enablePending] = useActionState(bulkStudentEnableAction, initialState);
  const [classroomState, classroomAction, classroomPending] = useActionState(bulkStudentAssignClassroomAction, initialState);
  const [accessState, accessAction, accessPending] = useActionState(bulkStudentGrantAccessTagAction, initialState);

  const lastResult =
    generateState ??
    forcePwState ??
    disableState ??
    enableState ??
    classroomState ??
    accessState;
  const anyPending = generatePending || forcePwPending || disablePending || enablePending || classroomPending || accessPending;

  const [classroomId, setClassroomId] = useState("");
  const [accessTagId, setAccessTagId] = useState("");
  const [exportPending, startExport] = useTransition();

  function exportSelected() {
    if (ids.length === 0) return;
    const params = new URLSearchParams();
    params.set("ids", ids.join(","));
    startExport(() => {
      window.location.href = `/api/panel/export/ogrenciler?${params.toString()}`;
    });
  }

  return (
    <>
      <div className="od-bulk-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Generate invites */}
        <form action={generateAction}>
          <HiddenIds ids={ids} />
          <button
            type="submit"
            className="od-btn od-btn-sm"
            disabled={ids.length === 0 || anyPending}
            title="Seçili öğrenciler için davet linki oluştur veya rotate et"
          >
            ✉️ Davet üret
          </button>
        </form>

        {/* Force password change */}
        <form action={forcePwAction}>
          <HiddenIds ids={ids} />
          <button
            type="submit"
            className="od-btn od-btn-sm"
            disabled={ids.length === 0 || anyPending}
            title="Sonraki girişte şifre değiştirmeyi zorunlu kıl"
          >
            🔑 Şifre değişimini zorla
          </button>
        </form>

        {/* Enable */}
        <form action={enableAction}>
          <HiddenIds ids={ids} />
          <button
            type="submit"
            className="od-btn od-btn-sm"
            disabled={ids.length === 0 || anyPending}
            title="Devre dışı hesapları aktifleştir"
          >
            ✅ Aktifleştir
          </button>
        </form>

        {/* Disable (with reason) */}
        <form action={disableAction} style={{ display: "flex", gap: 4 }}>
          <HiddenIds ids={ids} />
          <input
            type="text"
            name="reason"
            placeholder="Sebep (opsiyonel)"
            className="od-input od-input-sm"
            style={{ width: 160 }}
          />
          <button
            type="submit"
            className="od-btn od-btn-sm od-btn-danger"
            disabled={ids.length === 0 || anyPending}
            title="Hesapları geçici olarak devre dışı bırak"
          >
            ⛔ Devre dışı bırak
          </button>
        </form>

        {/* Classroom assign */}
        <form action={classroomAction} style={{ display: "flex", gap: 4 }}>
          <HiddenIds ids={ids} />
          <select
            name="classroomId"
            className="od-input od-input-sm"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            style={{ minWidth: 140 }}
          >
            <option value="">Sınıf seç…</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="od-btn od-btn-sm"
            disabled={ids.length === 0 || !classroomId || anyPending}
            title="Seçili öğrencileri sınıfa ata"
          >
            🏫 Sınıfa ekle
          </button>
        </form>

        {/* Access tag grant */}
        {accessTags.length > 0 ? (
          <form action={accessAction} style={{ display: "flex", gap: 4 }}>
            <HiddenIds ids={ids} />
            <select
              name="accessTagId"
              className="od-input od-input-sm"
              value={accessTagId}
              onChange={(e) => setAccessTagId(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="">Etiket seç…</option>
              {accessTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.service}:{t.key}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="expiresAt"
              className="od-input od-input-sm"
              title="Bitiş tarihi (opsiyonel)"
              style={{ width: 130 }}
            />
            <button
              type="submit"
              className="od-btn od-btn-sm"
              disabled={ids.length === 0 || !accessTagId || anyPending}
              title="Erişim etiketi ver"
            >
              🏷️ Etiket ver
            </button>
          </form>
        ) : null}

        {/* Export selected (XLSX via existing route w/ ?ids=) */}
        <button
          type="button"
          className="od-btn od-btn-ghost od-btn-sm"
          onClick={exportSelected}
          disabled={ids.length === 0 || exportPending}
          title="Seçili kayıtları Excel olarak indir"
        >
          ⬇ Seçilenleri indir
        </button>
      </div>

      {lastResult ? (
        <div onClick={() => { /* dismiss handled below */ }}>
          <BulkOperationResultPanel
            result={lastResult}
            onDismiss={() => {
              // Server actions cannot be reset; clear selection instead.
              clear();
            }}
          />
        </div>
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
