import type { MobileProductCode } from '@contracts/bootstrap';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Screen, Text } from '@/design/primitives';
import { ProductLogo } from '@/design/brand';
import { space } from '@/design/tokens';
import { ServiceCard } from '@/features/shell/service-card';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Çalışma alanı seçimi (web `/panel/urun-sec` karşılığı). Seçim yetki
 * vermez; sunucuya yazılır ve bootstrap yeniden çekilir. Tek aktif ürün
 * varsa kullanıcıya sorulmadan o ürün seçilir — yine sunucu üzerinden.
 */
export default function WorkspaceSelectScreen() {
  const { state, selectWorkspace, skipWorkspaceSelection, signOut, exitAdminOverlay } = useSession();
  const [pending, setPending] = useState<MobileProductCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef<MobileProductCode | null>(null);
  const choosing = useRef(false);
  const bootstrap = state.status === 'WORKSPACE_SELECTION' ? state.bootstrap : null;
  const autoSelect = state.status === 'WORKSPACE_SELECTION' ? state.autoSelect : null;

  async function choose(code: MobileProductCode) {
    if (choosing.current) return;
    choosing.current = true;
    setPending(code);
    setError(null);
    try {
      await selectWorkspace(code);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Çalışma alanını şu an seçemedik 😕 Lütfen tekrar dener misin?');
    } finally {
      choosing.current = false;
      setPending(null);
    }
  }

  useEffect(() => {
    // Aynı ürün için bir kez denenir; sunucu reddederse kullanıcı seçici görür (döngü yok).
    if (autoSelect && autoTried.current !== autoSelect) {
      autoTried.current = autoSelect;
      void choose(autoSelect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız sunucunun önerdiği tek ürün değiştiğinde tetiklenir
  }, [autoSelect]);

  const products = bootstrap?.workspace?.products ?? [];
  const hasActive = products.some((product) => product.state === 'ACTIVE');
  // Personelde ürün seçmeden açılan bilgi ekranları vardır; aktif ürünü yoksa seçim ekranında takılmaz.
  const isStaff = bootstrap?.user.role === 'TEACHER' || bootstrap?.user.role === 'ADMIN';


  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} footer={<Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} disabled={pending !== null} />}>
      <View style={styles.identity}><ProductLogo size={32} /><Text variant="bodyStrong" style={{ flex: 1 }}>{bootstrap?.user.fullName ?? 'Hoş geldin 👋'}</Text></View>
      <PageHeader title="Hangi panele girmek istiyorsun?" description="Bugünkü yolculuğunu seç ✨ Hizmetler arasında dilediğin zaman geçiş yapabilirsin." />
      {error ? <Banner tone="critical">{error}</Banner> : null}
      {hasActive || isStaff ? null : (
        <EmptyState
          title="Henüz aktif bir çalışma alanın yok"
          body={products.some((product) => product.state === 'PREPARING') ? 'Öğrenci hesabı açılır açılmaz çalışma alanın burada aktif olacak ⏳' : 'Hesabında henüz aktif bir ürün görünmüyor. Bir sorun olduğunu düşünüyorsan ekibimiz sana yardımcı olmaktan mutluluk duyar 🤝'}
        />
      )}
      <View style={styles.services}>
        {products.map((product, index) => <ServiceCard key={product.code} product={product} index={index} pending={pending === product.code} disabled={product.state !== 'ACTIVE' || pending !== null} onPress={() => void choose(product.code)} />)}
      </View>
      {bootstrap?.adminOverlay ? <><Text>{bootstrap.adminOverlay.mode === 'PREVIEW' ? 'Önizleme · Salt okunur' : 'Öğretmen çalışma modu'}</Text><Button label="Yönetim paneline dön" onPress={() => void exitAdminOverlay().catch(() => undefined)} /></> : null}
      {isStaff && !hasActive ? <Button label="Panele devam et" onPress={skipWorkspaceSelection} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ identity: { flexDirection: 'row', alignItems: 'center', gap: space[3] }, services: { gap: space[3] } });
