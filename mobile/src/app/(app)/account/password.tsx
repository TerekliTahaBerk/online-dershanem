import { PageHeader, Screen } from '@/design/primitives';
import { ChangePasswordForm } from '@/features/auth/change-password-form';

export default function AccountPasswordScreen() {
  return (
    <Screen>
      <PageHeader title="Parolayı değiştir" description="Değiştirdiğinde diğer cihazlardaki oturumlarını kapatırız; bu telefonda oturumun açık kalır." />
      <ChangePasswordForm />
    </Screen>
  );
}
