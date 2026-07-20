export type OfflineOperation = "LESSON_CLOSE" | "ASSIGNMENT_PROGRESS";
export type OfflineQueueState = "QUEUED" | "CONFLICT" | "BLOCKED";

export type OfflineMutationInput = {
  kind: OfflineOperation;
  url: string;
  method: "PUT" | "PATCH";
  body: unknown;
  coalesceKey: string;
};

export type OfflineQueueRecord = OfflineMutationInput & {
  id: string;
  scope: string;
  state: OfflineQueueState;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  lastError: "VERSION" | "REJECTED" | "EXPIRED" | null;
};

const DB_NAME = "online-dershanem-offline-v1";
const STORE_NAME = "mutations";
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function validateOfflineMutation(input: OfflineMutationInput): boolean {
  const assignment = input.kind === "ASSIGNMENT_PROGRESS" && input.method === "PATCH" && /^\/api\/panel\/assignments\/[^/]+\/progress$/.test(input.url);
  const lesson = input.kind === "LESSON_CLOSE" && input.method === "PUT" && /^\/api\/panel\/lessons\/[^/]+\/notes$/.test(input.url);
  if (!assignment && !lesson) return false;
  const bytes = new TextEncoder().encode(JSON.stringify(input.body)).byteLength;
  return bytes > 0 && bytes <= MAX_PAYLOAD_BYTES && input.coalesceKey.length >= 3 && input.coalesceKey.length <= 160;
}

export function payloadSizeBand(body: unknown): "0-4KB" | "5-16KB" | "17-64KB" {
  const bytes = new TextEncoder().encode(JSON.stringify(body)).byteLength;
  return bytes <= 4 * 1024 ? "0-4KB" : bytes <= 16 * 1024 ? "5-16KB" : "17-64KB";
}

export function queueAgeBand(createdAt: number, now = Date.now()): "0-1M" | "2-15M" | "16M-24H" {
  const minutes = Math.max(0, (now - createdAt) / 60000);
  return minutes <= 1 ? "0-1M" : minutes <= 15 ? "2-15M" : "16M-24H";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    run(transaction.objectStore(STORE_NAME), resolve, reject);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function listOfflineMutations(scope: string): Promise<OfflineQueueRecord[]> {
  return withStore("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as OfflineQueueRecord[]).filter((item) => item.scope === scope).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineMutation(scope: string, input: OfflineMutationInput): Promise<OfflineQueueRecord> {
  if (!validateOfflineMutation(input)) throw new Error("OFFLINE_MUTATION_NOT_ALLOWED");
  const existing = await listOfflineMutations(scope);
  const previous = existing.find((item) => item.coalesceKey === input.coalesceKey && item.state === "QUEUED");
  const record: OfflineQueueRecord = {
    ...input,
    id: previous?.id || crypto.randomUUID(),
    scope,
    state: "QUEUED",
    createdAt: previous?.createdAt || Date.now(),
    expiresAt: Date.now() + MAX_AGE_MS,
    attempts: previous?.attempts || 0,
    lastError: null,
  };
  await putOfflineMutation(record);
  return record;
}

export async function putOfflineMutation(record: OfflineQueueRecord): Promise<void> {
  return withStore("readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOfflineMutation(id: string): Promise<void> {
  return withStore("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearOfflineScope(scope: string): Promise<void> {
  const records = await listOfflineMutations(scope);
  await Promise.all(records.map((record) => deleteOfflineMutation(record.id)));
}
