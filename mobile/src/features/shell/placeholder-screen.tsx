import { Banner, Button, PageHeader, Screen } from '@/design/primitives';
import { PHASE_COPY, type NativeScreen } from '@/navigation/native-screens';

import { openOnWeb, webUrlFor } from './web-continuation';

/**
 * Bilinçli yer tutucu: menüde yetkili olarak görünen ama native karşılığı
 * sonraki fazda gelecek bölüm. Sahte veri göstermez; kullanıcıya açık bir
 * devam yolu (web paneli) sunar. Başka bir ürünün ekranına DÜŞMEZ.
 */
export function PlaceholderScreen({ screen }: { screen: NativeScreen }) {
  const canOpenWeb = Boolean(webUrlFor(screen.webPath));
  return (
    <Screen testID={`placeholder-${screen.navId}`}>
      <PageHeader title={screen.title} />
      <Banner tone="info" title="Mobilde yakında">
        {PHASE_COPY[screen.phase ?? 'M2']}
      </Banner>
      {canOpenWeb ? <Button label="Web panelinde aç" variant="secondary" onPress={() => void openOnWeb(screen.webPath)} accessibilityHint="Tarayıcıda açılır; web oturumuyla giriş yapmanız gerekebilir." /> : null}
    </Screen>
  );
}
