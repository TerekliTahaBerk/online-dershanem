"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { useToastAction } from "@/components/ui/use-toast-action";

type DeletionRequestView = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "PROCESSED";
  requestedAt: string;
  scheduledFor: string;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  reason: string | null;
};

const fmtDateTime = (s: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));

const STATUS_LABEL: Record<DeletionRequestView["status"], { label: string; tone: "warn" | "ok" | "bad" | "neutral" }> = {
  PENDING:   { label: "Onay bekliyor", tone: "warn" },
  APPROVED:  { label: "Onaylandı — silinmek üzere", tone: "warn" },
  REJECTED:  { label: "Reddedildi", tone: "bad" },
  CANCELLED: { label: "İptal edildi", tone: "neutral" },
  PROCESSED: { label: "İşlendi (hesap anonimleştirildi)", tone: "ok" },
};

export function AccountDeletionForm({
  active,
  history,
  createAction,
  cancelAction,
}: {
  active: DeletionRequestView | null;
  history: DeletionRequestView[];
  createAction: (fd: FormData) => Promise<void>;
  cancelAction: (id: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { runAction, pending } = useToastAction();

  const canSubmit = confirm.trim() === "HESABIMI SİL" && !active;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    runAction(() => createAction(fd), {
      successMessage: "Hesap silme talebin oluşturuldu",
      onSuccess: () => {
        setConfirm("");
        setReason("");
      },
      onError: (err) => setError(err instanceof Error ? err.message : "Bir hata oluştu"),
    });
  }

  function handleCancel(id: string) {
    if (!window.confirm("Hesap silme talebini iptal etmek istediğine emin misin?")) return;
    setError(null);
    runAction(() => cancelAction(id), {
      successMessage: "Talep iptal edildi",
      onError: (err) => setError(err instanceof Error ? err.message : "Bir hata oluştu"),
    });
  }

  return (
    <div className="od-grid g-1" style={{ gap: 16 }}>
      {active ? (
        <Card>
          <CardHeader title="Aktif silme talebin" />
          <CardBody>
            <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
              <div>
                <Badge tone={STATUS_LABEL[active.status].tone}>{STATUS_LABEL[active.status].label}</Badge>
              </div>
              <div className="od-grid g-2" style={{ gap: 8 }}>
                <div>
                  <div className="od-muted">Talep tarihi</div>
                  <div><strong>{fmtDateTime(active.requestedAt)}</strong></div>
                </div>
                <div>
                  <div className="od-muted">Planlanan silme</div>
                  <div><strong>{fmtDateTime(active.scheduledFor)}</strong></div>
                </div>
              </div>
              {active.reason ? (
                <div>
                  <div className="od-muted">Belirttiğin sebep</div>
                  <div>{active.reason}</div>
                </div>
              ) : null}
              <div
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <strong>ℹ️ Bilgi:</strong> Hesabın planlanan tarihte anonimleştirilecek.
                Bu süreyi geri almak için aşağıdaki butonla talebi iptal edebilirsin.
                İşlem tamamlandıktan sonra geri alınamaz; ancak vergi/audit kayıtları
                yasal sürelerce saklanır.
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => handleCancel(active.id)}
                  disabled={pending || active.status === "PROCESSED"}
                  className="od-btn od-btn-sm"
                >
                  {pending ? "İptal ediliyor…" : "Talebi iptal et"}
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Hesabımı sil" subtitle="KVKK 11. madde — silme hakkı" />
          <CardBody>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <strong>⚠️ Bu işlem geri alınamaz.</strong> Talep onaylandıktan sonra
                <strong> 7 günlük bekleme süresi</strong> başlar. Süre dolmadan talebi
                iptal edebilirsin. Süre sonunda:
                <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 20 }}>
                  <li>Adın, e-postan, şifren ve iletişim bilgilerin silinir.</li>
                  <li>Aktif ODK paket ve etiket erişimlerin iptal edilir.</li>
                  <li>
                    Vergi mevzuatı gereği sipariş/ödeme/muhasebe kayıtları kişisel
                    bilgilerinden arındırılmış olarak saklanır.
                  </li>
                </ul>
              </div>

              <div>
                <label htmlFor="reason" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Sebep (opsiyonel)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={3}
                  className="od-input"
                  placeholder="Bize geri bildirim vermek istersen…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirm" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Onaylamak için <code>HESABIMI SİL</code> yaz
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="text"
                  className="od-input"
                  autoComplete="off"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error ? (
                <div style={{ color: "#b91c1c", fontSize: 12 }}>{error}</div>
              ) : null}

              <div>
                <button
                  type="submit"
                  disabled={!canSubmit || pending}
                  className="od-btn od-btn-primary"
                  style={{ background: canSubmit ? "#b91c1c" : undefined, borderColor: canSubmit ? "#b91c1c" : undefined }}
                >
                  {pending ? "Talep oluşturuluyor…" : "Hesap silme talebimi oluştur"}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {history.length > 0 ? (
        <Card>
          <CardHeader title="Geçmiş taleplerim" />
          <CardBody>
            <table className="od-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th>İnceleme notu</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDateTime(r.requestedAt)}</td>
                    <td><Badge tone={STATUS_LABEL[r.status].tone}>{STATUS_LABEL[r.status].label}</Badge></td>
                    <td className="od-muted">{r.reviewerNotes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
