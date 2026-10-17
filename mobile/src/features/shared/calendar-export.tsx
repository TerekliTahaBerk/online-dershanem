import { useState } from 'react';
import * as Sharing from 'expo-sharing';
import { Banner, Button } from '@/design/primitives';
import { downloadMaterialFile } from '@/lib/files/material-files';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';

/** Authenticated ICS download uses the same per-account temporary cache as materials. */
export function CalendarExport({ studentId }: { studentId?: string }) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function share() {
    if (busy) return;
    setBusy(true); setError(null);
    let file: Awaited<ReturnType<typeof downloadMaterialFile>> | undefined;
    try {
      if (!api.baseUrl) throw new Error('Sunucu adresi yapılandırılmamış.');
      if (!await Sharing.isAvailableAsync()) throw new Error('Bu cihazda takvim paylaşımı kullanılamıyor 😕');
      file = await downloadMaterialFile({ baseUrl: api.baseUrl, path: `/api/panel/calendar/export${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`, headers: api.authHeaders(), userId: bootstrap.user.id, material: { id: `calendar-${studentId ?? 'self'}`, kind: 'LINK', fileName: 'ders-takvimi.ics', mimeType: 'text/calendar' } });
      await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', dialogTitle: 'Takvime ekle' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Takvimi şu an indiremedik 😕 Lütfen tekrar dener misiniz?'); }
    finally {
      try { if (file?.exists) file.delete(); } finally { setBusy(false); }
    }
  }
  return <>
    {error ? <Banner tone="critical">{error}</Banner> : null}
    <Button label="Takvime ekle (.ics)" variant="secondary" loading={busy} disabled={busy} onPress={() => void share()} testID="calendar-export" />
  </>;
}
