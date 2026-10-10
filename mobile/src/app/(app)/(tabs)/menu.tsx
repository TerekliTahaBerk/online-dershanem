import { useRouter, type Href } from 'expo-router';
import { Bell, LogOut, Settings } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Row, Screen, Section, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, radius, space } from '@/design/tokens';
import { NavIcon } from '@/features/shell/nav-icon';
import { ROLE_LABEL } from '@/features/shell/labels';
import { WorkspaceSwitcher } from '@/features/shell/workspace-switcher';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { expoHrefFor, targetForNavId } from '@/navigation/route-map';

/**
 * Menü: çalışma alanı değiştirici + sunucu menüsünün tüm bölümleri +
 * Bildirimler + Hesap. Web kenar çubuğunun mobil karşılığı.
 */
export default function MenuScreen() {
  const bootstrap = useReadyBootstrap();
  const { product } = useDesign();
  const { signOut } = useSession();
  const router = useRouter();
  const navigation = bootstrap.workspace?.navigation;
  const unread = bootstrap.workspace?.unreadNotifications ?? 0;
  // M7: öğretmen de sunucu menüsünün bölümlerini görür (ADMIN yalnız web).
  const learner = bootstrap.user.role !== 'ADMIN';

  function open(navId: string) {
    if (!navigation) return;
    const href = expoHrefFor(targetForNavId(navigation, navId));
    if (href) router.push(href as Href);
  }

  return (
    <Screen backgroundColor={color.sidebar}>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: product.accentSoft }]}><Text variant="bodyStrong" tone="accent" accentColor={product.accent}>{(bootstrap.user.fullName ?? bootstrap.user.email).split(' ').slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr-TR')}</Text></View>
          <View style={styles.flex}><Text variant="bodyStrong">{bootstrap.user.fullName ?? bootstrap.user.email}</Text><Text variant="meta" tone="muted">{ROLE_LABEL[bootstrap.user.role]}</Text></View>
        </View>
        <WorkspaceSwitcher />
        {learner && navigation
          ? navigation.sections.map((section) => (
              <Section key={section.id} title={section.title.toLocaleLowerCase('tr-TR').replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('tr-TR'))}>
                {section.items.map((item) => (
                  <Row key={item.id} leading={<NavIcon id={item.id} color={color.textSecondary} />} title={item.label} onPress={() => open(item.id)} testID={`menu-${item.id}`} />
                ))}
              </Section>
            ))
          : null}
        <Section title="Hesap">
          <Row leading={<Bell size={19} color={color.textSecondary} />} title="Bildirimler" meta={unread > 0 ? `${unread} okunmamış` : null} onPress={() => router.push('/notifications')} testID="menu-notifications" />
          <Row leading={<Settings size={19} color={color.textSecondary} />} title="Hesap ve ayarlar" onPress={() => router.push('/account')} testID="menu-account" />
        </Section>
        <Row leading={<LogOut size={19} color={color.textSecondary} />} title="Çıkış yap" onPress={() => void signOut()} testID="menu-sign-out" />
      </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, identity: { flexDirection: 'row', alignItems: 'center', gap: space[3] }, avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' } });
