import { useLocalSearchParams } from 'expo-router';

import { AccountSettingsSectionScreen } from '@/features/account/settings';

/** C08 · Ayar bölümü (web `/panel/ayarlar/[section]`). Bölüm kapsamı sunucudan gelir. */
export default function AccountSettingsSectionRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return <AccountSettingsSectionScreen section={typeof section === 'string' ? section : ''} />;
}
