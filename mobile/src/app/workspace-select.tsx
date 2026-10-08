import type { MobileProductCode } from '@contracts/bootstrap';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge } from '@/design/primitives';
import { productTheme } from '@/design/products';
import { PRODUCT_STATE_PRESENTATION } from '@/features/shell/labels';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Çalışma alanı seçimi (web `/panel/urun-sec` karşılığı). Seçim yetki
 * vermez; sunucuya yazılır ve bootstrap yeniden çekilir. Tek aktif ürün
 * varsa kullanıcıya sorulmadan o ürün seçilir — yine sunucu üzerinden.
 */
export default function WorkspaceSelectScreen() {
  const { state, selectWorkspace, signOut } = useSession();
  const [pending, setPending] = useState<MobileProductCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef<MobileProductCode | null>(null);
  const bootstrap = state.status === 'WORKSPACE_SELECTION' ? state.bootstrap : null;
  const autoSelect = state.status === 'WORKSPACE_SELECTION' ? state.autoSelect : null;

  async function choose(code: MobileProductCode) {
    setPending(code);
    setError(null);
    try {
      await selectWorkspace(code);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Çalışma alanı seçilemedi.');
    } finally {
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
  const firstName = bootstrap?.user.fullName?.split(' ')[0];

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <PageHeader title={firstName ? `Merhaba ${firstName}` : 'Hoş geldin'} description="Hangi çalışma alanına girmek istiyorsun?" />
      {error ? <Banner tone="critical">{error}</Banner> : null}
      {hasActive ? null : (
        <EmptyState
          title="Aktif çalışma alanın yok"
          body={products.some((product) => product.state === 'PREPARING') ? 'Öğrenci hesabı açıldığında çalışma alanın burada aktif olacak.' : 'Hesabında aktif bir ürün bulunmuyor. Sorun olduğunu düşünüyorsan ekibimizle iletişime geç.'}
        />
      )}
      <Section first>
        {products.map((product) => {
          const presentation = PRODUCT_STATE_PRESENTATION[product.state];
          return (
            <Row
              key={product.code}
              testID={`select-${product.code}`}
              title={product.label}
              subtitle={presentation.description}
              leading={<View style={[styles.dot, { backgroundColor: productTheme(product.code).accentMarker }]} />}
              trailing={<StatusBadge label={pending === product.code ? 'Açılıyor…' : presentation.label} tone={presentation.tone} />}
              disabled={product.state !== 'ACTIVE' || pending !== null}
              onPress={product.state === 'ACTIVE' ? () => void choose(product.code) : undefined}
            />
          );
        })}
      </Section>
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({ dot: { width: 10, height: 10, borderRadius: 5 } });
