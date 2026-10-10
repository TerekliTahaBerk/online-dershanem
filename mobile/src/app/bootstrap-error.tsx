import { Button, ErrorState, Screen } from '@/design/primitives';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Oturum bilgisi alınamadı (ağ, sunucu, bozuk / sözleşmeye uymayan yanıt,
 * yetki). Ürün ekranları açılmaz; kullanıcı yeniden dener veya çıkış yapar.
 */
export default function BootstrapErrorScreen() {
  const { state, refreshBootstrap, signOut } = useSession();
  const error = state.status === 'BOOTSTRAP_ERROR' ? state.error : null;
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <ErrorState title="Hesap bilgilerini yükleyemedik" error={error} onRetry={() => void refreshBootstrap()} />
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </Screen>
  );
}
