import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking } from 'react-native';

import { Banner, Button, PageHeader, Screen, Section, Text, TextField } from '@/design/primitives';
import { confirmAction, QueryView, useOnline, useStableKey } from '@/features/staff/shared';
import { fetchDeletionRequest, requestAccountDeletion } from '@/lib/api/account';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';

/**
 * P5.3 · Uygulama içi hesap silme talebi. Talep parolayla doğrulanır ve
 * destek ekibinin DSR sürecine düşer; hesabı hemen silmez. Kimlik, veli–
 * öğrenci ilişkileri ve saklama yükümlülükleri ayrıca değerlendirilir.
 */
export default function AccountDeletionScreen() {
  const bootstrap = useReadyBootstrap();
  const { api } = useSession();
  const client = useQueryClient();
  const online = useOnline();
  const queryKey = ['user', bootstrap.user.id, 'deletion-request'] as const;
  const query = useQuery({ queryKey, queryFn: ({ signal }) => fetchDeletionRequest(api, signal) });
  const [password, setPassword] = useState('');
  const [state, setState] = useState<{ tone: 'success' | 'critical' | 'warning'; message: string } | null>(null);
  const [mailError, setMailError] = useState(false);
  const key = useStableKey<string>(() => true);
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: async (secret: string) => {
      if (!online) throw new ApiError({ kind: 'network' });
      try {
        const result = await requestAccountDeletion(api, secret, key.keyFor('deletion'));
        key.settle();
        return result;
      } catch (error) {
        key.settle(error);
        throw error;
      }
    },
  });
  async function submit() {
    if (mutation.isPending || !password) return;
    const ok = await confirmAction({ title: 'Hesap silme talebi', message: 'Talebiniz destek ekibine iletilir. Hesabınız doğrulama ve saklama değerlendirmesinden sonra silinir veya anonimleştirilir.', confirmLabel: 'Talebi gönder', destructive: true });
    if (!ok) return;
    setState(null);
    try {
      const result = await mutation.mutateAsync(password);
      setPassword('');
      setState({ tone: 'success', message: result.alreadyRequested ? `Açık bir talebiniz zaten var (${formatShortDateTime(result.requestedAt)}).` : 'Hesap silme talebiniz alındı. Sonuç size e-postayla bildirilecek.' });
      await client.invalidateQueries({ queryKey });
    } catch (error) {
      setState({ tone: error instanceof ApiError && error.kind === 'conflict' ? 'warning' : 'critical', message: error instanceof ApiError ? error.message : 'Talep gönderilemedi. Tekrar deneyin.' });
    }
  }
  async function mail() {
    try {
      await Linking.openURL('mailto:iletisim@onlinedershanem.com?subject=Hesap%20silme%20talebi');
    } catch {
      setMailError(true);
    }
  }
  return (
    <Screen testID="account-deletion">
      <PageHeader title="Hesabımı sil" description="Hesabınızın ve ilişkili kişisel verilerinizin silinmesini buradan talep edebilirsiniz." />
      <Section first title="Süreç">
        <Text>Talep hesabınızı hemen kapatmaz. Kimliğiniz ve varsa veli–öğrenci ilişkileri doğrulanır; eğitim ve mali kayıtların saklama yükümlülükleri değerlendirilir. Saklanan kayıtlar ve sonuç size bildirilir.</Text>
      </Section>
      <QueryView query={query}>
        {(data) => (
          <Section title="Talep">
            {state ? <Banner tone={state.tone}>{state.message}</Banner> : null}
            {data.processing ? (
              <Banner tone="info" title="Talebiniz işleniyor">Hesap silme işlemi destek ekibi tarafından başlatıldı.</Banner>
            ) : data.requestedAt ? (
              <Banner tone="info" title="Açık talebiniz var">{`${formatShortDateTime(data.requestedAt)} tarihinde talep oluşturdunuz. Ekibimiz sizinle iletişime geçecek.`}</Banner>
            ) : (
              <>
                <TextField label="Parolanız" hint="Kimliğinizi doğrulamak için gerekir; saklanmaz." value={password} onChangeText={setPassword} secureTextEntry secureToggle autoComplete="current-password" textContentType="password" maxLength={200} testID="deletion-password" />
                <Button mutation label="Hesap silme talebi gönder" variant="secondary" loading={mutation.isPending} disabled={!online || !password || mutation.isPending} onPress={() => void submit()} testID="deletion-submit" />
              </>
            )}
          </Section>
        )}
      </QueryView>
      <Section title="Diğer kanal">
        <Text tone="secondary">Uygulamaya erişemiyorsanız kayıtlı e-posta adresinizden iletisim@onlinedershanem.com adresine yazabilirsiniz. Parolanızı veya doğrulama kodunuzu paylaşmayın.</Text>
        {mailError ? <Banner tone="critical">E-posta uygulaması açılamadı.</Banner> : null}
        <Button label="E-posta ile talep et" variant="quiet" onPress={() => void mail()} />
      </Section>
    </Screen>
  );
}
