import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { ProductLogo } from '@/design/brand';
import { Bell, KeyRound, Monitor, Settings, ShieldCheck, Trash2 } from 'lucide-react-native';
import { color } from '@/design/tokens';
import { APP_VERSION } from '@/config/app-info';
import { PRODUCT_STATE_PRESENTATION, ROLE_LABEL } from '@/features/shell/labels';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { pushAvailableFor } from '@/lib/push/registration';

/**
 * Hesap ve ayarlar merkezi: kimlik, ürün durumları, güvenlik (parola,
 * oturumlar), çıkış. Profil / iletişim / onay bölümleri ve panel tercihleri
 * `account/settings` (P5.2, web `/panel/ayarlar`).
 */
export default function AccountScreen() {
  const bootstrap = useReadyBootstrap();
  const { signOut } = useSession();
  const router = useRouter();
  const products = bootstrap.workspace?.products ?? [];
  return (
    <Screen>
      <PageHeader title={bootstrap.user.fullName ?? 'Hesabım'} context={<Text tone="muted" variant="meta">{ROLE_LABEL[bootstrap.user.role]}</Text>} />
      <Section first title="Kimlik">
        <Row leading={<Settings size={19} color={color.textSecondary} strokeWidth={1.7} />} title="Hesap ayarları" subtitle="Profil, iletişim, onaylar ve panel tercihleri" onPress={() => router.push('/account/settings' as Href)} testID="account-settings-entry" />
        {bootstrap.user.role === 'STUDENT' ? <Row title="Öğrenci profilim" onPress={() => router.push('/account/profile' as Href)} testID="account-profile" /> : null}
        <Row title="E-posta" subtitle={bootstrap.user.email} />
        <Row title="Rol" subtitle={ROLE_LABEL[bootstrap.user.role]} />
      </Section>
      <Section title="Ürünler">
        {products.map((product) => (
          <Row key={product.code} leading={<ProductLogo product={product.code} size={32} />} title={product.label} trailing={<StatusBadge label={PRODUCT_STATE_PRESENTATION[product.state].label} tone={PRODUCT_STATE_PRESENTATION[product.state].tone} />} />
        ))}
      </Section>
      <Section title="Güvenlik">
        <Row leading={<KeyRound size={19} color={color.textSecondary} strokeWidth={1.7} />} title="Parolayı değiştir" onPress={() => router.push('/account/password')} testID="account-password" />
        {bootstrap.workspace?.capabilities.security ? <Row leading={<ShieldCheck size={19} color={color.textSecondary} strokeWidth={1.7} />} title="İki adımlı doğrulama" subtitle="Doğrulayıcı uygulama ve kurtarma kodları" onPress={() => router.push('/account/security' as Href)} testID="account-security" /> : null}
        <Row leading={<Monitor size={19} color={color.textSecondary} strokeWidth={1.7} />} title="Oturumlar" subtitle="Bu hesabın açık olduğu cihazlar" onPress={() => router.push('/account/sessions')} testID="account-sessions" />
        {pushAvailableFor(bootstrap) ? (
          <Row leading={<Bell size={19} color={color.textSecondary} strokeWidth={1.7} />} title="Bildirim ayarları" subtitle="Telefon bildirimleri, kategoriler, sessiz saatler" onPress={() => router.push('/account/notifications')} testID="account-notifications" />
        ) : null}
      </Section>
      <Section title="Gizlilik ve hesap">
        <Row leading={<ShieldCheck size={19} color={color.textSecondary} strokeWidth={1.7} />} title="Gizlilik politikası" onPress={() => router.push('/account/privacy')} />
        <Row leading={<Trash2 size={19} color={color.textSecondary} strokeWidth={1.7} />} title="Hesabımı sil" subtitle="Silme talebi ve veri saklama bilgileri" onPress={() => router.push('/account/deletion')} />
      </Section>
      <View style={styles.footer}>
        <Button label="Çıkış yap" variant="secondary" onPress={() => void signOut()} testID="account-sign-out" />
        <Text variant="meta" tone="muted" style={styles.center}>
          Uygulama sürümü {APP_VERSION ?? 'bilinmiyor'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ footer: { gap: 12 }, center: { textAlign: 'center' } });
