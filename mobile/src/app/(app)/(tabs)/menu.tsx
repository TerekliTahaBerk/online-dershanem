import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, PageHeader, Row, Screen, Section, Text } from '@/design/primitives';
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
  const { signOut } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = bootstrap.workspace?.navigation;
  const unread = bootstrap.workspace?.unreadNotifications ?? 0;
  const learner = bootstrap.user.role === 'STUDENT' || bootstrap.user.role === 'PARENT';

  function open(navId: string) {
    if (!navigation) return;
    const href = expoHrefFor(targetForNavId(navigation, navId));
    if (href) router.push(href as Href);
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Screen>
        <PageHeader title="Menü" context={<Text tone="muted" variant="meta">{`${bootstrap.user.fullName ?? bootstrap.user.email} · ${ROLE_LABEL[bootstrap.user.role]}`}</Text>} />
        <WorkspaceSwitcher />
        {learner && navigation
          ? navigation.sections.map((section) => (
              <Section key={section.id} title={section.title.toLocaleLowerCase('tr-TR').replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('tr-TR'))}>
                {section.items.map((item) => (
                  <Row key={item.id} title={item.label} onPress={() => open(item.id)} testID={`menu-${item.id}`} />
                ))}
              </Section>
            ))
          : null}
        <Section title="Hesap">
          <Row title="Bildirimler" meta={unread > 0 ? `${unread} okunmamış` : null} onPress={() => router.push('/notifications')} testID="menu-notifications" />
          <Row title="Hesap ve ayarlar" onPress={() => router.push('/account')} testID="menu-account" />
        </Section>
        <Button label="Çıkış yap" variant="secondary" onPress={() => void signOut()} testID="menu-sign-out" />
      </Screen>
    </View>
  );
}
