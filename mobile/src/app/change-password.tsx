import { Banner, Button, PageHeader, Screen } from '@/design/primitives';
import { ChangePasswordForm } from '@/features/auth/change-password-form';
import { useSession } from '@/lib/auth/session-provider';

/** Zorunlu geçici parola değişikliği kapısı (`mustChangePassword`). */
export default function ChangePasswordGate() {
  const { signOut } = useSession();
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <PageHeader title="Parolanı belirle" description="Hesabın geçici bir parolayla açıldı. Devam etmeden önce kendi parolanı belirlemelisin." />
      <Banner tone="info">Bu adım tamamlanmadan ders, ödev veya bildirim verilerine erişilemez.</Banner>
      <ChangePasswordForm />
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </Screen>
  );
}
