"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { sendPanelEvent } from "@/lib/panel-event-client";
import { clearOfflineScope, deleteOfflineMutation, enqueueOfflineMutation, listOfflineMutations, payloadSizeBand, putOfflineMutation, queueAgeBand, type OfflineMutationInput, type OfflineOperation } from "@/lib/offline-outbox";

type SubmitResult = { state: "synced" | "queued" | "conflict" | "error"; response: Response | null; body: Record<string, unknown>; queueId?: string };
type OfflineContextValue = {
  enabled: boolean;
  lowDataMode: boolean;
  online: boolean;
  queuedCount: number;
  conflictCount: number;
  submitMutation: (input: OfflineMutationInput) => Promise<SubmitResult>;
  retryNow: () => Promise<void>;
  clearDeviceQueue: () => Promise<void>;
  applyPreferences: (lowDataMode: boolean, offlineWritesEnabled: boolean) => void;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

async function responseBody(response: Response | null): Promise<Record<string, unknown>> {
  if (!response) return {};
  return response.clone().json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

function attemptBand(attempts: number): "1" | "2-3" | "4+" { return attempts <= 1 ? "1" : attempts <= 3 ? "2-3" : "4+"; }

export function OfflineSyncProvider({ scope, available, enabled, lowDataMode, children }: { scope: string; available: boolean; enabled: boolean; lowDataMode: boolean; children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [writesEnabled, setWritesEnabled] = useState(enabled);
  const [dataSaver, setDataSaver] = useState(lowDataMode);
  const [queuedCount, setQueuedCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const syncing = useRef(false);

  const refreshCounts = useCallback(async () => {
    if (!writesEnabled || !scope || typeof indexedDB === "undefined") return;
    const records = await listOfflineMutations(scope).catch(() => []);
    setQueuedCount(records.filter((item) => item.state === "QUEUED").length);
    setConflictCount(records.filter((item) => item.state !== "QUEUED").length);
  }, [scope, writesEnabled]);

  const sync = useCallback(async () => {
    if (!writesEnabled || !scope || typeof indexedDB === "undefined" || !navigator.onLine || syncing.current) return;
    syncing.current = true;
    try {
      const records = await listOfflineMutations(scope);
      for (const record of records.filter((item) => item.state === "QUEUED")) {
        if (record.expiresAt <= Date.now()) {
          await putOfflineMutation({ ...record, state: "BLOCKED", lastError: "EXPIRED" });
          sendPanelEvent({ name: "offline_write_queued", properties: { operation: record.kind, payloadSizeBand: payloadSizeBand(record.body) } });
          sendPanelEvent({ name: "offline_write_conflicted", properties: { operation: record.kind, conflictType: "EXPIRED" } });
          window.dispatchEvent(new CustomEvent("panel-offline-conflict", { detail: { kind: record.kind, url: record.url } }));
          continue;
        }
        let response: Response | null = null;
        try {
          response = await fetch(record.url, { method: record.method, headers: { "content-type": "application/json", "x-panel-offline-replay": "1" }, body: JSON.stringify(record.body) });
        } catch { response = null; }
        if (response?.ok) {
          const body = await responseBody(response);
          await deleteOfflineMutation(record.id);
          sendPanelEvent({ name: "offline_write_queued", properties: { operation: record.kind, payloadSizeBand: payloadSizeBand(record.body) } });
          sendPanelEvent({ name: "offline_write_synced", properties: { operation: record.kind, queueAgeBand: queueAgeBand(record.createdAt), attemptBand: attemptBand(record.attempts + 1) } });
          window.dispatchEvent(new CustomEvent("panel-offline-synced", { detail: { kind: record.kind, url: record.url, body, requestBody: record.body } }));
          continue;
        }
        if (response?.status === 409) {
          await putOfflineMutation({ ...record, attempts: record.attempts + 1, state: "CONFLICT", lastError: "VERSION" });
          sendPanelEvent({ name: "offline_write_queued", properties: { operation: record.kind, payloadSizeBand: payloadSizeBand(record.body) } });
          sendPanelEvent({ name: "offline_write_conflicted", properties: { operation: record.kind, conflictType: "VERSION" } });
          window.dispatchEvent(new CustomEvent("panel-offline-conflict", { detail: { kind: record.kind, url: record.url } }));
          continue;
        }
        if (response && [400, 401, 403, 404].includes(response.status)) {
          await putOfflineMutation({ ...record, attempts: record.attempts + 1, state: "BLOCKED", lastError: "REJECTED" });
          sendPanelEvent({ name: "offline_write_queued", properties: { operation: record.kind, payloadSizeBand: payloadSizeBand(record.body) } });
          sendPanelEvent({ name: "offline_write_conflicted", properties: { operation: record.kind, conflictType: "REJECTED" } });
          window.dispatchEvent(new CustomEvent("panel-offline-conflict", { detail: { kind: record.kind, url: record.url } }));
          continue;
        }
        await putOfflineMutation({ ...record, attempts: Math.min(10, record.attempts + 1) });
        break;
      }
    } finally {
      syncing.current = false;
      await refreshCounts();
    }
  }, [refreshCounts, scope, writesEnabled]);

  useEffect(() => { setWritesEnabled(enabled); }, [enabled]);
  useEffect(() => { setDataSaver(lowDataMode); }, [lowDataMode]);

  useEffect(() => {
    const setConnection = () => { setOnline(navigator.onLine); if (navigator.onLine) void sync(); };
    setConnection();
    window.addEventListener("online", setConnection);
    window.addEventListener("offline", setConnection);
    void refreshCounts();
    if (available && "serviceWorker" in navigator) void navigator.serviceWorker.register("/panel-sw.js", { scope: "/" }).catch(() => undefined);
    return () => { window.removeEventListener("online", setConnection); window.removeEventListener("offline", setConnection); };
  }, [available, refreshCounts, sync]);

  useEffect(() => {
    document.documentElement.dataset.panelLowData = dataSaver ? "true" : "false";
    return () => { document.documentElement.removeAttribute("data-panel-low-data"); };
  }, [dataSaver]);

  const submitMutation = useCallback(async (input: OfflineMutationInput): Promise<SubmitResult> => {
    let response: Response | null = null;
    if (navigator.onLine) {
      try { response = await fetch(input.url, { method: input.method, headers: { "content-type": "application/json" }, body: JSON.stringify(input.body) }); } catch { response = null; }
      if (response && ![502, 503, 504].includes(response.status)) return { state: response.status === 409 ? "conflict" : response.ok ? "synced" : "error", response, body: await responseBody(response) };
    }
    if (!writesEnabled) return { state: "error", response, body: { error: "Bağlantı kurulamadı; çevrimdışı kayıt bu hesapta kapalı." } };
    try {
      const queued = await enqueueOfflineMutation(scope, input);
      await refreshCounts();
      return { state: "queued", response: null, body: {}, queueId: queued.id };
    } catch {
      return { state: "error", response: null, body: { error: "Bu işlem güvenli çevrimdışı kuyruğa alınamadı." } };
    }
  }, [refreshCounts, scope, writesEnabled]);

  const clearDeviceQueue = useCallback(async () => { if (scope) await clearOfflineScope(scope); await refreshCounts(); }, [refreshCounts, scope]);
  const applyPreferences = useCallback((nextLowDataMode: boolean, nextOfflineWritesEnabled: boolean) => { setDataSaver(nextLowDataMode); setWritesEnabled(nextOfflineWritesEnabled); }, []);
  const value = useMemo(() => ({ enabled: writesEnabled, lowDataMode: dataSaver, online, queuedCount, conflictCount, submitMutation, retryNow: sync, clearDeviceQueue, applyPreferences }), [applyPreferences, clearDeviceQueue, conflictCount, dataSaver, online, queuedCount, submitMutation, sync, writesEnabled]);

  return <OfflineContext.Provider value={value}>
    {!online || queuedCount || conflictCount ? <div role="status" className={`sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-2 px-4 py-2 text-xs font-bold ${conflictCount ? "bg-amber-100 text-amber-950" : "bg-sky-100 text-sky-950"}`}>
      {!online ? <><CloudOff size={14} /> Çevrimdışısınız.</> : <><RefreshCw size={14} /> Bağlantı geri geldi.</>}
      {queuedCount ? <span>{queuedCount} güvenli işlem cihazda bekliyor.</span> : null}
      {conflictCount ? <><TriangleAlert size={14} /><span>{conflictCount} işlem insan kontrolü istiyor.</span></> : null}
      <Link href="/panel/veri-kullanimi" className="underline underline-offset-2">Ayrıntılar</Link>
    </div> : null}
    {children}
  </OfflineContext.Provider>;
}

export function useOfflineSync(): OfflineContextValue {
  const value = useContext(OfflineContext);
  if (!value) throw new Error("useOfflineSync must be used inside OfflineSyncProvider");
  return value;
}

export async function clearCurrentOfflineScope(scope: string): Promise<void> {
  if (typeof indexedDB !== "undefined" && scope) await clearOfflineScope(scope).catch(() => undefined);
}

export type { OfflineOperation };
