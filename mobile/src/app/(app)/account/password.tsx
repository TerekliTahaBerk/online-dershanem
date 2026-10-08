import { PageHeader, Screen } from '@/design/primitives';
import { ChangePasswordForm } from '@/features/auth/change-password-form';

export default function AccountPasswordScreen() {
  return (
    <Screen>
      <PageHeader title="Parolayı değiştir" description="Değişiklikten sonra diğer cihazlardaki oturumların kapatılır; bu cihazda oturumun açık kalır." />
      <ChangePasswordForm />
    </Screen>
  );
}
