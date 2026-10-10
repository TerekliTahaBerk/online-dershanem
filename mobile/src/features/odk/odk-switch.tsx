import { useState } from 'react';

import { Banner, Button, EmptyState, PageHeader, Screen } from '@/design/primitives';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';

/**
 * OD / Yön çalışma alanındaki "Denemeler" (`odk-exams`) öğesi. Bu, OD dış
 * denemeleri DEĞİLDİR ve başka çalışma alanında Deneme Ligi verisi
 * gösterilmez: öğrencinin Deneme Ligi ürünü ACTIVE ise mevcut çalışma alanı
 * geçişiyle (sunucuya yazılır) Deneme Ligi'ne geçilir; değilse açıklama.
 */
export default function OdkSwitchScreen() {
  const bootstrap = useReadyBootstrap();
  const { selectWorkspace } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const odk = (bootstrap.workspace?.products ?? []).find((product) => product.code === 'ODK');
  const active = odk?.state === 'ACTIVE';
  return (
    <Screen testID="odk-switch">
      <PageHeader title="Deneme Ligi" description="Deneme Ligi denemelerin ve sonuçların kendi alanında seni bekliyor." />
      {error ? <Banner tone="critical">{error}</Banner> : null}
      {active ? (
        <Button
          label="Deneme Ligi'ne geç"
          loading={pending}
          testID="odk-switch-go"
          onPress={async () => {
            setPending(true);
            setError(null);
            try {
              await selectWorkspace('ODK');
            } catch {
              setError('Geçiş yapamadık. Bir daha dener misin?');
            } finally {
              setPending(false);
            }
          }}
        />
      ) : (
        <EmptyState title="Deneme Ligi henüz hesabında açık değil." body="Erişimin açıldığında denemelerini burada göreceksin." />
      )}
    </Screen>
  );
}
