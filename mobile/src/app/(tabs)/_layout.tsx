import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

/**
 * v1 kapsamı: yalnız ÖĞRENCİ (mobil inşa promptu §5). Ana Sayfa/Dersler/
 * Çalışmalar gerçek veriyle dolu; Bildirimler dürüst "yakında" durumunda
 * (§10 bitmiş kabul kriteri: mock veri yok).
 *
 * Seçili/seçili-olmayan ikon çifti (`default`/`selected`) — dolu/boş SF
 * Symbol varyantı arasında geçiş, native iOS sekme çubuğunun beklediği his.
 */
export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor={Colors.light.background} indicatorColor={Colors.light.backgroundSelected}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Ana Sayfa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="dersler">
        <NativeTabs.Trigger.Label>Dersler</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="event" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="odevler">
        <NativeTabs.Trigger.Label>Çalışmalar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' }} md="checklist" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bildirimler">
        <NativeTabs.Trigger.Label>Bildirimler</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bell', selected: 'bell.fill' }} md="notifications" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profil">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
