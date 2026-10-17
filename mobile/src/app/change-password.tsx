import { Banner, Button } from '@/design/primitives';
import { AuthScreen } from '@/features/auth/auth-screen';
import { ChangePasswordForm } from '@/features/auth/change-password-form';
import { useSession } from '@/lib/auth/session-provider';

/** Zorunlu geçici parola değişikliği kapısı (`mustChangePassword`). */
export default function ChangePasswordGate() {
  const { signOut } = useSession();
  return (
    <AuthScreen title="Parolanı belirle" description="Aramıza hoş geldin! 🎉 Hesabın geçici bir parolayla açıldı; devam etmeden önce sana özel bir parola belirlemen yeterli.">
      <Banner tone="info">Güvenliğin için bu adımı tamamladıktan sonra derslerine, ödevlerine ve bildirimlerine ulaşabileceksin 🔐</Banner>
      <ChangePasswordForm variant="auth" />
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </AuthScreen>
  );
}
