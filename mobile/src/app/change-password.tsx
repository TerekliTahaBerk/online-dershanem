import { Banner, Button } from '@/design/primitives';
import { AuthScreen } from '@/features/auth/auth-screen';
import { ChangePasswordForm } from '@/features/auth/change-password-form';
import { useSession } from '@/lib/auth/session-provider';

/** Zorunlu geçici parola değişikliği kapısı (`mustChangePassword`). */
export default function ChangePasswordGate() {
  const { signOut } = useSession();
  return (
    <AuthScreen title="Parolanı belirle" description="Hesabın geçici bir parolayla açıldı. Devam etmeden önce kendi parolanı belirlemelisin.">
      <Banner tone="info">Bu adım tamamlanmadan ders, ödev veya bildirim verilerine erişilemez.</Banner>
      <ChangePasswordForm variant="auth" />
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </AuthScreen>
  );
}
