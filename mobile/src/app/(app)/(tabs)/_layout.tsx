import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useDesign } from '@/design/theme';
import { color } from '@/design/tokens';
import { tabIconFor } from '@/features/shell/tab-icons';
import { useReadyBootstrap } from '@/lib/auth/session-provider';

/**
 * Alt sekmeler sunucu menüsünden kurulur: öğrenci / velide
 * `navigation.primary` (≤4, web `mobilePrimaryNav`) + "Menü". Personel ve
 * yönetimde alt çubuk yok (web kararı, panel-design-roadmap §6.5): yalnız
 * "Bugün" ve "Menü". Sekme rotaları sabit yuvalardır; hangi ekranın açılacağı
 * `resolveNativeScreen` ile rol + çalışma alanına göre belirlenir.
 */
const SLOTS = ['index', 'slot-1', 'slot-2', 'slot-3'] as const;

export default function TabsLayout() {
  const bootstrap = useReadyBootstrap();
  const { product } = useDesign();
  const role = bootstrap.user.role;
  const learner = role === 'STUDENT' || role === 'PARENT';
  const primary = learner ? (bootstrap.workspace?.navigation.primary ?? []).slice(0, 4) : [];
  const unread = bootstrap.workspace?.unreadNotifications ?? 0;

  return (
    <NativeTabs backgroundColor={color.canvas} indicatorColor={product.accentSoft} iconColor={{ default: color.textMuted, selected: product.accent }} labelStyle={{ selected: { color: product.accent } }}>
      {SLOTS.map((name, index) => {
        const item = primary[index];
        const label = item?.label ?? (index === 0 ? 'Bugün' : '');
        const icon = tabIconFor(item?.id ?? 'today');
        return (
          <NativeTabs.Trigger key={name} name={name} hidden={index > 0 && !item}>
            <NativeTabs.Trigger.Label>{label}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={icon.sf} md={icon.md} />
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="menu">
        <NativeTabs.Trigger.Label>Menü</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="line.3.horizontal" md="menu" />
        {unread > 0 ? <NativeTabs.Trigger.Badge>{unread > 99 ? '99+' : String(unread)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
