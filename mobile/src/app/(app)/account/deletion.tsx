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
    <PageHeader title="Hesabımı sil" description="Hesabınızın ve ilişkili kişisel verilerinizin silinmesini talep edebilirsiniz." />
    <Section first title="Talep süreci">
      <Text>Hesabınıza kayıtlı e-posta adresinizden iletisim@onlinedershanem.com adresine hesap silme talebinizi iletin. Parolanızı veya doğrulama kodunuzu paylaşmayın.</Text>
      <Text>Talep gönderimi hesabınızı hemen silmez veya kapatmaz. Kimliğiniz ve varsa veli–öğrenci ilişkileri doğrulanır. Eğitim ve mali kayıtların saklama yükümlülükleri ayrıca değerlendirilir. Saklanan kayıtlar ve işlemin sonucu size bildirilmelidir.</Text>
      <Text>Hesabı devre dışı bırakmak verilerin silindiği anlamına gelmez. Silme kapsamı ve tamamlanma süresi destek ekibi tarafından teyit edilmelidir.</Text>
    </Section>
    {error ? <Banner tone="critical">E-posta uygulaması açılamadı. Yukarıdaki adrese kayıtlı e-posta adresinizden yazabilirsiniz.</Banner> : null}
    <Button label="Silme talebi için e-posta hazırla" variant="secondary" onPress={() => void request()} />
  </Screen>;
}
