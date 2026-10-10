import { useState } from 'react';
import { Linking } from 'react-native';
import { Banner, Button, PageHeader, Screen, Section, Text } from '@/design/primitives';

/** Request entry point only; email is not a completed erasure or a compliant self-service flow. */
export default function AccountDeletionScreen() {
  const [error, setError] = useState(false);
  async function request() {
    try {
      await Linking.openURL('mailto:iletisim@onlinedershanem.com?subject=Hesap%20silme%20talebi');
    } catch { setError(true); }
  }
  return <Screen>
    <PageHeader title="Hesabımı sil" description="Hesabının ve ona bağlı kişisel verilerinin silinmesini isteyebilirsin." />
    <Section first title="Talep süreci">
      <Text>Hesabına kayıtlı e-posta adresinden iletisim@onlinedershanem.com adresine hesap silme talebini gönder. Parolanı ya da doğrulama kodunu asla paylaşma.</Text>
      <Text>Talebini göndermek hesabını hemen silmez ya da kapatmaz. Önce kimliğin ve varsa veli–öğrenci bağlantıları doğrulanır. Eğitim ve mali kayıtların saklama yükümlülükleri ayrıca değerlendirilir. Saklanan kayıtları ve işlemin sonucunu sana bildiririz.</Text>
      <Text>Hesabın devre dışı bırakılması verilerinin silindiği anlamına gelmez. Neyin silineceğini ve ne kadar süreceğini destek ekibimiz sana ayrıca teyit eder.</Text>
    </Section>
    {error ? <Banner tone="critical">E-posta uygulamasını açamadık. Yukarıdaki adrese, hesabına kayıtlı e-posta adresinden yazabilirsin.</Banner> : null}
    <Button label="Silme talebi için e-posta hazırla" variant="secondary" onPress={() => void request()} />
  </Screen>;
}
